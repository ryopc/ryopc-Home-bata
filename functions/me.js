import { verifyJwt } from "./_helpers.js";

export async function onRequest(context) {
  const { request, env } = context;
  const cookie = request.headers.get("Cookie") || "";
  const token = cookie.split("token=")[1]?.split(";")[0];

  if (!token) {
    return new Response(JSON.stringify({ error: "No token" }), { status: 401 });
  }

  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
  }

  return new Response(JSON.stringify(payload), { status: 200 });
}
