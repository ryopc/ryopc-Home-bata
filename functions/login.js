export async function onRequest(context) {
  const { env } = context;
  
  return Response.redirect(
    "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: "https://auth.ryopc.f5.si/callback",
        response_type: "code",
        scope: "openid email profile"
      }),
    302
  );
}
