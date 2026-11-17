// src/components/common/SubTopicMathText.jsx
"use client";

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { preprocessMathBlocks } from '@/lib/noteMarkdown';

const inlineComponents = {
  p: ({ children }) => <span style={{ display: 'inline' }}>{children}</span>,
  span: ({ children, ...props }) => <span {...props}>{children}</span>,
};

/**
 * Ensures LaTeX formulas (both $...$ and bare LaTeX symbols) are preprocessed
 * so ReactMarkdown + KaTeX will render them cleanly inline.
 */
function formatSubTopicText(rawText = '') {
  if (!rawText) return '';
  let text = String(rawText);

  // If text already has $, preprocess math blocks
  if (text.includes('$')) {
    return preprocessMathBlocks(text);
  }

  // If the text contains common unescaped LaTeX commands without $ (e.g. \Delta, \frac, \alpha, \beta, \sum, \int, \cdot),
  // wrap the formula cluster in $...$
  if (/\\[a-zA-Z]+/.test(text)) {
    // Regex matching expressions with backslash commands and math symbols
    const latexCommandPattern = /(\\[a-zA-Z]+(?:\{[^}]*\}|\s*[\w\d^_-]+)*(?:\s*[=+\-*/<>]\s*[^,\n;()]+)?)/g;
    text = text.replace(latexCommandPattern, (match) => {
      const trimmed = match.trim();
      return `$${trimmed}$`;
    });
  }

  return preprocessMathBlocks(text);
}

/**
 * SubTopicMathText renders subtopic text with full KaTeX math support.
 * Works seamlessly inline inside checklists, buttons, titles, and cards.
 */
export const SubTopicMathText = memo(function SubTopicMathText({
  text = '',
  completed = false,
  style = {},
  className = '',
}) {
  const content = formatSubTopicText(text);

  return (
    <span
      className={className}
      style={{
        display: 'inline',
        lineHeight: 1.45,
        wordBreak: 'break-word',
        textDecoration: completed ? 'line-through' : 'none',
        ...style,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={inlineComponents}
      >
        {content}
      </ReactMarkdown>
    </span>
  );
});

export default SubTopicMathText;
