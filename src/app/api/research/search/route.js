import { NextResponse } from 'next/server';
import axios from 'axios';

// The Librarian's Search Engine
export async function POST(req) {
    try {
        // 1. Accept new params: sort and limit
        const { query, offset = 0, limit = 10, sort = 'relevance' } = await req.json();

        if (!query) {
            return NextResponse.json({ error: "Query required" }, { status: 400 });
        }

        const API_KEY = process.env.NEXT_PUBLIC_SEMANTIC_SCHOLAR_API_KEY;
        const fields = 'title,abstract,authors,year,venue,citationCount,openAccessPdf,paperId,url,externalIds'; // Added 'url'
        
        // 2. Construct URL with sort and limit
        // Valid sorts: 'relevance', 'publicationDate:desc', 'citationCount:desc'
        const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&sort=${sort}&fields=${fields}`;

        const headers = {};
        if (API_KEY) headers['x-api-key'] = API_KEY;

        const response = await axios.get(url, { headers });

        return NextResponse.json({ 
            data: response.data.data || [], 
            total: response.data.total 
        });

    } catch (error) {
        console.error("Librarian Search Error:", error.response?.data || error.message);
        return NextResponse.json({ error: "Failed to fetch research papers." }, { status: 500 });
    }
}