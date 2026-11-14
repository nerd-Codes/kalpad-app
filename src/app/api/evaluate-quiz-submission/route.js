// src/app/api/evaluate-quiz-submission/route.js
import { handleRetiredAiRoute } from '@/lib/byok/retiredRoute';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return handleRetiredAiRoute(request, '/api/evaluate-quiz-submission', { allowGuestHeader: false });
}
