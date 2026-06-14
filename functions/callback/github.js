import { safeFetch, saveUser, signJwt, setCookie } from "../_helpers.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  
  if (!code) return new Response("Missing code", { status: 400 });

  // 1. トークンを取得する
  const token = await safeFetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "ryopc-auth-worker"
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: "https://auth.ryopc.f5.si/callback/github"
    })
  });

  if (!token.ok || !token.json || !token.json.access_token) {
    return new Response(`OAuth ERROR (github):\n\n${token.raw}`, { status: 500 });
  }

  // 2. ユーザー情報を取得する
  const user = await safeFetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${token.json.access_token}`,
      "User-Agent": "ryopc-auth-worker"
    }
  });

  if (!user.ok || !user.json) {
    return new Response(`USER FETCH ERROR (github):\n\n${user.raw}`, { status: 500 });
  }

  // 3. データベースへ保存する
  const u = await saveUser(
    env,
    "github",
    user.json.id,
    user.json.email || null,
    user.json.name || user.json.login,
    user.json.avatar_url
  );

  if (!u) return new Response("DB ERROR (github)", { status: 500 });

  // 4. JWTを作成してクッキーにセットする
  const userPayload = { ...u };
  delete userPayload.password_hash;
  delete userPayload.password_salt;

  const jwt = await signJwt(userPayload, env.JWT_SECRET);
  if (!jwt) return new Response("JWT ERROR (github)", { status: 500 });

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": setCookie(jwt),
      "Location": "https://ryopc.f5.si/dashboard"
    }
  });
}
