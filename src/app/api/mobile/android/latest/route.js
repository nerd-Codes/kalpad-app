// src/app/api/mobile/android/latest/route.js
export const dynamic = 'force-dynamic';

function parseIntEnv(name, fallback) {
  const raw = process.env[name];
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolEnv(name, fallback = false) {
  const raw = (process.env[name] ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'y'].includes(raw)) return true;
  if (['0', 'false', 'no', 'n'].includes(raw)) return false;
  return fallback;
}

export async function GET() {
  const latestVersionCode = parseIntEnv('ANDROID_LATEST_VERSION_CODE', 1);
  const minSupportedVersionCode = parseIntEnv('ANDROID_MIN_SUPPORTED_VERSION_CODE', latestVersionCode);
  const latestVersionName = process.env.ANDROID_LATEST_VERSION_NAME || '1.0.0';
  const mandatory = parseBoolEnv('ANDROID_UPDATE_MANDATORY', false);
  const apkUrl =
    process.env.ANDROID_LATEST_APK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://kalpad-app.vercel.app'}/downloads/kalpad-latest.apk`;

  const releaseNotesRaw = process.env.ANDROID_RELEASE_NOTES || '';
  const releaseNotes = releaseNotesRaw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const payload = {
    platform: 'android',
    latestVersionCode,
    latestVersionName,
    minSupportedVersionCode,
    mandatory,
    apkUrl,
    sha256: process.env.ANDROID_LATEST_APK_SHA256 || null,
    releasedAt: process.env.ANDROID_RELEASED_AT || new Date().toISOString(),
    releaseNotes
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  });
}

