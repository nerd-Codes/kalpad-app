// src/app/api/mobile/android/latest/route.js
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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

function buildEnvFallbackPayload() {
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

  return {
    platform: 'android',
    latestVersionCode,
    latestVersionName,
    minSupportedVersionCode,
    mandatory,
    apkUrl,
    sha256: process.env.ANDROID_LATEST_APK_SHA256 || null,
    releasedAt: process.env.ANDROID_RELEASED_AT || new Date().toISOString(),
    releaseNotes,
    source: 'env_fallback'
  };
}

function normalizeReleaseNotes(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET() {
  let payload = buildEnvFallbackPayload();

  if (supabaseAdmin) {
    const { data: row, error } = await supabaseAdmin
      .from('mobile_app_releases')
      .select('platform,latest_version_code,latest_version_name,min_supported_version_code,mandatory,apk_url,sha256,released_at,release_notes,is_active')
      .eq('platform', 'android')
      .eq('is_active', true)
      .order('released_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && row) {
      const latestVersionCode = Number.parseInt(String(row.latest_version_code ?? ''), 10);
      const latestVersionName = String(row.latest_version_name ?? '').trim();
      const minSupportedVersionCode = Number.parseInt(String(row.min_supported_version_code ?? ''), 10);
      const apkUrl = String(row.apk_url ?? '').trim();

      if (Number.isFinite(latestVersionCode) && latestVersionName && apkUrl) {
        payload = {
          platform: row.platform || 'android',
          latestVersionCode,
          latestVersionName,
          minSupportedVersionCode: Number.isFinite(minSupportedVersionCode) ? minSupportedVersionCode : latestVersionCode,
          mandatory: Boolean(row.mandatory),
          apkUrl,
          sha256: row.sha256 || null,
          releasedAt: row.released_at || new Date().toISOString(),
          releaseNotes: normalizeReleaseNotes(row.release_notes),
          source: 'supabase'
        };
      }
    }
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  });
}
