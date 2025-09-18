// src/components/PrintableNote.jsx
"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import markdownStyles from '../styles/MarkdownStyles.module.css';

// This component is never displayed. It's only used for rendering to an HTML string.
export const PrintableNote = ({ noteData }) => {
    if (!noteData) return null;

    const { 
        notes_markdown = "No content available.",
        sub_topic = {},
        day_topic = {},
    } = noteData;

    return (
        <div id="printable-content">
            {/* The header is now part of the document itself */}
            <div className="header">
                <h1>{day_topic.topic_name}</h1>
                <h2>{sub_topic.text}</h2>
            </div>
            
            {/* The main note content */}
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
            >
                {notes_markdown}
            </ReactMarkdown>
        </div>
    );
};