// src/components/QuestTimeline.jsx
"use client";

import { Timeline, Text, Box, Group, Button } from '@mantine/core';
// --- FIX: Import the necessary icons ---
import { IconCircleCheck, IconCircleDashed, IconCircle, IconVideo } from '@tabler/icons-react';
import { isToday, isPast, format } from 'date-fns';
import { TimelineDayCard } from './TimelineDayCard';
import classes from './QuestTimeline.module.css';

// --- FIX: The component now accepts the new props ---
export function QuestTimeline({ planTopics, onUpdate, onFindLectures, isCurating }) {
    const todayIndex = planTopics.findIndex(topic => isToday(new Date(topic.date)));

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
                const isPastDay = isPast(dayDate) && !isToday(dayDate);
                const isToday_ = isToday(dayDate);

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
                    else bulletColor = 'var(--mantine-color-red-5)';
                } else {
                    bulletIcon = <IconCircle size={14} />;
                    bulletColor = 'var(--mantine-color-gray-7)';
                }

                const itemClassName = index === todayIndex - 1 ? classes.pulsingLine : '';
                const bulletWrapperClassName = isToday_ ? classes.waveWrapper : classes.bullet;

                return (
                    <Timeline.Item
                        key={dayTopic.id}
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
                        {isToday_ && (
                            <Button
                                mt="md"
                                variant="light"
                                color="red"
                                size="xs"
                                leftSection={<IconVideo size={16} />}
                                onClick={onFindLectures}
                                loading={isCurating}
                            >
                                Find Lectures for Today
                            </Button>
                        )}

                        {(isToday_ || isPastDay) && (
                            <Box mt="md">
                                <TimelineDayCard 
                                    dayTopic={dayTopic} 
                                    onUpdate={onUpdate} 
                                    isInitiallyCollapsed={isPastDay}
                                />
                            </Box>
                        )}

                        {!isPastDay && !isToday_ && <Text size="xs" c="dimmed" mt="xs">This day is upcoming.</Text>}
                    </Timeline.Item>
                );
            })}
        </Timeline>
    );
}