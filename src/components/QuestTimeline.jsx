// src/components/QuestTimeline.jsx
"use client";
import { Timeline, Text, Box } from '@mantine/core';
import { IconCircleCheck, IconCircleDashed, IconCircle } from '@tabler/icons-react';
import { isToday, isPast, format } from 'date-fns';
import { TimelineDayCard } from './TimelineDayCard';
import classes from './QuestTimeline.module.css'; // <-- Import the dedicated stylesheet

export function QuestTimeline({ planTopics, onUpdate }) {
    const todayIndex = planTopics.findIndex(topic => isToday(new Date(topic.date)));

    return (
        <Timeline 
            active={todayIndex} 
            bulletSize={24} 
            lineWidth={2}
            styles={{
                // This is the definitive fix for the line color.
                // It sets a base color for ALL lines in this component.
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
                } else { // Future day
                    bulletIcon = <IconCircle size={14} />;
                    bulletColor = 'var(--mantine-color-gray-7)';
                }

                // This determines which CSS class to apply from our new stylesheet
                const itemClassName = index === todayIndex - 1 ? classes.pulsingLine : '';
                const bulletWrapperClassName = isToday_ ? classes.waveWrapper : classes.bullet;

                return (
                    <Timeline.Item
                        key={dayTopic.id}
                        title={`Day ${dayTopic.day}: ${dayTopic.topic_name}`}
                        className={itemClassName} // Applies the pulse animation to the line
                        lineVariant={index < todayIndex ? 'solid' : 'dashed'}
                        
                        bullet={
                          <div
                            className={bulletWrapperClassName} // Applies wave animation and centers the icon
                            style={{ backgroundColor: bulletColor }}
                          >
                            {bulletIcon}
                          </div>
                        }
                    >
                        <Text c="dimmed" size="sm">{format(dayDate, "EEEE, MMMM d")}</Text>
                        
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