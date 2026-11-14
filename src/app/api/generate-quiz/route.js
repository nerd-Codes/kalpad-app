// src/app/api/generate-quiz/route.js
import { handleRetiredAiRoute } from '@/lib/byok/retiredRoute';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return handleRetiredAiRoute(request, '/api/generate-quiz', { allowGuestHeader: false });
}
