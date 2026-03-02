import { NextResponse } from 'next/server';
import { inngest } from "@/lib/inngest";
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export async function POST(req) {
    let authMode = 'none';
    try {
        const { paper_id, project_id } = await req.json();

        const auth = await resolveRouteAuth(req);
        authMode = auth.authMode;
        const user = auth.user;
        if (!user) {
            logRouteResult('/api/research/analyze', authMode, 401);
            return unauthorizedResponse();
        }

        if (!paper_id || !project_id) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // 2. Trigger Inngest
        await inngest.send({
            name: "research/paper.added", // This triggers the Analyst Agent
            data: {
                paper_id,
                project_id,
                user_id: user.id
            },
        });

        logRouteResult('/api/research/analyze', authMode, 200);
        return NextResponse.json({ success: true, message: "Analysis queued" });

    } catch (error) {
        console.error("Trigger Error:", error);
        logRouteResult('/api/research/analyze', authMode, 500);
        return NextResponse.json({ error: "Failed to start analysis" }, { status: 500 });
    }
}
