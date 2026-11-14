// src/components/landing/personality/TheRealityCheck.jsx
"use client";

import Image from 'next/image';
import { Container, Title, Text, Box, Group, Stack, Avatar, SimpleGrid, Badge } from '@mantine/core';
import { IconActivityHeartbeat, IconSchool, IconCheck } from '@tabler/icons-react';

// --- SUB-COMPONENT: MHCIIE HANSRAJ INCUBATION PROOF CARD ---
export function InstitutionProofCard() {
    return (
        <Box
            p={{ base: 'md', sm: 'xl' }}
            style={{
                backgroundColor: '#19191b',
                border: '1px solid rgba(237, 237, 237, 0.08)',
                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
                borderRadius: '16px',
                width: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Group gap="xl" wrap="wrap" justify="space-between" align="center">
                <Box
                    style={{
                        position: 'relative',
                        width: 140,
                        height: 72,
                        borderRadius: '10px',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px'
                    }}
                >
                    <Image
                        src="/mchiie.avif"
                        alt="MHCIIE Hansraj College logo"
                        fill
                        sizes="140px"
                        style={{ objectFit: 'contain', padding: '6px' }}
                    />
                </Box>

                <Stack gap={6} style={{ flex: 1, minWidth: 260 }}>
                    <Group gap="xs" align="center">
                        <Box
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: '#4cc38a'
                            }}
                        />
                        <Text
                            size="xs"
                            fw={500}
                            style={{
                                color: '#4cc38a',
                                letterSpacing: '0.02em'
                            }}
                        >
                            Officially incubated
                        </Text>
                        <Text size="xs" c="#85858b">·</Text>
                        <Text size="xs" c="#a1a1a6">Hansraj College, University of Delhi</Text>
                    </Group>
                    <Title
                        order={3}
                        style={{
                            fontFamily: 'var(--font-inter)',
                            fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                            fontWeight: 500,
                            lineHeight: 1.3,
                            color: '#ededed',
                            maxWidth: '780px'
                        }}
                    >
                        KalPad is officially incubated by MHCIIE at Hansraj College, University of Delhi
                    </Title>
                    <Text size="xs" c="#a1a1a6" lh={1.6} maw={760}>
                        Mahatma Hansraj Centre for Innovation, Incubation and Entrepreneurship (MHCIIE) supports KalPad&apos;s academic study planning workflows and exam modeling.
                    </Text>
                </Stack>
            </Group>
        </Box>
    );
}

// --- SUB-COMPONENT: STUDENT STATUS BAR ---
function StudentStatusBar() {
    return (
        <Box
            p="sm"
            style={{
                backgroundColor: '#19191b',
                border: '1px solid rgba(237, 237, 237, 0.08)',
                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
                borderRadius: '8px',
                width: 'fit-content'
            }}
        >
            <Group gap="md" wrap="wrap">
                <Group gap="xs">
                    <Box
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#4cc38a'
                        }}
                    />
                    <Text size="xs" fw={500} c="#ededed">
                        Used by IITians, NITians &amp; future doctors
                    </Text>
                </Group>
                <Box style={{ width: 1, height: 14, backgroundColor: 'rgba(237, 237, 237, 0.08)' }} />
                <Group gap="xs">
                    <IconActivityHeartbeat size={14} color="#85858b" />
                    <Text size="xs" c="#85858b" style={{ fontFamily: 'var(--font-lexend), monospace' }} className="tabular-nums">
                        Active study schedules across engineering, medical &amp; board syllabi
                    </Text>
                </Group>
            </Group>
        </Box>
    );
}

// --- SUB-COMPONENT: ALIGNED STUDENT CASE REVIEW CARD ---
function StudentCaseCard({ avatar, name, handle, roleTag, topicTag, message }) {
    return (
        <Box
            p="xl"
            style={{
                backgroundColor: '#19191b',
                border: '1px solid rgba(237, 237, 237, 0.08)',
                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%'
            }}
        >
            <Box mb="md">
                <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                        <Avatar
                            radius="md"
                            size="md"
                            style={{
                                backgroundColor: '#232325',
                                border: '1px solid rgba(237, 237, 237, 0.08)',
                                color: '#ededed',
                                fontWeight: 500
                            }}
                        >
                            {avatar}
                        </Avatar>
                        <Box>
                            <Text size="sm" fw={500} c="#ededed">{name}</Text>
                            <Text size="xs" c="#85858b">{handle}</Text>
                        </Box>
                    </Group>
                    <Badge
                        variant="outline"
                        size="xs"
                        radius="sm"
                        style={{
                            borderColor: 'rgba(237, 237, 237, 0.08)',
                            color: '#a1a1a6',
                            backgroundColor: 'rgba(237, 237, 237, 0.02)'
                        }}
                    >
                        {roleTag}
                    </Badge>
                </Group>
                <Text size="sm" c="#a1a1a6" lh={1.6}>
                    {message}
                </Text>
            </Box>

            <Group gap="xs" mt="xs">
                <IconCheck size={12} color="#4cc38a" />
                <Text size="xs" c="#85858b" style={{ fontSize: '11px' }}>
                    {topicTag}
                </Text>
            </Group>
        </Box>
    );
}

export function TheRealityCheck() {
    return (
        <Box
            py={{ base: 64, md: 96 }}
            style={{
                position: 'relative',
                backgroundColor: 'transparent',
                overflow: 'hidden'
            }}
        >
            <Container size="xl">
                <Stack gap={48}>
                    {/* 1. MHCIIE HANSRAJ INCUBATION PROOF CARD */}
                    <InstitutionProofCard />

                    {/* 2. SECTION HEADER & MANIFESTO */}
                    <Stack gap="md" maw={820}>
                        <Group gap="xs">
                            <IconSchool size={16} color="#85858b" />
                            <Text size="xs" fw={500} c="#85858b">
                                Student reality
                            </Text>
                        </Group>

                        <Title
                            order={2}
                            style={{
                                fontFamily: 'var(--font-inter)',
                                fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)',
                                fontWeight: 500,
                                lineHeight: 1.2,
                                color: '#ededed',
                                letterSpacing: '-0.02em'
                            }}
                        >
                            One app for the part of studying no one teaches you
                        </Title>

                        <Text size="sm" c="#a1a1a6" lh={1.7}>
                            Classes, coaching, internships, and projects: students are juggling more than just a timetable. The hard part is not always studying—it is deciding what to study first. KalPad turns an overwhelming syllabus into realistic daily steps. You still master the material; we just make the starting point obvious.
                        </Text>

                        <Box mt="xs">
                            <StudentStatusBar />
                        </Box>
                    </Stack>

                    {/* 3. ALIGNED 3-COLUMN STUDENT CASE REVIEW GRID */}
                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing={20}>
                        <StudentCaseCard
                            avatar="A"
                            name="Aditya"
                            handle="B.Tech Engineering Student"
                            roleTag="IIT/NIT track"
                            topicTag="Engineering Mathematics & Vector Calculus"
                            message="KalPad noticed I kept missing Vector Calculus questions and moved revision earlier in the week. Saved me from guessing what to fix before finals."
                        />
                        <StudentCaseCard
                            avatar="P"
                            name="Priya"
                            handle="Computer Science Student"
                            roleTag="NIT Durgapur"
                            topicTag="Operating Systems & Concurrency"
                            message="I had one week for OS internals. It turned my messy syllabus into a day-wise plan and gave concise notes I could actually finish in 30 minutes."
                        />
                        <StudentCaseCard
                            avatar="K"
                            name="Kabir"
                            handle="Medical Aspirant"
                            roleTag="NEET candidate"
                            topicTag="Physics & Organic Chemistry"
                            message="The curated lecture suggestions saved me hours of search. I got concise 14-minute conceptual breakdowns instead of opening ten random two-hour tabs."
                        />
                    </SimpleGrid>
                </Stack>
            </Container>
        </Box>
    );
}
