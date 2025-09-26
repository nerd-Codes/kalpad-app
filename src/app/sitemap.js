// /src/app/sitemap.js

// This function generates the sitemap.xml file at build time.
export default function sitemap() {
  const baseUrl = 'https://www.kalpad.app'; // Replace with your final production domain

  // Define only the public-facing, static routes we want indexed.
  const staticRoutes = [
    '/',
    '/sign-in',
    '/sign-up',
    '/reset-password',
  ];

  const staticUrls = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly', // How often these pages are expected to change
    priority: route === '/' ? 1.0 : 0.8, // Homepage is highest priority
  }));

  return [
    ...staticUrls,
    // If we add a public /blog or /features page in the future,
    // we would add them here.
  ];
}