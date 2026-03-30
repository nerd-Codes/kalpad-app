"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { preprocessMathBlocks } from '@/lib/noteMarkdown';
import {
    buildCanonicalStream,
    createDomRangeFromOffsets,
    resolveHighlightsAgainstStream,
} from '@/lib/noteHighlights';
import highlightStyles from '@/styles/HighlightableMarkdown.module.css';

const RECT_PADDING = { x: 3, y: 2 };
const ATOMIC_RECT_PADDING = { x: 6, y: 4 };

function assignRef(ref, value) {
    if (!ref) return;
    if (typeof ref === 'function') {
        ref(value);
        return;
    }
    ref.current = value;
}

export function HighlightableMarkdown({
    markdown,
    highlights = [],
    components = {},
    className,
    style,
    contentRef,
    onHighlightsRendered,
}) {
    const internalContentRef = useRef(null);
    const [rects, setRects] = useState([]);
    const highlightSignature = JSON.stringify(highlights || []);
    const processedMarkdown = preprocessMathBlocks(markdown);

    const pushRect = (targetRects, rootRect, rect, id, color, atomic = false) => {
        if (!rect || rect.width < 1 || rect.height < 1) return;

        const padding = atomic ? ATOMIC_RECT_PADDING : RECT_PADDING;

        targetRects.push({
            id,
            color,
            atomic,
            left: rect.left - rootRect.left - padding.x,
            top: rect.top - rootRect.top - padding.y,
            width: rect.width + (padding.x * 2),
            height: rect.height + (padding.y * 2),
        });
    };

    useEffect(() => {
        assignRef(contentRef, internalContentRef.current);
    }, [contentRef]);

    useLayoutEffect(() => {
        const root = internalContentRef.current;

        if (!root) {
            setRects([]);
            onHighlightsRendered?.({ ready: true, resolvedCount: 0, unresolvedCount: highlights.length });
            return undefined;
        }

        let active = true;
        let frameId = null;
        let resizeObserver = null;

        const recompute = () => {
            const stream = buildCanonicalStream(root);
            const resolvedHighlights = resolveHighlightsAgainstStream(highlights, stream.text, stream.fingerprint);
            const nextRects = [];
            const rootRect = root.getBoundingClientRect();

            resolvedHighlights.forEach(({ highlight, start, end }) => {
                const atomicSegment = stream.segments.find((segment) => (
                    segment.type === 'atomic' &&
                    segment.start === start &&
                    segment.end === end
                ));

                if (atomicSegment) {
                    pushRect(
                        nextRects,
                        rootRect,
                        atomicSegment.element.getBoundingClientRect(),
                        highlight.id,
                        highlight.color || 'yellow',
                        true
                    );
                    return;
                }

                const range = createDomRangeFromOffsets(stream.segments, start, end);
                if (!range) return;

                Array.from(range.getClientRects()).forEach((rect, index) => {
                    pushRect(
                        nextRects,
                        rootRect,
                        rect,
                        `${highlight.id}-${index}`,
                        highlight.color || 'yellow'
                    );
                });
            });

            if (!active) return;

            setRects(nextRects);
            onHighlightsRendered?.({
                ready: true,
                resolvedCount: resolvedHighlights.length,
                unresolvedCount: Math.max(0, highlights.length - resolvedHighlights.length),
            });
        };

        const scheduleRecompute = () => {
            if (frameId) cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(recompute);
        };

        scheduleRecompute();

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                scheduleRecompute();
            });
            resizeObserver.observe(root);
        }

        window.addEventListener('resize', scheduleRecompute);

        return () => {
            active = false;
            if (frameId) cancelAnimationFrame(frameId);
            window.removeEventListener('resize', scheduleRecompute);
            resizeObserver?.disconnect();
        };
    }, [highlightSignature, highlights.length, onHighlightsRendered, processedMarkdown]);

    return (
        <div className={highlightStyles.root}>
            <div className={highlightStyles.overlay} data-highlight-ignore="true" aria-hidden="true">
                {rects.map((rect) => (
                    <span
                        key={rect.id}
                        className={highlightStyles.rect}
                        data-atomic={rect.atomic ? 'true' : undefined}
                        style={{
                            left: `${rect.left}px`,
                            top: `${rect.top}px`,
                            width: `${rect.width}px`,
                            height: `${rect.height}px`,
                        }}
                        data-color={rect.color}
                    />
                ))}
            </div>

            <div
                ref={internalContentRef}
                className={`${highlightStyles.content}${className ? ` ${className}` : ''}`}
                style={style}
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                    components={components}
                >
                    {processedMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
}
