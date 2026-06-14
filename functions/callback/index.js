import { safeFetch, saveUser, signJwt, setCookie } from "../_helpers.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  
  if (!code) return new Response("Missing code", { status: 400 });

  // 1. トークンを取得する
  const token = await safeFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: "https://auth.ryopc.f5.si/callback",
      grant_type: "authorization_code"
    })
  });

  if (!token.ok || !token.json || !token.json.access_token) {
    return new Response(`OAuth ERROR (google):\n\n${token.raw}`, { status: 500 });
  }

  // 2. ユーザー情報を取得する
  const user = await safeFetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.json.access_token}` }
  });

  if (!user.ok || !user.json) {
    return new Response(`USER FETCH ERROR (google):\n\n${user.raw}`, { status: 500 });
  }

  // 3. データベースへ保存する
  const u = await saveUser(
    env,
    "google",
    user.json.id,
    user.json.email || null,
    user.json.name,
    user.json.picture
  );

  if (!u) return new Response("DB ERROR (google)", { status: 500 });

  // 4. JWTを作成してクッキーにセットする
  const userPayload = { ...u };
  delete userPayload.password_hash;
  delete userPayload.password_salt;

  const jwt = await signJwt(userPayload, env.JWT_SECRET);
  if (!jwt) return new Response("JWT ERROR (google)", { status: 500 });

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": setCookie(jwt),
      "Location": "https://ryopc.f5.si/dashboard"
    }
  });
}
