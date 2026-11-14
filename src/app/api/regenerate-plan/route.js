// src/app/api/regenerate-plan/route.js
import { handleRetiredAiRoute } from '@/lib/byok/retiredRoute';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return handleRetiredAiRoute(request, '/api/regenerate-plan', { allowGuestHeader: false });
}
