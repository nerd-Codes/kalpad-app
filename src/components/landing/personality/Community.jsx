// src/components/landing/personality/Community.jsx
"use client";

import { Container, Title, Text, Stack, Button, Group, Grid, Box } from '@mantine/core';
import { IconBrandDiscord, IconBrandWhatsapp } from '@tabler/icons-react';
// --- MODIFICATION: IMPORT THE NEW CSS MODULE ---
import classes from './Community.module.scss';

export function Community() {
    return (
        // --- MODIFICATION: ADD `position: 'relative'` TO THE WRAPPER ---
        <Box
             style={{
                background: 'radial-gradient(ellipse at 50% 50%, rgba(25, 20, 40, 1) 0%, rgba(10, 10, 20, 1) 100%)',
                position: 'relative',
                overflow: 'hidden', // Hides stars that go outside the container
             }}
        >
            {/* --- MODIFICATION: ADD THE STARFIELD ELEMENT --- */}
            <div className={classes.starfield}>
                <div className={classes.stars}></div>
                <div className={classes.stars2}></div>
                <div className={classes.stars3}></div>
            </div>
            
            {/* --- MODIFICATION: ADD `position: 'relative', zIndex: 1` TO THE CONTAINER --- */}
            <Container size="lg" py={{ base: 120, md: 200 }} style={{ position: 'relative', zIndex: 1 }}>
                <Grid gutter={{ base: 60, md: 100 }} align="center">
                    {/* The rest of your Grid content remains completely unchanged */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Title
                            order={1}
                            ff="Lexend, sans-serif"
                            lh={1.1}
                            style={{ whiteSpace: 'pre-line' }}
                        >
                            <Text component="span" fz={{ base: '2rem', sm: '3rem' }} fw={500} c="dimmed">
                                {"Become a\n"}
                            </Text>
                            <Text component="span" fz={{ base: '4rem', sm: '6rem' }} fw={800} c="white">
                                {"Co-Founder."}
                            </Text>
                            <Text component="span" fz={{ base: '2rem', sm: '3rem' }} fw={500} c="dimmed">
                                {"\n(Sort of)."}
                            </Text>
                        </Title>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                         <Stack gap="xl">
                             <Text size="xl" c="dimmed" lh={1.7}>
                                Let's be brutally honest: this is <Text component="span" fw={700} c="white">ground zero</Text>. Things will break. But your <Text component="span" fw={700} c="white">feedback is the fuel</Text> that will forge this app into a weapon. The <Text component="span" fw={700} c="white">first 100 brave souls</Text> to join our community aren't just users—you're the founding members. Our legends. And legends get the keys to the kingdom (a.k.a. <Text component="span" fw={700} c="white">lifetime Pro access</Text>), forever. On the house.
                            </Text>
                            
                            <Group mt="md">
                                <Button
                                    component="a"
                                    href="https://discord.gg/KmTCWwsD5u"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="light"
                                    color="grape"
                                    size="lg"
                                    radius="xl"
                                    leftSection={<IconBrandDiscord size={20} />}
                                >
                                    Join the War Room
                                </Button>
                                <Button
                                    component="a"
                                    href="https://chat.whatsapp.com/EMN3fzJCBWNFwDT25qWxq2?mode=ac_t"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="light"
                                    color="teal"
                                    size="lg"
                                    radius="xl"
                                    leftSection={<IconBrandWhatsapp size={20} />}
                                >
                                    Get Inner Circle Access
                                </Button>
                            </Group>
                         </Stack>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
}