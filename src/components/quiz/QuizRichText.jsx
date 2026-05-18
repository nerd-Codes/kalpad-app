"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { preprocessMathBlocks } from '@/lib/noteMarkdown';
import styles from './QuizRichText.module.css';

function joinClasses(...classNames) {
    return classNames.filter(Boolean).join(' ');
}

const inlineComponents = {
    p: ({ children }) => <span>{children}</span>,
    ul: ({ children }) => <span>{children}</span>,
    ol: ({ children }) => <span>{children}</span>,
    li: ({ children }) => <span>{children}</span>,
};

export function QuizRichText({
    content,
    variant = 'option',
    inline = false,
    truncate = false,
    className,
    style,
}) {
    return (
        <div
            className={joinClasses(
                styles.root,
                styles[variant],
                inline && styles.inline,
                truncate && styles.truncate,
                className
            )}
            style={style}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={inline ? inlineComponents : undefined}
            >
                {preprocessMathBlocks(content || '')}
            </ReactMarkdown>
        </div>
    );
}
