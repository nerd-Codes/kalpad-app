// /src/components/QuestTimeline.jsx
"use client";

import { useEffect, useRef } from 'react'; 
import { Timeline, Text, Box, Group, Button } from '@mantine/core';
import { IconCircleCheck, IconCircleDashed, IconCircle, IconVideo, IconBellRinging, IconEyeOff } from '@tabler/icons-react';
import { isToday, isPast, format } from 'date-fns';
import { TimelineDayCard } from './TimelineDayCard';
import classes from './QuestTimeline.module.css';

export function QuestTimeline({ plan, planTopics, onUpdate, onFindLectures, isCurating, onNoteGenerated, isReadOnly = false, isInApp, onScheduleReminders, isNewUserTourActive = false }) {
    const todayIndex = isReadOnly ? -1 : planTopics.findIndex(topic => isToday(new Date(topic.date)));
    const itemRefs = useRef({});

    const visibilityHorizon = todayIndex + 2;

    useEffect(() => {
        if (todayIndex !== -1 && itemRefs.current[todayIndex]) {
            setTimeout(() => {
                itemRefs.current[todayIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 500);
        }
    }, [todayIndex]);

    const topicsToRender = isReadOnly ? planTopics : planTopics.slice(0, visibilityHorizon + 1);

    return (
        <Timeline 
            active={todayIndex} 
            bulletSize={24} 
            lineWidth={2}
            styles={{ item: { '&::before': { backgroundColor: 'rgba(255, 255, 255, 1)' } } }}
        >
            {topicsToRender.map((dayTopic, index) => {
                const dayDate = new Date(dayTopic.date);
                const isPastDay = isReadOnly || (isPast(dayDate) && !isToday(dayDate));
                const isToday_ = !isReadOnly && isToday(dayDate);
                const isFutureDay = !isPastDay && !isToday_;

                const totalSubs = dayTopic.sub_topics?.length || 0;
                const completedSubs = dayTopic.sub_topics?.filter(s => s.completed).length || 0;
                const progress = totalSubs > 0 ? (completedSubs / totalSubs) : 0;

                let bulletIcon, bulletColor;
                
                if (isToday_) {
                    bulletIcon = <IconCircleDashed size={14} />;
                    bulletColor = 'var(--mantine-color-brandPurple-5)';
                } else if (isPastDay) {
                    bulletIcon = <IconCircleCheck size={14} />;
                    if (progress === 1) bulletColor = 'var(--mantine-color-brandGreen-5)';
                    else if (progress > 0) bulletColor = 'var(--mantine-color-yellow-5)';
                    else bulletColor = 'var(--mantine-color-gray-7)';
                } else { // Future Day
                    bulletIcon = <IconCircle size={14} />;
                    bulletColor = 'var(--mantine-color-gray-7)';
                }

                const itemClassName = index === todayIndex - 1 ? classes.pulsingLine : '';
                const bulletWrapperClassName = isToday_ ? classes.waveWrapper : classes.bullet;
                
                let itemOpacity = 1.0;
                if (isFutureDay) {
                    const distance = index - todayIndex;
                    itemOpacity = 1.0 - (distance * 0.3);
                }

                return (
                    <Timeline.Item
                        ref={el => itemRefs.current[index] = el}
                        key={dayTopic.id || index}
                        title={`Day ${dayTopic.day}: ${dayTopic.topic_name}`}
                        className={itemClassName}
                        lineVariant={index < todayIndex ? 'solid' : 'dashed'}
                        bullet={
                          <div className={bulletWrapperClassName} style={{ backgroundColor: bulletColor }}>
                            {bulletIcon}
                          </div>
                        }
                        style={{ opacity: itemOpacity, transition: 'opacity 0.5s ease' }}
                    >
                        <Text c="dimmed" size="sm">{format(dayDate, "EEEE, MMMM d")}</Text>
                        
                        {/* Today's Buttons and Card (Always Expanded) */}
                        {isToday_ && (
                            <div id={isNewUserTourActive ? 'quest-timeline-today' : undefined}>
                                <Group mt="md">
                                    {isInApp && (
                                        <Button
                                            variant="light"
                                            color="teal"
                                            size="xs"
                                            leftSection={<IconBellRinging size={16} />}
                                            onClick={onScheduleReminders}
                                        >
                                            Set Today's Reminders
                                        </Button>
                                    )}
                                    <Button
                                        id={isNewUserTourActive ? 'lecture-scout-button' : undefined}
                                        variant="light"
                                        color="red"
                                        size="xs"
                                        leftSection={<IconVideo size={16} />}
                                        onClick={onFindLectures}
                                        loading={isCurating}
                                    >
                                        Find Lectures
                                    </Button>
                                </Group>
                                <Box mt="md">
                                    <TimelineDayCard 
                                        plan={plan}
                                        dayTopic={dayTopic} 
                                        onUpdate={onUpdate} 
                                        isInitiallyCollapsed={false} // Today is NEVER collapsed
                                        onNoteGenerated={onNoteGenerated}
                                        isReadOnly={isReadOnly}
                                        isNewUserTourActive={isNewUserTourActive}
                                    />
                                </Box>
                            </div>
                        )}

                        {/* Past Day's Card (Collapsed by Default) */}
                        {isPastDay && (
                            <Box mt="md">
                                <TimelineDayCard 
                                    plan={plan}
                                    dayTopic={dayTopic} 
                                    onUpdate={onUpdate}
                                    isInitiallyCollapsed={true} // Past days are ALWAYS collapsed by default
                                    onNoteGenerated={onNoteGenerated}
                                    isReadOnly={isReadOnly}
                                    isNewUserTourActive={isNewUserTourActive}
                                />
                            </Box>
                        )}

                        {/* Future days have NO card content. */}
                        {isFutureDay && (
                            <Text size="xs" c="dimmed" mt="xs">This day is upcoming.</Text>
                        )}
                    </Timeline.Item>
                );
            })}

            {/* The final "Focus on Today" Message */}
            {!isReadOnly && 
            // Condition 1: There are topics beyond the visible horizon.
            (planTopics.length > visibilityHorizon + 1) &&
            // Condition 2: Today is NOT the last day of the plan.
            (todayIndex < planTopics.length - 1) && (
                <Timeline.Item
                    title="Focus on Today"
                    bullet={
                        <div className={classes.bullet} style={{ backgroundColor: 'var(--mantine-color-dark-2)' }}>
                            <IconEyeOff size={14} />
                        </div>
                    }
                    styles={{ itemTitle: { color: 'var(--mantine-color-gray-6)' } }}
                >
                    <Text c="dimmed" size="sm">
                        Win the day. The future will take care of itself.
                        Complete today's tasks and any past backlogs to reveal what's next.
                    </Text>
                </Timeline.Item>
            )}
        </Timeline>
    );
}