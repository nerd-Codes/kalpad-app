import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import axios from 'axios';
import { inngest } from "@/lib/inngest";

export async function POST(req) {
    const supabase = createRouteHandlerClient({ cookies });
    const { paper_id } = await req.json();

    try {
        // 1. Get user session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 2. Fetch paper metadata
        const { data: paper, error: fetchError } = await supabase
            .from('research_papers')
            .select('source_url, pdf_path')
            .eq('id', paper_id)
            .single();

        if (fetchError) throw fetchError;

        // 3. If PDF path doesn't exist, perform the download/upload
        if (!paper.pdf_path) {
            if (!paper.source_url) throw new Error("No source URL available for download.");

            // Stealth Fetch Logic
            let targetUrl = paper.source_url.replace('/abs/', '/pdf/');
            const response = await axios.get(targetUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                timeout: 30000 // 30s timeout
            });

            // Upload to Supabase
            const filePath = `${session.user.id}/fetched_papers/${paper_id}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('study-materials')
                .upload(filePath, response.data, { contentType: 'application/pdf', upsert: true });

            if (uploadError) throw uploadError;

            // Update DB with the new path
            await supabase.from('research_papers').update({ pdf_path: filePath }).eq('id', paper_id);
        }

        // 4. Update status to 'processing'
        await supabase.from('research_papers').update({ status: 'processing' }).eq('id', paper_id);

        // 5. Send lightweight event to Inngest
        await inngest.send({
            name: "research/analysis.requested",
            data: { paper_id, user_id: session.user.id }
        });

        return NextResponse.json({ success: true, message: "Analysis queued." });

    } catch (error) {
        console.error("Prepare API Error:", error.message);
        // If download fails, update status so UI can react
        await supabase.from('research_papers')
            .update({ status: 'upload_needed', analyst_output: { error: `Download failed: ${error.message}` } })
            .eq('id', paper_id);
            
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}