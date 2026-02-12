export async function onRequest(context) {
  // This looks for the "API" binding you set in the Cloudflare dashboard
  const { searchParams } = new URL(context.request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  // Forwards the request internally to your Worker
  return context.env.API.fetch(`${context.request.url}`);
}
