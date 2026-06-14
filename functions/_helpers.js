// ===== 安全な通信 =====
export async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    try {
      return { ok: true, json: JSON.parse(text), raw: text };
    } catch {
      return { ok: false, json: null, raw: text };
    }
  } catch (e) {
    return { ok: false, json: null, raw: String(e) };
  }
}

// ===== Base64URL =====
export function base64url(input) {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ===== JWTの発行と確認 =====
export async function signJwt(payload, secretKey) {
  try {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = { ...payload, iat: now, exp: now + 60 * 60 * 24 * 7 };

    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(fullPayload));
    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secretKey),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    const sigB64 = base64url(String.fromCharCode(...new Uint8Array(signature)));

    return `${data}.${sigB64}`;
  } catch { return null; }
}

export async function verifyJwt(token, secretKey) {
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;
    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secretKey),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const ok = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!ok) return null;

    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// ===== クッキーの設定 =====
export function setCookie(jwt) {
  return `token=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 86400}`;
}
export function clearCookie() {
  return `token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// ===== データベース保存 =====
export async function saveUser(env, provider, providerId, email, name, avatar) {
  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO users (provider, provider_id, email, name, avatar) VALUES (?, ?, ?, ?, ?)`
    ).bind(provider, providerId, email, name, avatar).run();

    return await env.DB.prepare(
      `SELECT * FROM users WHERE provider=? AND provider_id=?`
    ).bind(provider, providerId).first();
  } catch { return null; }
}
