// src/components/FollowUpModal.jsx
"use client";

import { useState } from 'react';
import { IconX } from '@tabler/icons-react';

export function FollowUpModal({ opened, onClose, onSubmit, isLoading }) {
  const [question, setQuestion] = useState('');

  if (!opened) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!question.trim() || isLoading) return;
    onSubmit(question);
    setQuestion('');
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ask a question"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3150,
        backgroundColor: 'rgba(17, 19, 23, 0.54)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: '20px',
          backgroundColor: 'var(--kp-surface)',
          border: '1px solid var(--kp-border-strong)',
          color: 'var(--kp-ink)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
            }}
          >
            Ask a question
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close question dialog"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              border: '1px solid var(--kp-border)',
              backgroundColor: 'var(--kp-raised)',
              color: 'var(--kp-ink)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <IconX size={16} stroke={1.8} />
          </button>
        </div>

        <textarea
          rows={4}
          placeholder="Type your question about this note..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{
            width: '100%',
            borderRadius: '16px',
            border: '1px solid var(--kp-border)',
            backgroundColor: 'var(--kp-canvas)',
            color: 'var(--kp-ink)',
            padding: '12px 14px',
            fontFamily: 'var(--font-kp-sans)',
            fontSize: '14px',
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '42px',
              padding: '0 16px',
              borderRadius: '12px',
              border: '1px solid var(--kp-border)',
              backgroundColor: 'var(--kp-raised)',
              color: 'var(--kp-ink)',
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="kp-tactile"
            style={{
              height: '42px',
              padding: '0 18px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: !question.trim() || isLoading ? 'var(--kp-raised)' : 'var(--kp-primary)',
              color: !question.trim() || isLoading ? 'var(--kp-secondary)' : 'var(--kp-on-primary)',
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: !question.trim() || isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </form>
    </div>
  );
}
