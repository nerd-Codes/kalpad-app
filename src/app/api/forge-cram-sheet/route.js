// src/app/api/forge-cram-sheet/route.js
import { handleRetiredAiRoute } from '@/lib/byok/retiredRoute';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return handleRetiredAiRoute(request, '/api/forge-cram-sheet', { allowGuestHeader: false });
}
