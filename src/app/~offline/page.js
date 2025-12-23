import React from "react";
import { Container, Title, Text, Button } from "@mantine/core";

export default function Offline() {
  return (
    <Container style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Title order={2}>You are offline</Title>
      <Text c="dimmed" ta="center" mt="sm">
        Please check your internet connection.
      </Text>
      <Button mt="lg" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </Container>
  );
}