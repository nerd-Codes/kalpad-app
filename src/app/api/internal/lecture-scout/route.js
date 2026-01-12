import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// --- CONFIG: Invidious Instances ---
const INSTANCES = [
  "https://invidious.snopyta.org",
  "https://yewtu.be",
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://invidious.kavin.rocks",
  "https://invidious.drycat.fr"
];

function getRandomInstance() {
    return INSTANCES[Math.floor(Math.random() * INSTANCES.length)];
}

async function fetchInvidious(endpoint) {
    let attempts = 0;
    const maxAttempts = INSTANCES.length;
    let lastError = null;

    while (attempts < maxAttempts) {
        const instance = getRandomInstance();
        const url = `${instance}${endpoint}`;

        try {
            console.log(`[Invidious] Trying: ${url}`);
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                next: { revalidate: 0 }
            });

            if (res.ok) {
                const text = await res.text();
                try {
                    return JSON.parse(text);
                } catch (err) {
                    console.warn(`[Invidious] Failed JSON parse from ${instance}`);
                }
            } else {
                console.warn(`[Invidious] Status ${res.status} on ${instance}`);
            }
        } catch (e) {
            lastError = e;
            console.warn(`[Invidious] Error on ${instance}: ${e.message}`);
        }

        attempts++;
    }

    throw new Error("All Invidious instances failed." + (lastError ? ` Last: ${lastError.message}` : ""));
}

// --- ACTIONS ---

// Search videos by query
async function handleSearch(query) {
    try {
        const data = await fetchInvidious(`/api/v1/search?q=${encodeURIComponent(query)}`);

        if (!data) return [];

        // Filter only video results
        return (data || [])
            .filter(item => item.type === 'video')
            .slice(0, 10)
            .map(v => ({
                id: v.videoId,
                title: v.title,
                description: v.description,
                channel: v.author,
                duration: v.lengthSeconds,
                thumbnail: v.videoThumbnails?.[0]?.url
            }));

    } catch (e) {
        console.error("Invidious Search failed:", e.message);
        return [];
    }
}

// Fetch individual video details
async function handleDetails(videoId) {
    try {
        const details = await fetchInvidious(`/api/v1/videos/${videoId}`);

        if (!details) return null;

        // Try to fetch captions (English)
        let transcript = "";
        if (details.captions && details.captions.length > 0) {
            const track = details.captions.find(c => c.lang === "en") || details.captions[0];
            if (track && track.url) {
                try {
                    const subRes = await fetch(track.url);
                    const vttText = await subRes.text();
                    transcript = vttText
                        .replace(/WEBVTT/g, '')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .substring(0, 15000);
                } catch (err) {
                    console.warn("Subtitle fetch failed:", err.message);
                }
            }
        }

        const fullData = {
            id: videoId,
            title: details.title,
            channel: details.author,
            description: details.description,
            duration: details.lengthSeconds,
            views: details.viewCount,
            thumbnail: details.videoThumbnails?.[0]?.url,
            transcript
        };

        return fullData;

    } catch (e) {
        console.error("Invidious Details failed:", e.message);
        return null;
    }
}

export async function POST(request) {
    try {
        const { action, query, videoId } = await request.json();

        if (action === 'search') {
            const results = await handleSearch(query);
            return NextResponse.json(results);
        } 

        if (action === 'details') {
            const results = await handleDetails(videoId);
            if (!results) return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
            return NextResponse.json(results);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
