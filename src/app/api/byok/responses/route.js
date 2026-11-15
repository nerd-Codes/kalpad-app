// src/app/api/byok/responses/route.js
export const dynamic = 'force-dynamic';

/**
 * Proxy for OpenAI POST /v1/responses endpoint.
 * Relays streaming inference requests server-to-server with user ChatGPT BYOK Bearer token,
 * eliminating browser CORS restrictions (MissingAllowOriginHeader) on hosted deployments.
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: { message: 'Missing Authorization header for BYOK responses request' } }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const bodyText = await request.text();

    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: bodyText,
    });

    const responseHeaders = new Headers();
    responseHeaders.set(
      'Content-Type',
      upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8'
    );
    responseHeaders.set('Cache-Control', 'no-cache, no-transform');
    responseHeaders.set('Connection', 'keep-alive');
    responseHeaders.set('X-Accel-Buffering', 'no');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: err?.message || 'Failed to stream from OpenAI Responses upstream' } }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
