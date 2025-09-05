// src/components/FollowUpModal.jsx
"use client";

import { useState } from 'react';
import { Modal, Stack, Textarea, Group, Button } from '@mantine/core';
import { ShimmerButton } from './landing/ShimmerButton';

export function FollowUpModal({ opened, onClose, onSubmit, isLoading }) {
    const [question, setQuestion] = useState('');

    const handleSubmit = () => {
        // We pass the internal state up to the parent on submit
        onSubmit(question);
        // Clear the internal state after submission
        setQuestion('');
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Ask a Custom Question"
            centered
            size="lg"
        >
            <Stack>
                <Textarea
                    placeholder="Type your question about the note content here..."
                    value={question}
                    onChange={(event) => setQuestion(event.currentTarget.value)}
                    autosize
                    minRows={3}
                />
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>Cancel</Button>
                    <ShimmerButton
                        onClick={handleSubmit}
                        disabled={!question.trim() || isLoading}
                    >
                        {isLoading ? 'Thinking...' : 'Ask KalPad'}
                    </ShimmerButton>
                </Group>
            </Stack>
        </Modal>
    );
}