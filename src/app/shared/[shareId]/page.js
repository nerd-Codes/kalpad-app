// src/app/shared/[shareId]/page.js
import Link from 'next/link';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { format } from 'date-fns';
import { IconInfoCircle, IconTargetArrow, IconX } from '@tabler/icons-react';
import { QuestTimeline } from '@/components/QuestTimeline';

async function getPublicPlan(supabase, shareId) {
  const { data, error } = await supabase
    .from('public_plans')
    .select(
      `
      exam_name,
      exam_date,
      generation_context,
      plan_topics:public_plan_topics (*)
    `
    )
    .eq('public_id', shareId)
    .single();

  if (error) {
    console.error('Error fetching public plan:', error);
    return null;
  }

  if (data?.plan_topics) {
    data.plan_topics.sort((a, b) => a.day - b.day);
  }
  return data;
}

export default async function SharedPlanPage({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const plan = await getPublicPlan(supabase, resolvedParams?.shareId);

  let strategy = null;
  if (plan?.generation_context) {
    try {
      strategy =
        typeof plan.generation_context === 'string'
          ? JSON.parse(plan.generation_context)
          : plan.generation_context;
    } catch {
      strategy = null;
    }
  }

  return (
    <div
      className="kp-app-shell"
      style={{
        minHeight: '100vh',
        padding: '28px 18px 64px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <Link
            href={session ? '/dashboard' : '/'}
            style={{
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
              textDecoration: 'none',
            }}
          >
            KalPad
          </Link>
          <span
            style={{
              borderRadius: '999px',
              backgroundColor: 'var(--kp-raised)',
              border: '1px solid var(--kp-border)',
              padding: '5px 11px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--kp-secondary)',
            }}
          >
            Shared plan
          </span>
        </div>

        {!plan ? (
          <section
            style={{
              borderRadius: '20px',
              backgroundColor: 'var(--kp-surface)',
              border: '1px solid var(--kp-border)',
              padding: '24px',
              color: 'var(--kp-ink)',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '20px',
                fontWeight: 700,
              }}
            >
              Plan not found
            </h1>
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--kp-secondary)' }}>
              The shared study plan you are looking for does not exist or has been removed.
            </p>
          </section>
        ) : (
          <>
            {!session && (
              <section
                style={{
                  borderRadius: '20px',
                  backgroundColor: 'var(--kp-mint)',
                  border: '1px solid var(--kp-border)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--kp-ink)' }}>
                  Viewing a shared study path. Create your own personalized plan in minutes.
                </div>
                <Link
                  href="/sign-up"
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '999px',
                    backgroundColor: 'var(--kp-primary)',
                    color: 'var(--kp-on-primary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                  }}
                >
                  Get started free
                </Link>
              </section>
            )}

            <header>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
                  lineHeight: 1.16,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--kp-ink)',
                }}
              >
                {plan.exam_name}
              </h1>
              <div style={{ fontSize: '13px', color: 'var(--kp-secondary)', marginTop: '4px' }}>
                Exam date: {format(new Date(plan.exam_date), 'd MMM yyyy')}
              </div>
            </header>

            {strategy && (
              <section
                style={{
                  borderRadius: '20px',
                  backgroundColor: 'var(--kp-surface)',
                  border: '1px solid var(--kp-border)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-kp-sans)',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--kp-ink)',
                  }}
                >
                  The approach
                </h2>
                {strategy.overall_approach && (
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: 'var(--kp-secondary)' }}>
                    {strategy.overall_approach}
                  </p>
                )}

                {strategy.emphasized_topics?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--kp-success-ink)',
                      }}
                    >
                      <IconTargetArrow size={15} />
                      <span>Key focus areas</span>
                    </div>
                    {strategy.emphasized_topics.map((item, i) => (
                      <div key={i} style={{ paddingLeft: '22px', fontSize: '12px', color: 'var(--kp-ink)' }}>
                        {typeof item === 'string' ? item : item.topic}
                      </div>
                    ))}
                  </div>
                )}

                {strategy.deprioritized_topics?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--kp-accent-ink)',
                      }}
                    >
                      <IconInfoCircle size={15} />
                      <span>Deprioritized topics</span>
                    </div>
                    {strategy.deprioritized_topics.map((item, i) => (
                      <div key={i} style={{ paddingLeft: '22px', fontSize: '12px', color: 'var(--kp-secondary)' }}>
                        {typeof item === 'string' ? item : item.topic}
                      </div>
                    ))}
                  </div>
                )}

                {strategy.skipped_topics?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--kp-warning-ink)',
                      }}
                    >
                      <IconX size={15} />
                      <span>Strategically skipped</span>
                    </div>
                    {strategy.skipped_topics.map((item, i) => (
                      <div key={i} style={{ paddingLeft: '22px', fontSize: '12px', color: 'var(--kp-secondary)' }}>
                        {typeof item === 'string' ? item : item.topic}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <QuestTimeline plan={plan} planTopics={plan.plan_topics || []} isReadOnly={true} />
          </>
        )}
      </div>
    </div>
  );
}
