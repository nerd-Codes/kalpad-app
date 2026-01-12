"use client";

import { Modal, Stack, Title, Text, Group, Button, ThemeIcon, Badge, Box } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconMail } from '@tabler/icons-react';
import { GlassCard } from '@/components/GlassCard';

const glassModalStyles = {
    content: { 
        backgroundColor: '#1C1C1E', 
        border: '1px solid rgba(255, 59, 48, 0.3)', 
        borderRadius: '24px',
        boxShadow: '0 40px 80px -12px rgba(0, 0, 0, 0.8)'
    },
    header: { backgroundColor: 'transparent' },
    body: { padding: '24px' }
};

export function TransactionStatusModal({ transaction, onClose }) {
    if (!transaction) return null;

    const handleDismiss = async () => {
        // Optimistically close
        onClose(); 
        // Tell server to stop nagging
        await fetch('/api/payment/dismiss-notification', {
            method: 'POST',
            body: JSON.stringify({ txnid: transaction.txnid })
        });
    };

    const handleSupport = () => {
        window.open(`mailto:srijalgupta123@gmail.com?subject=Payment Issue: ${transaction.txnid}&body=My payment of ₹${transaction.amount} failed but money was deducted.`);
        handleDismiss();
    };

    return (
        <Modal 
            opened={true} 
            onClose={handleDismiss} 
            title={<Text fw={700} c="white">Transaction Update</Text>}
            centered 
            styles={glassModalStyles}
            withCloseButton={false}
        >
            <Stack gap="lg">
                <GlassCard p="md" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: 'none' }}>
                    <Group>
                        <ThemeIcon color="red" variant="light" size="lg" radius="xl"><IconAlertTriangle size={20}/></ThemeIcon>
                        <Box>
                            <Text size="sm" fw={700} c="red.3">Payment Incomplete</Text>
                            <Text size="xs" c="dimmed">Your attempt to upgrade was not successful.</Text>
                        </Box>
                    </Group>
                </GlassCard>

                <Stack gap="xs">
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Transaction ID</Text>
                        <Text size="xs" ff="monospace" c="white">{transaction.txnid}</Text>
                    </Group>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Status</Text>
                        <Badge color="red" variant="dot">{transaction.status.toUpperCase()}</Badge>
                    </Group>
                     {transaction.error_message && (
                        <Box>
                             <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>Gateway Message</Text>
                             <Text size="sm" c="red.2">{transaction.error_message}</Text>
                        </Box>
                    )}
                </Stack>

                <Group grow>
                    <Button variant="default" onClick={handleDismiss} radius="xl">Dismiss</Button>
                    <Button variant="light" color="blue" leftSection={<IconMail size={16}/>} onClick={handleSupport} radius="xl">
                        I Paid (Help)
                    </Button>

                    
                </Group>
                <Text size="xs" c="dimmed" ta="center" mt={4}>
                    Or email directly: <span style={{ color: 'white', fontFamily: 'monospace', userSelect: 'text' }}>srijalgupta123@gmail.com</span>
                </Text>
            </Stack>
        </Modal>
    );
}