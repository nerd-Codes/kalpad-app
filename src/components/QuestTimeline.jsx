// src/components/QuestTimeline.jsx
"use client";

import { useEffect, useRef } from 'react'; 
import { Timeline, Text, Box, Group, Button } from '@mantine/core';
// --- FIX: Import the necessary icons ---
import { IconCircleCheck, IconCircleDashed, IconCircle, IconVideo, IconBellRinging } from '@tabler/icons-react';
import { isToday, isPast, format } from 'date-fns';
import { TimelineDayCard } from './TimelineDayCard';
import classes from './QuestTimeline.module.css';

// --- FIX: The component now accepts the new props ---
export function QuestTimeline({ plan, planTopics, onUpdate, onFindLectures, isCurating, onNoteGenerated, isReadOnly = false, isInApp, onScheduleReminders, isNewUserTourActive = false }) {
    // For read-only view, we treat today as just another day.
    const todayIndex = isReadOnly ? -1 : planTopics.findIndex(topic => isToday(new Date(topic.date)));
    const itemRefs = useRef({});

    useEffect(() => {
        if (todayIndex !== -1 && itemRefs.current[todayIndex]) {
            // Use a short timeout to ensure the DOM has fully rendered and the card is expanded
            setTimeout(() => {
                itemRefs.current[todayIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center' // This centers the item nicely in the viewport
                });
            }, 500); // 500ms delay is robust
        }
    }, [todayIndex]); // Run only when todayIndex changes (i.e., on initial load)

    return (
        <Timeline 
            active={todayIndex} 
            bulletSize={24} 
            lineWidth={2}
            styles={{
                item: { '&::before': { backgroundColor: 'rgba(255, 255, 255, 1)' } },
            }}
        >
            {planTopics.map((dayTopic, index) => {
                const dayDate = new Date(dayTopic.date);
                 // For read-only view, all days are treated as "past" for styling and expansion.
                const isPastDay = isReadOnly || (isPast(dayDate) && !isToday(dayDate));
                const isToday_ = !isReadOnly && isToday(dayDate);



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
                    else bulletColor = 'var(--mantine-color-gray-7)'; // Use gray for incomplete past/public days
                } else {
                    bulletIcon = <IconCircle size={14} />;
                    bulletColor = 'var(--mantine-color-gray-7)';
                }

                const itemClassName = index === todayIndex - 1 ? classes.pulsingLine : '';
                const bulletWrapperClassName = isToday_ ? classes.waveWrapper : classes.bullet;

                return (
                    <Timeline.Item
                        ref={el => itemRefs.current[index] = el}
                        key={dayTopic.id || index} // Use index as fallback key for public plans
                        title={`Day ${dayTopic.day}: ${dayTopic.topic_name}`}
                        className={itemClassName}
                        lineVariant={index < todayIndex ? 'solid' : 'dashed'}
                        bullet={
                          <div
                            className={bulletWrapperClassName}
                            style={{ backgroundColor: bulletColor }}
                          >
                            {bulletIcon}
                          </div>
                        }
                    >
                        <Text c="dimmed" size="sm">{format(dayDate, "EEEE, MMMM d")}</Text>
                        
                        {/* --- FIX: The new "Find Lectures" button is rendered conditionally here --- */}
                         {isToday_ && !isReadOnly && (
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
                        )}

                        {(isToday_ || isPastDay) && (
                            <div id={isToday_ && isNewUserTourActive ? 'quest-timeline-today' : undefined}>
                            <Box mt="md">
                                <TimelineDayCard 
                                    plan={plan}
                                    dayTopic={dayTopic} 
                                    onUpdate={onUpdate} 
                                    onUpdateCompletion={onUpdate}
                                    isInitiallyCollapsed={isReadOnly ? false : isPastDay} // Always expanded for public
                                    onNoteGenerated={onNoteGenerated}
                                    isReadOnly={isReadOnly} // Pass the prop down
                                />
                            </Box>
                            </div>
                                
                        )}

                        {!isPastDay && !isToday_ && <Text size="xs" c="dimmed" mt="xs">This day is upcoming.</Text>}
                    </Timeline.Item>
                );
            })}
        </Timeline>
    );
}