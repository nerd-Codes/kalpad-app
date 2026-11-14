// /src/app/cram-sheet/[id]/page.js
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabaseClient';
import KalPadShell from '@/components/kalpad/KalPadShell';
import { FullscreenNoteViewer } from '@/components/FullscreenNoteViewer';

export default function CramSheetViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { id: cramSheetId } = params;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cramSheet, setCramSheet] = useState(null);

  useEffect(() => {
    const getSessionAndData = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);

      if (!currentSession) {
        setError('Authentication required to view this cram sheet.');
        setLoading(false);
        return;
      }

      if (!cramSheetId) {
        setError('Cram sheet ID not found.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('generated_cram_sheets')
          .select(
            `
            id,
            plan_id,
            markdown_content,
            plan:study_plans(exam_name)
          `
          )
          .eq('id', cramSheetId)
          .eq('user_id', currentSession.user.id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Cram sheet not found or you don't have permission.");

        setCramSheet({
          id: data.id,
          plan_id: data.plan_id,
          notes_markdown: data.markdown_content,
          sub_topic: { text: 'Your Ultimate Cram Sheet' },
          day_topic: { topic_name: `Revision for ${data.plan?.exam_name || 'your plan'}` },
          exam_name: data.plan?.exam_name || 'Study Plan',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getSessionAndData();
  }, [cramSheetId]);

  const handleCloseViewer = () => {
    if (cramSheet?.plan_id) {
      router.push(`/plan/${cramSheet.plan_id}`);
    } else {
      router.push('/plans');
    }
  };

  if (loading) {
    return (
      <KalPadShell session={session}>
        <div
          style={{
            borderRadius: '20px',
            backgroundColor: 'var(--kp-surface)',
            border: '1px solid var(--kp-border)',
            padding: '28px',
            color: 'var(--kp-secondary)',
            fontSize: '14px',
          }}
        >
          Loading your cram sheet...
        </div>
      </KalPadShell>
    );
  }

  if (error || !cramSheet) {
    return (
      <KalPadShell session={session}>
        <div
          style={{
            borderRadius: '20px',
            backgroundColor: 'var(--kp-surface)',
            border: '1px solid var(--kp-border)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '14px',
              backgroundColor: 'var(--kp-error-subtle)',
              color: 'var(--kp-error-ink)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {error || 'No cram sheet data to display.'}
          </div>
          <Link
            href="/plans"
            style={{
              alignSelf: 'flex-start',
              padding: '10px 16px',
              borderRadius: '14px',
              backgroundColor: 'var(--kp-raised)',
              border: '1px solid var(--kp-border)',
              color: 'var(--kp-ink)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Back to plans
          </Link>
        </div>
      </KalPadShell>
    );
  }

  return (
    <FullscreenNoteViewer
      noteData={cramSheet}
      onClose={handleCloseViewer}
      onUpdate={() => {}}
      isCramSheet={true}
    />
  );
}
