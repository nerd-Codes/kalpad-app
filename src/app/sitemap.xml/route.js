// src/app/sitemap.xml/route.js
export const runtime = "nodejs";

function buildSitemap() {
  const baseUrl = 'https://kalpad-app.vercel.app';
  const routes = ['/', '/sign-in', '/sign-up', '/reset-password'];

  const urls = routes.map(
    (route) => `
      <url>
        <loc>${baseUrl}${route}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>${route === '/' ? 1.0 : 0.8}</priority>
      </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.join('')}
    </urlset>`;
}

export async function GET() {
  const sitemap = buildSitemap();
  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Length": Buffer.byteLength(sitemap, "utf8").toString(),
    },
  });
}

// 👇 NEW
export async function HEAD() {
  const sitemap = buildSitemap();
  return new Response(null, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Length": Buffer.byteLength(sitemap, "utf8").toString(),
    },
  });
}
