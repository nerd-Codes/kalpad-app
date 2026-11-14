// src/app/api/bulk-generate-notes/route.js
import { handleRetiredAiRoute } from '@/lib/byok/retiredRoute';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return handleRetiredAiRoute(request, '/api/bulk-generate-notes', { allowGuestHeader: false });
}
