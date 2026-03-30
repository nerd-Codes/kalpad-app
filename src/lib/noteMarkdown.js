"use client";

// remarkMath only treats $$...$$ as DISPLAY (block) math when blank lines exist
// before and after the block. The LLM frequently omits them, so the parser
// falls back to inline mode and renders equations in a garbled, run-on line.
//
// This normaliser runs on the raw markdown string BEFORE ReactMarkdown sees it.
// It works line-by-line so it never accidentally mutates inline $...$ expressions.
export function preprocessMathBlocks(markdown) {
    if (!markdown) return markdown;

    const lines = markdown.split('\n');
    const out = [];
    let inBlock = false;

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const trimmed = line.trim();
        const isDelimiter = trimmed === '$$';

        const singleLine = (
            !isDelimiter &&
            trimmed.startsWith('$$') &&
            trimmed.endsWith('$$') &&
            trimmed.length > 4
        );

        if (singleLine) {
            if (out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
            out.push('$$');
            out.push(trimmed.slice(2, -2).trim());
            out.push('$$');
            if (i + 1 < lines.length && lines[i + 1].trim() !== '') out.push('');
            continue;
        }

        if (isDelimiter) {
            if (!inBlock && out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
            out.push(line);
            if (inBlock && i + 1 < lines.length && lines[i + 1].trim() !== '') out.push('');
            inBlock = !inBlock;
            continue;
        }

        out.push(line);
    }

    return out.join('\n');
}
