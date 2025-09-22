// /src/components/PlanModeModal.jsx

import { Modal, Grid, Card, Text, Title, Stack, Group, ThemeIcon, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTargetArrow, IconRotateClockwise, IconBolt, IconSwords, IconTools } from '@tabler/icons-react';

const modes = [
    {
        value: 'default',
        label: 'Balanced',
        description: 'Maximizes your score by strategically focusing on high-yield topics. The smartest way to study.',
        icon: IconTargetArrow,
        color: 'teal'
    },
    {
        value: 'revision',
        label: 'Revision',
        description: 'Optimized for rapid recall and covering maximum breadth. Perfect for the week before an exam.',
        icon: IconRotateClockwise,
        color: 'blue'
    },
    {
        value: 'hardcore',
        label: 'Hardcore',
        description: 'A relentless plan to cover 100% of the syllabus, no matter what. For the most demanding goals.',
        icon: IconSwords,
        color: 'red'
    },
    {
        value: 'sprint',
        label: 'Sprint',
        description: 'The fastest path to a high score under extreme time pressure. High intensity, high reward.',
        icon: IconBolt,
        color: 'yellow'
    },
    {
        value: 'skill',
        label: 'Skill Builder',
        description: 'A project-based approach for learning a new skill. Less theory, more hands-on practice.',
        icon: IconTools,
        color: 'grape'
    }
];

export function PlanModeModal({ opened, close, currentMode, onSelectMode }) {

    const handleSelect = (modeValue) => {
        onSelectMode(modeValue);
        close();
    };

    return (
        <Modal opened={opened} onClose={close} title={<Title order={3}>Choose Your Planning Strategy</Title>} size="xl" centered>
            <Text c="dimmed" mb="xl">Select the AI mental model that best fits your current goal.</Text>
            <Grid>
                {modes.map((mode) => (
                    <Grid.Col span={{ base: 12, sm: 6 }} key={mode.value}>
                        <UnstyledButton
                            onClick={() => handleSelect(mode.value)}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <Card
                                shadow="sm"
                                padding="lg"
                                radius="md"
                                withBorder
                                style={(theme) => ({
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    border: currentMode === mode.value ? `2px solid ${theme.colors[mode.color][6]}` : '',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: theme.shadows.md,
                                    },
                                    height: '100%' 
                                })}
                            >
                                <Stack>
                                    <Group>
                                        <ThemeIcon color={mode.color} size="lg" variant="light">
                                            <mode.icon size={24} />
                                        </ThemeIcon>
                                        <Title order={4}>{mode.label}</Title>
                                    </Group>
                                    <Text size="sm" c="dimmed">{mode.description}</Text>
                                </Stack>
                            </Card>
                        </UnstyledButton>
                    </Grid.Col>
                ))}
            </Grid>
        </Modal>
    );
}