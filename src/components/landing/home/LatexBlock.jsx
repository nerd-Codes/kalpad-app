// src/components/landing/home/LatexBlock.jsx
"use client";

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export function LatexBlock({
  math = '',
  displayMode = true,
  className = '',
  style = {},
}) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (_) {
      return math;
    }
  }, [math, displayMode]);

  return (
    <div
      className={className}
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
