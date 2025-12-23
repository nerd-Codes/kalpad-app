// src/app/offline/page.js
import React from "react";
import { Container, Title, Text, Button } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";

export default function OfflinePage() {
  return (
    <Container style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <IconWifiOff size={48} color="gray" />
      <Title order={2} mt="md">You are offline</Title>
      <Text c="dimmed" ta="center" mt="sm">
        KalPad is currently running in offline mode. 
        You can still access pages you have visited previously.
      </Text>
      <Button mt="lg" variant="outline" onClick={() => window.location.reload()}>
        Try to Reconnect
      </Button>
    </Container>
  );
}