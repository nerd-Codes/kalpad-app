// src/lib/byok/retiredRoute.js
const RETIRED_MESSAGE =
  'AI inference has migrated to client-side ChatGPT BYOK. Connect ChatGPT in Profile → Model routing.';

/**
 * Shared handler for retired server-side AI generation routes.
 * Returns HTTP 410 Gone with byok_required metadata.
 * Does not initialize any Gemini/Vertex SDKs or accept user OpenAI keys on server.
 */
export async function handleRetiredAiRoute(request, routePath, { allowGuestHeader = false } = {}) {
  return new Response(
    JSON.stringify({
      error: RETIRED_MESSAGE,
      byok_required: true,
      settings_path: '/settings/models',
      route: routePath,
      isGuest: allowGuestHeader && request?.headers?.get('x-is-guest') === 'true',
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
