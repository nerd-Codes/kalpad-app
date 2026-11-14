// src/app/api/solve-doubt/route.js
import { handleRetiredAiRoute } from '@/lib/byok/retiredRoute';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return handleRetiredAiRoute(request, '/api/solve-doubt', { allowGuestHeader: false });
}
