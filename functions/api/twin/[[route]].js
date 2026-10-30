/** Permanent compatibility response. Do not import or initialize any AI provider. */
export function onRequest() {
  return new Response(JSON.stringify({
    ok: false, enabled: false, available: false,
    error: { code: 'TWIN_REMOVED', message: 'The digital twin and its AI access have been removed.' }
  }), {
    status: 410,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    }
  });
}
