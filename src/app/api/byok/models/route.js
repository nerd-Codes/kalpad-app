// src/app/api/byok/models/route.js
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Proxy for OpenAI GET /v1/models endpoint.
 * Forwards user ChatGPT BYOK Bearer token server-to-server to eliminate
 * browser CORS restrictions (MissingAllowOriginHeader) on hosted deployments.
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: { message: 'Missing Authorization header for BYOK models request' } },
      { status: 401 }
    );
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await upstream.json().catch(() => null);

    return NextResponse.json(data || { models: [] }, {
      status: upstream.status,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err?.message || 'Failed to fetch models from OpenAI upstream' } },
      { status: 502 }
    );
  }
}
