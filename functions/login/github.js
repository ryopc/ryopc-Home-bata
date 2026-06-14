export async function onRequest(context) {
  const { env } = context;
  
  return Response.redirect(
    "https://github.com/login/oauth/authorize?" +
      new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: "https://auth.ryopc.f5.si/callback/github",
        scope: "read:user user:email"
      }),
    302
  );
}
