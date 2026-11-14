// src/components/QuestTimeline.jsx
"use client";

import { useEffect, useRef } from 'react';
import {
  IconBellRinging,
  IconCheck,
  IconCircleDashed,
  IconClock,
  IconEyeOff,
  IconVideo,
} from '@tabler/icons-react';
import { format, isPast, isToday } from 'date-fns';
import { TimelineDayCard } from './TimelineDayCard';

export function QuestTimeline({
  plan,
  planTopics,
  onUpdate,
  onFindLectures,
  isCurating,
  onNoteGenerated,
  isReadOnly = false,
  isInApp,
  onScheduleReminders,
  isNewUserTourActive = false,
  onConfirmBulkGenerate,
}) {
  const isPlanFinished =
    isPast(new Date(plan.exam_date)) && !isToday(new Date(plan.exam_date));

  const todayIndex =
    isReadOnly || isPlanFinished
      ? -1
      : planTopics.findIndex((topic) => isToday(new Date(topic.date)));

  const itemRefs = useRef({});

  const topicsToRender =
    isReadOnly || isPlanFinished ? planTopics : planTopics.slice(0, todayIndex + 3);

  useEffect(() => {
    if (todayIndex !== -1 && itemRefs.current[todayIndex]) {
      const timer = setTimeout(() => {
        itemRefs.current[todayIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [todayIndex]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        paddingLeft: '8px',
      }}
    >
      {topicsToRender.map((dayTopic, index) => {
        const dayDate = new Date(dayTopic.date);
        const isPastDay = isReadOnly || (isPast(dayDate) && !isToday(dayDate));
        const isTodayItem = !isReadOnly && isToday(dayDate);
        const isFutureDay = !isPastDay && !isTodayItem;

        const totalSubs = dayTopic.sub_topics?.length || 0;
        const completedSubs = dayTopic.sub_topics?.filter((s) => s.completed).length || 0;
        const progress = totalSubs > 0 ? completedSubs / totalSubs : 0;

        let badgeBg = 'var(--kp-raised)';
        let badgeFg = 'var(--kp-secondary)';
        let BadgeIcon = IconClock;

        if (isTodayItem) {
          badgeBg = 'var(--kp-apricot)';
          badgeFg = 'var(--kp-accent-ink)';
          BadgeIcon = IconCircleDashed;
        } else if (isPastDay && progress === 1) {
          badgeBg = 'var(--kp-mint)';
          badgeFg = 'var(--kp-success-ink)';
          BadgeIcon = IconCheck;
        } else if (isPastDay && progress > 0) {
          badgeBg = 'var(--kp-butter)';
          badgeFg = 'var(--kp-warning-ink)';
          BadgeIcon = IconCheck;
        }

        const itemOpacity = isFutureDay
          ? Math.max(0.45, 1 - (index - todayIndex) * 0.25)
          : 1;

        return (
          <div
            key={dayTopic.id || index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            style={{
              display: 'flex',
              gap: '14px',
              opacity: itemOpacity,
            }}
          >
            {/* Left timeline rail node & line */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '999px',
                  backgroundColor: badgeBg,
                  border: '1px solid var(--kp-border-strong)',
                  color: badgeFg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BadgeIcon size={14} stroke={2} />
              </div>
              {index < topicsToRender.length - 1 && (
                <div
                  style={{
                    width: '2px',
                    flex: 1,
                    minHeight: '20px',
                    marginTop: '6px',
                    backgroundColor: 'var(--kp-border)',
                  }}
                />
              )}
            </div>

            {/* Right Content */}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: '6px' }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--kp-ink)',
                }}
              >
                Day {dayTopic.day}: {dayTopic.topic_name}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--kp-secondary)',
                  marginTop: '2px',
                  marginBottom: '10px',
                }}
              >
                {format(dayDate, 'EEEE, MMMM d')}
              </div>

              {isTodayItem && (
                <div id={isNewUserTourActive ? 'quest-timeline-today' : undefined}>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    {isInApp && (
                      <button
                        type="button"
                        onClick={onScheduleReminders}
                        style={{
                          height: '34px',
                          padding: '0 12px',
                          borderRadius: '999px',
                          border: '1px solid var(--kp-border)',
                          backgroundColor: 'var(--kp-mint)',
                          color: 'var(--kp-success-ink)',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <IconBellRinging size={14} />
                        <span>Set reminders</span>
                      </button>
                    )}
                    <button
                      type="button"
                      id={isNewUserTourActive ? 'lecture-scout-button' : undefined}
                      onClick={onFindLectures}
                      disabled={isCurating}
                      style={{
                        height: '34px',
                        padding: '0 12px',
                        borderRadius: '999px',
                        border: '1px solid var(--kp-border)',
                        backgroundColor: 'var(--kp-apricot)',
                        color: 'var(--kp-accent-ink)',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isCurating ? 'wait' : 'pointer',
                      }}
                    >
                      <IconVideo size={14} />
                      <span>{isCurating ? 'Finding lectures...' : 'Find lectures'}</span>
                    </button>
                  </div>

                  <TimelineDayCard
                    plan={plan}
                    dayTopic={dayTopic}
                    onUpdate={onUpdate}
                    isInitiallyCollapsed={false}
                    onNoteGenerated={onNoteGenerated}
                    isReadOnly={isReadOnly}
                    onConfirmBulkGenerate={onConfirmBulkGenerate}
                  />
                </div>
              )}

              {isPastDay && (
                <TimelineDayCard
                  plan={plan}
                  dayTopic={dayTopic}
                  onUpdate={onUpdate}
                  isInitiallyCollapsed={true}
                  onNoteGenerated={onNoteGenerated}
                  isReadOnly={isReadOnly}
                  onConfirmBulkGenerate={onConfirmBulkGenerate}
                />
              )}

              {isFutureDay && (
                <div style={{ fontSize: '12px', color: 'var(--kp-muted)' }}>
                  Scheduled for ahead.
                </div>
              )}
            </div>
          </div>
        );
      })}

      {!isReadOnly && !isPlanFinished && planTopics.length > todayIndex + 3 && (
        <div style={{ display: 'flex', gap: '14px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '999px',
              backgroundColor: 'var(--kp-raised)',
              border: '1px solid var(--kp-border)',
              color: 'var(--kp-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconEyeOff size={14} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--kp-ink)' }}>
              Focus on today
            </div>
            <div style={{ fontSize: '12px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
              Complete today&apos;s topics to stay ahead without overwhelm.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
