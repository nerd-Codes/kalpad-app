// src/hooks/useChatGPTBYOK.js
'use client';

/**
 * React hook coordinating ChatGPT Bring-Your-Own-Account (BYOK) state and streaming chat.
 * Integrates client PKCE authentication, credential storage, model catalog auto-discovery,
 * and direct browser Responses API streaming with quota limit detection.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initiateOAuthSignIn,
  handleOAuthCallback,
  signOutChatGPT,
  getStoredSession,
  getValidAccessToken,
} from '../lib/byok/auth.js';
import {
  getCachedAvailableModels,
  streamResponsesChat,
  isUsageLimitError,
  DEFAULT_FALLBACK_MODEL_SLUG,
  DEFAULT_FALLBACK_MODEL_NAME,
} from '../lib/byok/openai.js';
import { resolveEffectiveModelForTask } from '../lib/byok/modelPreferences.js';

export function useChatGPTBYOK() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Model catalog state
  const [availableModels, setAvailableModels] = useState([
    { slug: DEFAULT_FALLBACK_MODEL_SLUG, displayName: DEFAULT_FALLBACK_MODEL_NAME },
  ]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_FALLBACK_MODEL_SLUG);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Chat inference state
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [usageLimitExceeded, setUsageLimitExceeded] = useState(false);
  const [error, setError] = useState(null);

const abortControllerRef = useRef(null);
  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Checks if a postMessage origin matches current origin or its paired loopback host on same protocol & port
  const isTrustedOAuthOrigin = useCallback((eventOrigin, currentOrigin) => {
    if (!eventOrigin || !currentOrigin) return false;
    if (eventOrigin === currentOrigin) return true;
    try {
      const evUrl = new URL(eventOrigin);
      const curUrl = new URL(currentOrigin);
      const sameSchemeAndPort =
        evUrl.protocol === curUrl.protocol && evUrl.port === curUrl.port;
      const loopbackHosts = new Set(['localhost', '127.0.0.1']);
      return (
        sameSchemeAndPort &&
        loopbackHosts.has(evUrl.hostname) &&
        loopbackHosts.has(curUrl.hostname)
      );
    } catch (_) {
      return false;
    }
  }, []);

  // Auto-discover models using access token
  const discoverModels = useCallback(async (token, forceRefresh = false) => {
    setIsLoadingModels(true);
    try {
      const models = await getCachedAvailableModels(token, forceRefresh);
      if (Array.isArray(models) && models.length > 0) {
        setAvailableModels(models);
        const preferredChatSlug = resolveEffectiveModelForTask('chatModel', models);
        setSelectedModel((current) => {
          if (preferredChatSlug && models.some((m) => m.slug === preferredChatSlug)) {
            return preferredChatSlug;
          }
          const exists = models.some((m) => m.slug === current);
          return exists ? current : models[0].slug;
        });
      }
    } catch (_) {
      // Gracefully defaults to fallback model already in state
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  const refreshModels = useCallback(async () => {
    try {
      const token = await getValidAccessToken();
      await discoverModels(token, true);
    } catch (_) {
      await discoverModels(null, true);
    }
  }, [discoverModels]);

  const hydrateSessionFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const session = getStoredSession();
      if (session && session.accessToken) {
        setIsAuthenticated(true);
        setIsAuthenticating(false);
        setAuthError(null);
        setUserEmail(session.email || null);
        discoverModels(session.accessToken);
      } else {
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    } catch (_) {
      setIsAuthenticated(false);
      setUserEmail(null);
    }
  }, [discoverModels]);

  // Hydrate stored session on mount & listen for cross-tab/modal storage + BroadcastChannel updates
  useEffect(() => {
    hydrateSessionFromStorage();
    if (typeof window === 'undefined') return;

    const handleSessionSync = () => {
      hydrateSessionFromStorage();
    };
    const handleStorageEvent = (e) => {
      if (!e.key || e.key === 'kalpad_byok_chatgpt_session') {
        hydrateSessionFromStorage();
      }
    };

    window.addEventListener('kalpad-byok-session-changed', handleSessionSync);
    window.addEventListener('storage', handleStorageEvent);

    let channel = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('kalpad_byok_sync');
        channel.onmessage = (ev) => {
          if (ev?.data?.type === 'BYOK_SESSION_UPDATED') {
            hydrateSessionFromStorage();
          }
        };
      }
    } catch (_) {}

    return () => {
      window.removeEventListener('kalpad-byok-session-changed', handleSessionSync);
      window.removeEventListener('storage', handleStorageEvent);
      try {
        channel?.close();
      } catch (_) {}
    };
  }, [hydrateSessionFromStorage]);

  // Listen for OAuth postMessage callback from popup (when opener is retained)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = async (event) => {
      if (!isTrustedOAuthOrigin(event.origin, window.location.origin)) return;
      if (!event.data || event.data.type !== 'BYOK_OAUTH_CALLBACK') return;

      const { code, state, clientId, error: oauthErr, errorDescription } = event.data;

      if (oauthErr) {
        setAuthError(errorDescription || oauthErr);
        setIsAuthenticating(false);
        return;
      }

      if (code) {
        // If callback tab already exchanged code & saved session, simply hydrate
        const alreadySaved = getStoredSession();
        if (alreadySaved?.accessToken && state === null) {
          hydrateSessionFromStorage();
          return;
        }
        setIsAuthenticating(true);
        setAuthError(null);
        try {
          const session = await handleOAuthCallback({ code, state, clientId });
          setIsAuthenticated(true);
          setUserEmail(session.email || null);
          setAuthError(null);
          await discoverModels(session.accessToken);
        } catch (err) {
          setAuthError(err?.message || 'Failed to exchange authorization code');
        } finally {
          setIsAuthenticating(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [discoverModels, hydrateSessionFromStorage, isTrustedOAuthOrigin]);

  // Connect ChatGPT account: opens popup and initiates OAuth authorization flow
  const connectChatGPT = useCallback(async () => {
    if (typeof window === 'undefined') return;

    setIsAuthenticating(true);
    setAuthError(null);

    const popupWidth = 600;
    const popupHeight = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - popupWidth) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - popupHeight) / 2);

    let popup = null;
    try {
      popup = window.open(
        'about:blank',
        'byok_oauth_popup',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );
    } catch (_) {
      // Popup blocked
    }

    try {
      const signInResult = await initiateOAuthSignIn();
      const authUrl = typeof signInResult === 'string' ? signInResult : signInResult?.authUrl;
      if (!authUrl || typeof authUrl !== 'string') {
        throw new Error('Could not generate valid OpenAI authorization URL.');
      }

      if (popup && !popup.closed) {
        popup.location.href = authUrl;
        popup.focus();
      } else {
        // Direct navigation fallback if popup was blocked
        window.location.href = authUrl;
      }
    } catch (err) {
      if (popup && !popup.closed) {
        popup.close();
      }
      setAuthError(err?.message || 'Failed to initiate ChatGPT OAuth sign-in');
      setIsAuthenticating(false);
    }
  }, []);

  const cancelAuthentication = useCallback(() => {
    setIsAuthenticating(false);
    setAuthError(null);
  }, []);

  // Submit manual authorization code or callback URL (e.g. if popups blocked)
  const submitManualCode = useCallback(
    async (codeOrUrl) => {
      if (!codeOrUrl || typeof codeOrUrl !== 'string') return;
      const trimmed = codeOrUrl.trim();
      if (!trimmed) return;

      setIsAuthenticating(true);
      setAuthError(null);

      try {
        let code = trimmed;
        let state = null;
        let clientId = null;

        // Parse query params if user pasted full redirect URL
        if (trimmed.includes('?')) {
          try {
            const urlObj = new URL(trimmed);
            code = urlObj.searchParams.get('code') || code;
            state = urlObj.searchParams.get('state') || null;
            clientId = urlObj.searchParams.get('client_id') || null;
          } catch (_) {}
        }

        const session = await handleOAuthCallback({ code, state, clientId });
        setIsAuthenticated(true);
        setUserEmail(session.email || null);
        setAuthError(null);
        await discoverModels(session.accessToken);
      } catch (err) {
        setAuthError(err?.message || 'Manual code verification failed');
      } finally {
        setIsAuthenticating(false);
      }
    },
    [discoverModels]
  );

  // Disconnect ChatGPT account and purge credentials
  const disconnectChatGPT = useCallback(async () => {
    try {
      await signOutChatGPT();
    } finally {
      setIsAuthenticated(false);
      setUserEmail(null);
      setAuthError(null);
      setAvailableModels([
        { slug: DEFAULT_FALLBACK_MODEL_SLUG, displayName: DEFAULT_FALLBACK_MODEL_NAME },
      ]);
      setSelectedModel(DEFAULT_FALLBACK_MODEL_SLUG);
      setMessages([]);
      setStreamingContent('');
      setUsageLimitExceeded(false);
      setError(null);
    }
  }, []);

  // Clear current conversation message history
  const clearHistory = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setStreamingContent('');
    setIsGenerating(false);
    setUsageLimitExceeded(false);
    setError(null);
  }, []);

  // Send interactive chat message turn
  const sendMessage = useCallback(
    async (text) => {
      if (!text || typeof text !== 'string' || !text.trim()) return;
      if (isGenerating) return;

      const trimmedText = text.trim();
      setError(null);

      const userMsg = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: trimmedText,
        timestamp: Date.now(),
      };

      // Append user turn to local messages
      setMessages((prev) => [...prev, userMsg]);
      setIsGenerating(true);
      setStreamingContent('');

      // Build conversation context: previous turns + new user turn
      // Normalize 'assistant' turns to 'developer' to satisfy Responses API constraints
      const inputTurns = [...messagesRef.current, userMsg].map((m) => ({
        role: m.role === 'assistant' ? 'developer' : m.role,
        content: m.content,
      }));

      abortControllerRef.current = new AbortController();
      let accumulatedText = '';

      try {
        let token;
        try {
          token = await getValidAccessToken();
        } catch (authErr) {
          setIsAuthenticated(false);
          setUserEmail(null);
          setIsGenerating(false);
          setError('Session expired. Please reconnect your ChatGPT account.');
          return;
        }

        await streamResponsesChat({
          accessToken: token,
          model: selectedModel || DEFAULT_FALLBACK_MODEL_SLUG,
          input: inputTurns,
          signal: abortControllerRef.current.signal,
          onDelta: (delta) => {
            accumulatedText += delta;
            setStreamingContent((prev) => prev + delta);
          },
          onCompleted: (_resp) => {
            const finalText = accumulatedText;
            setMessages((prev) => [
              ...prev,
              {
                id: `msg_${Date.now()}_assistant`,
                role: 'assistant',
                content: finalText,
                timestamp: Date.now(),
              },
            ]);
            setStreamingContent('');
            setIsGenerating(false);
            abortControllerRef.current = null;
          },
          onError: (err) => {
            setIsGenerating(false);
            abortControllerRef.current = null;
            if (isUsageLimitError(err) || err?.isUsageLimit) {
              setUsageLimitExceeded(true);
              setError('ChatGPT Plus 5-hour usage limit reached.');
            } else {
              setError(err?.message || 'Inference turn failed.');
            }
          },
        });
      } catch (err) {
        setIsGenerating(false);
        abortControllerRef.current = null;
        if (isUsageLimitError(err) || err?.isUsageLimit) {
          setUsageLimitExceeded(true);
          setError('ChatGPT Plus 5-hour usage limit reached.');
        } else {
          setError(err?.message || 'Failed to complete message.');
        }
      }
    },
    [isGenerating, selectedModel]
  );

  return {
    // Auth state
    isAuthenticated,
    isAuthenticating,
    userEmail,
    authError,
    connectChatGPT,
    cancelAuthentication,
    disconnectChatGPT,
    submitManualCode,

    // Model catalog
    availableModels,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    refreshModels,

    // Chat inference
    messages,
    isGenerating,
    streamingContent,
    usageLimitExceeded,
    error,
    sendMessage,
    clearHistory,
  };
}
