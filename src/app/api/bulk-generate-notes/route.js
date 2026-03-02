// /src/app/api/bulk-generate-notes/route.js

import { isBearerRequest, logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

// This function constructs the absolute URL for our API calls,
// which is necessary when a serverless function calls itself.
function getAbsoluteUrl(path) {
    const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    return `${host}${path}`;
}

export async function POST(request) {
    let authMode = 'none';
    const auth = await resolveRouteAuth(request);
    authMode = auth.authMode;
    const user = auth.user;

    if (!user) {
        logRouteResult('/api/bulk-generate-notes', authMode, 401);
        return unauthorizedResponse();
    }

    const { topics } = await request.json();
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid request body.' }), { status: 400 });
    }

    // --- DEFINITIVE ARCHITECTURE: Server-side loop calling our own API ---
    (async () => {
        console.log(`[Bulk Gen] Starting job for ${topics.length} topics for user ${user.id}`);
        
        for (const topic of topics) {
            try {
                // Construct the absolute URL to our existing, powerful generate-notes API
                const apiUrl = getAbsoluteUrl('/api/generate-notes');
                
                // Make a fetch request to our own API.
                // We securely forward the user's authentication cookie.
                const internalHeaders = {
                    'Content-Type': 'application/json'
                };
                if (isBearerRequest(request)) {
                    internalHeaders.Authorization = request.headers.get('Authorization');
                } else {
                    const cookieHeader = request.headers.get('cookie');
                    if (cookieHeader) {
                        internalHeaders.Cookie = cookieHeader;
                    }
                }

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: internalHeaders,
                    body: JSON.stringify(topic),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    // Log the specific failure but do not stop the loop.
                    console.error(`[Bulk Gen] Failed to generate note for "${topic.sub_topic_text}": ${errorData.error || response.statusText}`);
                } else {
                    console.log(`[Bulk Gen] Successfully generated note for: "${topic.sub_topic_text}"`);
                }
                
                // Wait for a few seconds to avoid overwhelming the system.
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                console.error(`[Bulk Gen] CRITICAL ERROR during fetch for "${topic.sub_topic_text}":`, error.message);
            }
        }
        console.log(`[Bulk Gen] Finished job for user ${user.id}`);
    })();

    // Immediately confirm to the client that the job has been accepted.
    logRouteResult('/api/bulk-generate-notes', authMode, 202);
    return new Response(JSON.stringify({ message: 'Bulk note generation request accepted.' }), {
        status: 202,
    });
}
