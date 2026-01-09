// src/app/api/internal/lecture-scout/route.js

import { Innertube, UniversalCache } from 'youtubei.js';
import { NextResponse } from 'next/server';

// Standard Node-fetch is polyfilled in Next.js, but explicit import ensures compatibility if needed
import fetch from 'node-fetch';

export const maxDuration = 60; // Allow 60 seconds for scraping (Vercel Pro)
export const dynamic = 'force-dynamic';

// --- HELPER: Parse Timestamps ---
function extractChapters(description) {
    if (!description) return [];
    const regex = /(\d{1,2}:)?(\d{1,2}):(\d{2})\s?[-–]?\s?(.+)/g;
    const chapters = [];
    let match;
    while ((match = regex.exec(description)) !== null) {
        const hours = match[1] ? match[1] : null;
        const mins = match[2];
        const secs = match[3];
        const title = match[4].trim();
        const timestamp = hours ? `${hours}${mins}:${secs}` : `${mins}:${secs}`;
        chapters.push(`${timestamp} - ${title}`);
    }
    return chapters;
}

// --- HELPER: Raw HTML Scraper (Backup) ---
async function scrapeMetadata(videoId) {
    console.log(`[Scout-Internal] Attempting HTML Fallback for ${videoId}...`);
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+417' // Sometimes helps bypass consent screens
        }
    });
    const html = await res.text();

    const jsonMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
    if (!jsonMatch) throw new Error("Could not parse YouTube HTML");

    const data = JSON.parse(jsonMatch[1]);
    const details = data.videoDetails;

    if (!details) throw new Error("No video details found in HTML");

    return {
        id: details.videoId,
        title: details.title,
        channel: details.author,
        description: details.shortDescription || "",
        view_count: details.viewCount,
        thumbnail: details.thumbnail?.thumbnails?.pop()?.url,
        duration: parseInt(details.lengthSeconds || "0")
    };
}

// --- ACTION HANDLERS ---

async function handleSearch(query) {
    console.log(`[Scout-Internal] Searching: "${query}"`);
    // WEB client is best for search
    const youtube = await Innertube.create({ 
        cache: new UniversalCache(false),
        generate_session_locally: true,
        client_type: 'WEB',
        gl: 'IN'
    });
    
    const search = await youtube.search(query, { type: 'video' });
    
    if (!search.videos) return [];

    // Filter > 10 mins
    return search.videos.filter(v => {
        if (v.type !== 'Video') return false;
        let seconds = v.duration?.seconds;
        if (!seconds && v.duration?.text) {
            const p = v.duration.text.split(':').map(Number);
            if (p.length === 2) seconds = p[0] * 60 + p[1];
            if (p.length === 3) seconds = p[0]*3600 + p[1]*60 + p[2];
        }
        return seconds && seconds > 600; 
    }).slice(0, 5).map(v => ({
        id: v.id,
        title: v.title.text || v.title,
        channel: v.author?.name || "Unknown",
        duration: v.duration?.text || "Unknown"
    }));
}

async function handleDetails(videoId) {
    console.log(`[Scout-Internal] Details for: ${videoId}`);
    
    // 1. Try IOS Client (Cleanest API)
    try {
        const youtube = await Innertube.create({ 
            cache: new UniversalCache(false),
            generate_session_locally: true,
            client_type: 'IOS', 
            gl: 'IN'
        });

        const info = await youtube.getInfo(videoId);
        const basic = info.basic_info;

        return {
            id: basic.id,
            title: basic.title,
            channel: basic.author,
            description: basic.short_description?.substring(0, 5000) || "",
            chapters: extractChapters(basic.short_description || ""),
            view_count: basic.view_count,
            thumbnail: basic.thumbnail?.[0]?.url,
            duration: basic.duration
        };
    } catch (e) {
        console.warn(`[Scout-Internal] API failed (${e.message}). Switching to scraper...`);
    }

    // 2. Fallback to HTML Scraper
    const raw = await scrapeMetadata(videoId);
    return {
        ...raw,
        description: raw.description.substring(0, 5000),
        chapters: extractChapters(raw.description)
    };
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { action, query, videoId } = body;

        if (action === 'search') {
            const results = await handleSearch(query);
            return NextResponse.json(results);
        } 
        
        if (action === 'details') {
            const results = await handleDetails(videoId);
            return NextResponse.json(results);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("[Scout-Internal] Critical:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}