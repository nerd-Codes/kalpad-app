// src/components/chat/TemporaryChatModal.jsx
'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Paper,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  ActionIcon,
  TextInput,
  Select,
  ScrollArea,
  Loader,
  Alert,
  Collapse,
  UnstyledButton,
  Box,
} from '@mantine/core';
import {
  IconMessageChatbot,
  IconSend,
  IconExternalLink,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconAlertCircle,
  IconLogout,
  IconKey,
  IconTrash,
  IconBrandOpenai,
} from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatGPTBYOK } from '@/hooks/useChatGPTBYOK';
import markdownStyles from '@/styles/MarkdownStyles.module.css';

/**
 * TemporaryChatModal component.
 * Allows users to connect their ChatGPT Plus/Pro account via SIWC and
 * test direct Responses API streaming inference against their account quota.
 */
export default function TemporaryChatModal({ opened, onClose }) {
  const chat = useChatGPTBYOK();
  const [inputText, setInputText] = useState('');
  const [manualCodeOpen, setManualCodeOpen] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const scrollViewportRef = useRef(null);

  // Auto-scroll message history as deltas arrive or new messages are appended
  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chat.messages, chat.streamingContent, chat.isGenerating]);

  const handleSend = () => {
    if (!inputText.trim() || chat.isGenerating) return;
    const msg = inputText;
    setInputText('');
    chat.sendMessage(msg);
  };

  const handleManualCodeSubmit = async (e) => {
    e?.preventDefault();
    if (!manualCodeInput.trim() || chat.isAuthenticating) return;
    await chat.submitManualCode(manualCodeInput);
    setManualCodeInput('');
    setManualCodeOpen(false);
  };

  return (
    <Modal
      opened={Boolean(opened)}
      onClose={onClose}
      size="lg"
      centered
      radius="lg"
      padding="lg"
      id="temporary-chat-modal"
      data-testid="temporary-chat-modal"
      title={
        <Group gap="xs">
          <IconMessageChatbot size={22} color="var(--kp-primary, #6366f1)" />
          <Text fw={700} size="md" c="var(--kp-ink)">
            Temporary Chat (BYOK ChatGPT)
          </Text>
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
      <div>
        {!chat.isAuthenticated ? (
          /* ============================================================ */
          /* NOT AUTHENTICATED STATE                                      */
          /* ============================================================ */
          <Stack gap="md">
            <Paper
              p="lg"
              radius="md"
              style={{
                backgroundColor: 'var(--kp-raised, #f9fafb)',
                border: '1px solid var(--kp-border, #e5e7eb)',
              }}
            >
              <Stack gap="sm" align="center" ta="center">
                <Box
                  p="xs"
                  style={{
                    borderRadius: '50%',
                    backgroundColor: 'var(--kp-butter, #fef3c7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconBrandOpenai size={32} color="var(--kp-ink, #111827)" />
                </Box>
                <Text fw={600} size="sm" c="var(--kp-ink)">
                  OpenAI Sign in with ChatGPT
                </Text>
                <Text size="xs" c="var(--kp-secondary, #4b5563)" maw={420}>
                  Connect your ChatGPT Plus or Pro account via OpenAI Sign in with ChatGPT (SIWC) to
                  test direct token sharing and interactive inference against your plan quota.
                </Text>

                <Group gap="xs" mt="xs" justify="center">
                  <Button
                    id="byok-connect-chatgpt-button"
                    onClick={chat.connectChatGPT}
                    loading={chat.isAuthenticating}
                    disabled={chat.isAuthenticating}
                    leftSection={<IconBrandOpenai size={18} />}
                    radius="md"
                    size="sm"
                    style={{
                      backgroundColor: '#D97706',
                      color: '#111317',
                      fontWeight: 700,
                    }}
                  >
                    {chat.isAuthenticating ? 'Connecting...' : 'Connect ChatGPT'}
                  </Button>
                  {chat.isAuthenticating && (
                    <Button
                      variant="subtle"
                      color="gray"
                      size="sm"
                      radius="md"
                      onClick={chat.cancelAuthentication}
                    >
                      Cancel
                    </Button>
                  )}
                </Group>
              </Stack>
            </Paper>

            {chat.authError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                radius="md"
                title="Sign-In Error"
              >
                <Text size="xs">{chat.authError}</Text>
              </Alert>
            )}

            {/* Manual Code / Fallback Collapsible */}
            <Box>
              <UnstyledButton
                onClick={() => setManualCodeOpen((prev) => !prev)}
                style={{
                  fontSize: '12px',
                  color: 'var(--kp-muted, #6b7280)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <IconKey size={14} />
                <span>Manual authorization code or redirect URL fallback</span>
                {manualCodeOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              </UnstyledButton>

              <Collapse in={manualCodeOpen}>
                <Paper
                  p="sm"
                  mt="xs"
                  radius="md"
                  style={{
                    backgroundColor: 'var(--kp-raised, #f9fafb)',
                    border: '1px solid var(--kp-border, #e5e7eb)',
                  }}
                >
                  <form onSubmit={handleManualCodeSubmit}>
                    <Stack gap="xs">
                      <TextInput
                        id="byok-manual-code-input"
                        placeholder="Paste code=... or full loopback redirect URL"
                        size="xs"
                        value={manualCodeInput}
                        onChange={(e) => setManualCodeInput(e.target.value)}
                        disabled={chat.isAuthenticating}
                        styles={{
                          input: {
                            backgroundColor: 'var(--kp-canvas)',
                            color: 'var(--kp-ink)',
                            borderColor: 'var(--kp-border)',
                          },
                        }}
                      />
                      <Group justify="flex-end">
                        <Button
                          type="submit"
                          size="xs"
                          variant="light"
                          loading={chat.isAuthenticating}
                          disabled={chat.isAuthenticating || !manualCodeInput.trim()}
                        >
                          Submit Code
                        </Button>
                      </Group>
                    </Stack>
                  </form>
                </Paper>
              </Collapse>
            </Box>
          </Stack>
        ) : (
          /* ============================================================ */
          /* AUTHENTICATED STATE                                          */
          /* ============================================================ */
          <Stack gap="sm">
            {/* Status Header: Connected indicator, email, model select, and Disconnect */}
            <Paper
              p="xs"
              radius="md"
              style={{
                backgroundColor: 'var(--kp-raised, #f9fafb)',
                border: '1px solid var(--kp-border, #e5e7eb)',
              }}
            >
              <Group justify="space-between" wrap="wrap" gap="xs">
                <Group gap="xs">
                  <Badge
                    color="teal"
                    variant="light"
                    size="sm"
                    leftSection={<IconCheck size={12} />}
                  >
                    Connected
                  </Badge>
                  <Text size="xs" c="var(--kp-secondary, #4b5563)" fw={500}>
                    {chat.userEmail || 'ChatGPT Account'}
                  </Text>
                </Group>

                <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    title="Clear history"
                    onClick={chat.clearHistory}
                    disabled={chat.isGenerating || chat.messages.length === 0}
                    style={{ color: 'var(--kp-secondary)', backgroundColor: 'transparent' }}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                  <Button
                    id="byok-disconnect-button"
                    variant="subtle"
                    color="red"
                    size="xs"
                    leftSection={<IconLogout size={14} />}
                    onClick={chat.disconnectChatGPT}
                  >
                    Disconnect
                  </Button>
                </Group>
              </Group>

              {/* Model Selector Bar */}
              <Group mt="xs" align="center" gap="xs">
                <Text size="xs" fw={600} c="var(--kp-ink, #111827)">
                  Model:
                </Text>
                <Box style={{ flex: 1 }}>
                  <Select
                    id="byok-model-selector"
                    size="xs"
                    value={chat.selectedModel}
                    onChange={(val) => val && chat.setSelectedModel(val)}
                    data={chat.availableModels.map((m) => ({
                      value: m.slug,
                      label: m.displayName || m.slug,
                    }))}
                    allowDeselect={false}
                    disabled={chat.isGenerating}
                    styles={{
                      input: {
                        backgroundColor: 'var(--kp-canvas)',
                        color: 'var(--kp-ink)',
                        borderColor: 'var(--kp-border)',
                      },
                      dropdown: {
                        backgroundColor: 'var(--kp-surface)',
                        borderColor: 'var(--kp-border)',
                      },
                      option: {
                        color: 'var(--kp-ink)',
                      },
                    }}
                  />
                </Box>
              </Group>
            </Paper>

            {/* Quota Limit Warning Banner */}
            {chat.usageLimitExceeded && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="orange"
                radius="md"
                title="5-Hour Plan Usage Limit Reached"
              >
                <Stack gap="xs">
                  <Text size="xs">
                    You have reached your ChatGPT Plus or Pro 5-hour rolling usage limit for this
                    model. Inference will resume once your quota window resets.
                  </Text>
                  <Group justify="flex-start">
                    <Button
                      component="a"
                      href="https://chatgpt.com/settings/usage"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                      variant="light"
                      color="orange"
                      rightSection={<IconExternalLink size={13} />}
                    >
                      View ChatGPT Usage Settings
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            )}

            {/* General Error Banner */}
            {chat.error && !chat.usageLimitExceeded && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                radius="md"
                title="Inference Error"
              >
                <Text size="xs">{chat.error}</Text>
              </Alert>
            )}

            {/* Message History Scroll Area */}
            <ScrollArea.Autosize
              mah={380}
              viewportRef={scrollViewportRef}
              p="xs"
              style={{
                borderRadius: '8px',
                backgroundColor: 'var(--kp-raised, #f9fafb)',
                border: '1px solid var(--kp-border, #e5e7eb)',
              }}
            >
              <Stack gap="sm">
                {chat.messages.length === 0 && !chat.isGenerating && (
                  <Box py="xl" ta="center">
                    <Text size="xs" c="var(--kp-muted, #9ca3af)">
                      No messages yet. Send a prompt to test your ChatGPT plan quota!
                    </Text>
                  </Box>
                )}

                {chat.messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <Group
                      key={msg.id}
                      gap="xs"
                      align="flex-start"
                      wrap="nowrap"
                      style={{ flexDirection: isUser ? 'row-reverse' : 'row' }}
                    >
                      <Paper
                        p="xs"
                        radius="md"
                        style={{
                          backgroundColor: isUser
                            ? 'var(--kp-primary, #6366f1)'
                            : 'var(--kp-surface, #ffffff)',
                          color: isUser ? '#ffffff' : 'var(--kp-ink, #111827)',
                          border: isUser ? 'none' : '1px solid var(--kp-border, #e5e7eb)',
                          maxWidth: '82%',
                          wordBreak: 'break-word',
                        }}
                      >
                        <Box
                          className={markdownStyles.markdown}
                          style={{
                            fontSize: '0.875rem',
                            color: isUser ? '#ffffff' : 'inherit',
                          }}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </Box>
                      </Paper>
                    </Group>
                  );
                })}

                {/* Real-time Streaming Turn */}
                {chat.isGenerating && (
                  <Group gap="xs" align="flex-start" wrap="nowrap">
                    <Paper
                      p="xs"
                      radius="md"
                      style={{
                        backgroundColor: 'var(--kp-surface, #ffffff)',
                        color: 'var(--kp-ink, #111827)',
                        border: '1px solid var(--kp-border, #e5e7eb)',
                        maxWidth: '82%',
                        wordBreak: 'break-word',
                      }}
                    >
                      {chat.streamingContent ? (
                        <Box
                          className={markdownStyles.markdown}
                          style={{ fontSize: '0.875rem' }}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {chat.streamingContent}
                          </ReactMarkdown>
                        </Box>
                      ) : (
                        <Group gap="xs">
                          <Loader size="xs" type="dots" color="gray" />
                          <Text size="xs" c="dimmed">
                            Generating response...
                          </Text>
                        </Group>
                      )}
                    </Paper>
                  </Group>
                )}
              </Stack>
            </ScrollArea.Autosize>

            {/* Input Bar */}
            <Box pt="xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <TextInput
                  id="byok-chat-input"
                  placeholder="Ask anything using your connected ChatGPT quota..."
                  size="sm"
                  radius="md"
                  rightSectionPointerEvents="all"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={chat.isGenerating}
                  styles={{
                    input: {
                      backgroundColor: 'var(--kp-canvas)',
                      color: 'var(--kp-ink)',
                      borderColor: 'var(--kp-border)',
                    },
                  }}
                  rightSection={
                    <ActionIcon
                      id="byok-chat-send-btn"
                      type="submit"
                      size="md"
                      radius="md"
                      variant="filled"
                      disabled={chat.isGenerating || !inputText.trim()}
                      style={{
                        backgroundColor: inputText.trim() ? '#D97706' : 'var(--kp-raised)',
                        color: inputText.trim() ? '#111317' : 'var(--kp-secondary)',
                      }}
                    >
                      <IconSend size={16} />
                    </ActionIcon>
                  }
                />
              </form>
            </Box>
          </Stack>
        )}
      </div>
    </Modal>
  );
}

export { TemporaryChatModal };
