"use client";

import { HighlightableMarkdown } from '@/components/HighlightableMarkdown';

const customRenderers = {
    p: ({ node, children, ...props }) => {
        const hasMathBlock = (nodes) => {
            if (!nodes) return false;
            const arr = Array.isArray(nodes) ? nodes : [nodes];
            return arr.some((child) => {
                if (!child || typeof child !== 'object') return false;
                const cls = child.props?.className ?? '';
                if (cls.includes('katex-display')) return true;
                if (child.props?.children) return hasMathBlock(child.props.children);
                return false;
            });
        };

        const childArr = Array.isArray(children) ? children : [children];
        if (hasMathBlock(childArr)) {
            return <div style={{ margin: '0.5em 0' }}>{children}</div>;
        }

        return <p {...props}>{children}</p>;
    },
    span: ({ node, children, className, ...props }) => {
        if (className?.includes('katex-display')) {
            return (
                <div
                    className={className}
                    style={{
                        display: 'block',
                        margin: '1.4em auto',
                        textAlign: 'center',
                        overflowX: 'auto',
                        maxWidth: '100%',
                    }}
                    {...props}
                >
                    {children}
                </div>
            );
        }

        return <span className={className} {...props}>{children}</span>;
    },
    img: ({ node, ...props }) => {
        const isSvg = props.src && props.src.endsWith('.svg');
        const finalStyle = {
            maxWidth: '100%',
            maxHeight: '1000px',
            borderRadius: '0',
            backgroundColor: 'transparent',
            padding: isSvg ? '1rem' : '0',
            margin: '1.5rem auto',
            display: 'block',
        };

        return (
            <img {...props} style={finalStyle} alt={props.alt || 'Figure'} />
        );
    },
};

export function PrintableMarkdownBlock({ markdown, highlights = [], onReady }) {
    return (
        <HighlightableMarkdown
            markdown={markdown}
            highlights={Array.isArray(highlights) ? highlights : []}
            components={customRenderers}
            onHighlightsRendered={onReady}
        />
    );
}
