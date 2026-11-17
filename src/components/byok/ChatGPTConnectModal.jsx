// src/components/byok/ChatGPTConnectModal.jsx
"use client";

import { useState } from 'react';
import {
  Modal,
  Button,
  Stack,
  Group,
  Text,
  Badge,
  TextInput,
  Paper,
  Box,
  Alert,
  Divider,
} from '@mantine/core';
import {
  IconBrandOpenai,
  IconCheck,
  IconAlertCircle,
  IconShieldLock,
  IconDeviceDesktop,
  IconExternalLink,
  IconCopy,
  IconSparkles,
} from '@tabler/icons-react';
import { useChatGPTBYOK } from '@/hooks/useChatGPTBYOK';

export function ChatGPTConnectModal({ opened, onClose }) {
  const chat = useChatGPTBYOK();
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [manualError, setManualError] = useState(null);

  const handleManualSubmit = async (e) => {
    e?.preventDefault();
    if (!manualCodeInput.trim() || isManualLoading) return;

    setIsManualLoading(true);
    setManualError(null);
    try {
      await chat.submitManualCode(manualCodeInput);
      setManualCodeInput('');
      // If authentication succeeded, close the modal after brief delay
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (err) {
      setManualError(err?.message || 'Failed to verify authorization code.');
    } finally {
      setIsManualLoading(false);
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('kalpad_byok_prompt_dismissed', 'true');
    } catch (_) {}
    onClose?.();
  };

  return (
    <Modal
      opened={Boolean(opened)}
      onClose={onClose}
      size="lg"
      centered
      radius="lg"
      padding="lg"
      title={
        <Group gap="xs">
          <Box
            style={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              backgroundColor: 'rgba(217, 119, 6, 0.15)',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconBrandOpenai size={20} />
          </Box>
          <div>
            <Text fw={700} size="md" c="var(--kp-ink)">
              Connect Your ChatGPT Account
            </Text>
            <Text size="xs" c="var(--kp-secondary)">
              Direct browser token-sharing for unlimited AI generation
            </Text>
          </div>
        </Group>
      }
      styles={{
        header: {
          backgroundColor: 'var(--kp-surface)',
          borderBottom: '1px solid var(--kp-border)',
          paddingBottom: '12px',
        },
        body: {
          backgroundColor: 'var(--kp-surface)',
          paddingTop: '16px',
        },
        content: {
          backgroundColor: 'var(--kp-surface)',
          border: '1px solid var(--kp-border)',
        },
      }}
    >
      <Stack gap="md">
        {chat.isAuthenticated ? (
          /* ======================================================== */
          /* ALREADY CONNECTED SUCCESS STATE                          */
          /* ======================================================== */
          <Paper
            p="md"
            radius="md"
            style={{
              backgroundColor: 'var(--kp-mint, rgba(32, 168, 102, 0.12))',
              border: '1px solid var(--kp-success-ink, #20a866)',
            }}
          >
            <Stack gap="xs" align="center" ta="center">
              <Box
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'var(--kp-mint)',
                  color: 'var(--kp-success-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconCheck size={26} stroke={2.5} />
              </Box>
              <Text fw={700} size="sm" c="var(--kp-ink)">
                ChatGPT Connected Successfully!
              </Text>
              <Text size="xs" c="var(--kp-secondary)">
                Connected as <strong>{chat.userEmail || 'Active Session'}</strong> ({chat.availableModels.length} models ready). All plans and notes will generate directly from your browser.
              </Text>
              <Button
                size="sm"
                radius="md"
                mt="xs"
                onClick={onClose}
                style={{
                  backgroundColor: '#D97706',
                  color: '#111317',
                  fontWeight: 700,
                }}
              >
                Start Studying
              </Button>
            </Stack>
          </Paper>
        ) : (
          /* ======================================================== */
          /* NOT CONNECTED: ONBOARDING & TUTORIAL                     */
          /* ======================================================== */
          <>
            {/* Subscription & Capability Badge */}
            <Paper
              p="sm"
              radius="md"
              style={{
                backgroundColor: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
              }}
            >
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <IconSparkles size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <Text size="xs" fw={700} c="var(--kp-ink)">
                    Requires an OpenAI Paid Subscription
                  </Text>
                  <Text size="xs" c="var(--kp-secondary)" mt={2}>
                    Any paid ChatGPT tier works — <strong>ChatGPT Plus, Team, Enterprise, or Pro</strong>. Free tier accounts do not have access to OpenAI&apos;s direct token-sharing protocol.
                  </Text>
                </div>
              </Group>
            </Paper>

            {/* Privacy & Zero-Server Guarantee Card */}
            <Paper
              p="sm"
              radius="md"
              style={{
                backgroundColor: 'var(--kp-raised)',
                border: '1px solid var(--kp-border)',
              }}
            >
              <Stack gap="xs">
                <Group gap="xs">
                  <IconShieldLock size={16} color="var(--kp-primary)" />
                  <Text size="xs" fw={700} c="var(--kp-ink)">
                    Zero Server Storage & Device-Exclusive Privacy
                  </Text>
                </Group>
                <Text size="xs" c="var(--kp-secondary)" lh={1.5}>
                  🔒 <strong>KalPad never stores your credentials on any server.</strong> All authentication tokens and API requests reside 100% locally on your current device using your browser&apos;s encrypted local storage.
                </Text>
                <Text size="xs" c="var(--kp-secondary)" lh={1.5}>
                  📱 <strong>Device specific:</strong> Because no credentials touch our servers, you will need to connect your ChatGPT account on each device or browser you use KalPad on separately.
                </Text>
              </Stack>
            </Paper>

            {/* Step-by-Step Connection Instructions */}
            <Box>
              <Text size="xs" fw={700} c="var(--kp-ink)" mb="xs" style={{ letterSpacing: '0.02em' }}>
                HOW TO CONNECT (STEP-BY-STEP):
              </Text>

              <Stack gap="xs">
                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <Badge size="xs" color="gray" variant="filled">1</Badge>
                  <Text size="xs" c="var(--kp-secondary)">
                    Click the <strong>&ldquo;Connect ChatGPT&rdquo;</strong> button below to open OpenAI&apos;s official Sign-In window.
                  </Text>
                </Group>

                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <Badge size="xs" color="gray" variant="filled">2</Badge>
                  <Text size="xs" c="var(--kp-secondary)">
                    Sign in to your OpenAI account and click <strong>Authorize</strong>.
                  </Text>
                </Group>

                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <Badge size="xs" color="gray" variant="filled">3</Badge>
                  <div>
                    <Text size="xs" c="var(--kp-secondary)">
                      On desktop or deployed web, the popup will redirect to <code style={{ backgroundColor: 'var(--kp-canvas)', color: 'var(--kp-primary)', padding: '1px 5px', borderRadius: '4px' }}>http://127.0.0.1:3000/auth/callback?code=...</code> and display <strong>&ldquo;This site can’t be reached&rdquo;</strong> or <strong>&ldquo;Unable to connect&rdquo;</strong>.
                    </Text>
                    <Text size="xs" c="#D97706" fw={600} mt={3}>
                      💡 This is completely normal and expected! OpenAI&apos;s security protocol strictly mandates a local loopback redirect.
                    </Text>
                  </div>
                </Group>

                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <Badge size="xs" color="gray" variant="filled">4</Badge>
                  <Text size="xs" c="var(--kp-secondary)">
                    Simply <strong>copy the entire link/URL from the address bar</strong> of that popup window, paste it into the box below, and click <strong>&ldquo;Complete Sign-In&rdquo;</strong>.
                  </Text>
                </Group>
              </Stack>
            </Box>

            <Divider color="var(--kp-border)" />

            {/* Connection Actions */}
            <Stack gap="xs">
              <Group justify="space-between" align="center" wrap="wrap">
                <Button
                  id="modal-connect-chatgpt-button"
                  onClick={chat.connectChatGPT}
                  loading={chat.isAuthenticating && !isManualLoading}
                  leftSection={<IconBrandOpenai size={17} />}
                  radius="md"
                  size="sm"
                  style={{
                    backgroundColor: '#D97706',
                    color: '#111317',
                    fontWeight: 700,
                  }}
                >
                  {chat.isAuthenticating && !isManualLoading ? 'Popup Open (Authorize in OpenAI)...' : 'Connect ChatGPT'}
                </Button>

                {chat.isAuthenticating && !isManualLoading && (
                  <Button
                    variant="subtle"
                    color="gray"
                    size="xs"
                    onClick={chat.cancelAuthentication}
                  >
                    Cancel
                  </Button>
                )}
              </Group>

              {(chat.authError || manualError) && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  radius="md"
                  title="Connection Error"
                >
                  <Text size="xs">{manualError || chat.authError}</Text>
                </Alert>
              )}

              {/* Paste Callback URL Form */}
              <Paper
                p="sm"
                radius="md"
                mt="xs"
                style={{
                  backgroundColor: 'var(--kp-raised)',
                  border: '1px solid var(--kp-border)',
                }}
              >
                <form onSubmit={handleManualSubmit}>
                  <Stack gap="xs">
                    <Text size="xs" fw={600} c="var(--kp-ink)">
                      Paste Popup URL Here to Complete Sign-In:
                    </Text>
                    <TextInput
                      id="modal-byok-manual-code-input"
                      placeholder="Paste http://127.0.0.1:3000/auth/callback?code=... here"
                      size="xs"
                      value={manualCodeInput}
                      onChange={(e) => setManualCodeInput(e.target.value)}
                      styles={{
                        input: {
                          backgroundColor: 'var(--kp-canvas)',
                          color: 'var(--kp-ink)',
                          borderColor: 'var(--kp-border)',
                        },
                      }}
                    />
                    <Group justify="flex-end" gap="xs">
                      <Button
                        type="button"
                        variant="subtle"
                        size="xs"
                        color="gray"
                        onClick={handleDismiss}
                      >
                        I&apos;ll Connect Later
                      </Button>
                      <Button
                        type="submit"
                        size="xs"
                        radius="md"
                        loading={isManualLoading}
                        disabled={!manualCodeInput.trim() || isManualLoading}
                        style={{
                          backgroundColor: 'var(--kp-primary, #6366f1)',
                          color: 'var(--kp-on-primary, #111317)',
                          fontWeight: 700,
                        }}
                      >
                        Complete Sign-In
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Paper>
            </Stack>
          </>
        )}
      </Stack>
    </Modal>
  );
}

export default ChatGPTConnectModal;
