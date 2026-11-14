// src/app/api/research/chat/route.js
import { handleRetiredAiRoute } from '@/lib/byok/retiredRoute';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return handleRetiredAiRoute(request, '/api/research/chat', { allowGuestHeader: false });
}
