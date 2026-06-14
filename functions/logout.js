import { clearCookie } from "./_helpers.js";

export async function onRequest(context) {
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": clearCookie(),
      "Location": "https://ryopc.f5.si/"
    }
  });
}
