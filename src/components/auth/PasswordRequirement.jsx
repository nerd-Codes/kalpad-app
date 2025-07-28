// src/components/auth/PasswordRequirement.jsx
"use client";
import { Text } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';

export function PasswordRequirement({ meets, label }) {
  return (
    <Text
      c={meets ? 'teal' : 'red'}
      style={{ display: 'flex', alignItems: 'center' }}
      mt={7}
      size="sm"
    >
      {meets ? <IconCheck size={14} /> : <IconX size={14} />}
      <span style={{ marginLeft: 10 }}>{label}</span>
    </Text>
  );
}