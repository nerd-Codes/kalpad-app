const KATEX_SELECTOR = '.katex';
const KATEX_TEX_SELECTOR = 'annotation[encoding="application/x-tex"]';
const PREFIX_SUFFIX_WINDOW = 32;

function isElementNode(node) {
    return node?.nodeType === Node.ELEMENT_NODE;
}

function isTextNode(node) {
    return node?.nodeType === Node.TEXT_NODE;
}

function normalizeText(text = '') {
    return text.replace(/\u00a0/g, ' ');
}

function createId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `highlight_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function hashString(text) {
    let hash = 5381;

    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
    }

    return `h${(hash >>> 0).toString(16)}`;
}

function getKatexSource(element) {
    if (!isElementNode(element)) return '';
    const annotation = element.querySelector(KATEX_TEX_SELECTOR);
    return normalizeText(annotation?.textContent || element.textContent || '');
}

function walkHighlightNodes(node, segments, cursor) {
    if (isTextNode(node)) {
        const text = normalizeText(node.data || '');

        if (!text) return cursor;

        const start = cursor;
        const end = start + text.length;
        segments.push({ type: 'text', node, text, start, end });
        return end;
    }

    if (!isElementNode(node)) {
        return cursor;
    }

    const element = node;

    if (element.dataset.highlightIgnore === 'true') {
        return cursor;
    }

    if (element.classList.contains('katex')) {
        const text = getKatexSource(element);

        if (!text) return cursor;

        const start = cursor;
        const end = start + text.length;
        segments.push({ type: 'atomic', element, text, start, end });
        return end;
    }

    let nextCursor = cursor;
    element.childNodes.forEach((child) => {
        nextCursor = walkHighlightNodes(child, segments, nextCursor);
    });

    return nextCursor;
}

export function createNoteFingerprint(text = '') {
    return hashString(text);
}

export function buildCanonicalStream(root) {
    if (!root) {
        return { segments: [], text: '', fingerprint: createNoteFingerprint('') };
    }

    const segments = [];
    const length = walkHighlightNodes(root, segments, 0);
    const text = length > 0 ? segments.map((segment) => segment.text).join('') : '';

    return {
        segments,
        text,
        fingerprint: createNoteFingerprint(text),
    };
}

export function buildAnchorFromOffsets(streamText, start, end, noteFingerprint = createNoteFingerprint(streamText)) {
    const safeStart = Math.max(0, Math.min(start, streamText.length));
    const safeEnd = Math.max(safeStart, Math.min(end, streamText.length));
    const exact = streamText.slice(safeStart, safeEnd);

    return {
        version: 1,
        note_fingerprint: noteFingerprint,
        start: safeStart,
        end: safeEnd,
        exact,
        prefix: streamText.slice(Math.max(0, safeStart - PREFIX_SUFFIX_WINDOW), safeStart),
        suffix: streamText.slice(safeEnd, Math.min(streamText.length, safeEnd + PREFIX_SUFFIX_WINDOW)),
    };
}

function findAnchorMatches(streamText, anchor) {
    const exact = anchor?.exact || '';

    if (!exact) return [];

    const matches = [];
    let index = streamText.indexOf(exact);

    while (index !== -1) {
        matches.push(index);
        index = streamText.indexOf(exact, index + 1);
    }

    return matches;
}

export function resolveAnchorToOffsets(anchor, streamText, noteFingerprint = createNoteFingerprint(streamText)) {
    if (!anchor || typeof anchor.start !== 'number' || typeof anchor.end !== 'number') {
        return null;
    }

    const safeStart = Math.max(0, anchor.start);
    const safeEnd = Math.min(streamText.length, anchor.end);

    if (
        anchor.note_fingerprint === noteFingerprint &&
        safeEnd > safeStart &&
        streamText.slice(safeStart, safeEnd) === anchor.exact
    ) {
        return { start: safeStart, end: safeEnd };
    }

    const matches = findAnchorMatches(streamText, anchor);

    if (matches.length === 0) return null;

    const prefix = anchor.prefix || '';
    const suffix = anchor.suffix || '';

    const contextualMatch = matches.find((matchStart) => {
        const matchEnd = matchStart + anchor.exact.length;
        const actualPrefix = streamText.slice(Math.max(0, matchStart - prefix.length), matchStart);
        const actualSuffix = streamText.slice(matchEnd, matchEnd + suffix.length);
        return actualPrefix === prefix && actualSuffix === suffix;
    });

    if (typeof contextualMatch === 'number') {
        return {
            start: contextualMatch,
            end: contextualMatch + anchor.exact.length,
        };
    }

    if (matches.length === 1) {
        return {
            start: matches[0],
            end: matches[0] + anchor.exact.length,
        };
    }

    return null;
}

export function resolveHighlightsAgainstStream(highlights = [], streamText, noteFingerprint = createNoteFingerprint(streamText)) {
    return highlights
        .map((highlight) => {
            const resolved = resolveAnchorToOffsets(highlight?.anchor, streamText, noteFingerprint);
            if (!resolved || resolved.end <= resolved.start) return null;
            return { highlight, ...resolved };
        })
        .filter(Boolean)
        .sort((a, b) => a.start - b.start);
}

function createStructuredHighlight(streamText, start, end, color = 'yellow') {
    const timestamp = new Date().toISOString();
    const noteFingerprint = createNoteFingerprint(streamText);

    return {
        id: createId(),
        color,
        created_at: timestamp,
        updated_at: timestamp,
        anchor: buildAnchorFromOffsets(streamText, start, end, noteFingerprint),
    };
}

export function mergeHighlightIntoSet(existingHighlights = [], newAnchor, streamText, color = 'yellow') {
    if (!newAnchor || newAnchor.end <= newAnchor.start) {
        return existingHighlights;
    }

    const noteFingerprint = createNoteFingerprint(streamText);
    let mergedStart = newAnchor.start;
    let mergedEnd = newAnchor.end;
    const unresolved = [];
    const kept = [];

    existingHighlights.forEach((highlight) => {
        const resolved = resolveAnchorToOffsets(highlight?.anchor, streamText, noteFingerprint);

        if (!resolved) {
            unresolved.push(highlight);
            return;
        }

        const overlaps = resolved.start <= mergedEnd && resolved.end >= mergedStart;

        if (overlaps) {
            mergedStart = Math.min(mergedStart, resolved.start);
            mergedEnd = Math.max(mergedEnd, resolved.end);
            return;
        }

        kept.push({ highlight, start: resolved.start });
    });

    const mergedHighlight = createStructuredHighlight(streamText, mergedStart, mergedEnd, color);

    return [
        ...kept,
        { highlight: mergedHighlight, start: mergedStart },
    ]
        .sort((a, b) => a.start - b.start)
        .map((entry) => entry.highlight)
        .concat(unresolved);
}

export function serializeRangeToSelection(root, range) {
    if (!root || !range) return null;

    const stream = buildCanonicalStream(root);

    if (!stream.segments.length) return null;

    let start = null;
    let end = null;
    const parts = [];

    stream.segments.forEach((segment) => {
        const intersects = segment.type === 'text'
            ? range.intersectsNode(segment.node)
            : range.intersectsNode(segment.element);

        if (!intersects) return;

        if (segment.type === 'atomic') {
            if (!segment.text) return;
            if (start === null) start = segment.start;
            end = segment.end;
            parts.push(segment.text);
            return;
        }

        let localStart = 0;
        let localEnd = segment.text.length;

        if (range.startContainer === segment.node) {
            localStart = range.startOffset;
        }

        if (range.endContainer === segment.node) {
            localEnd = range.endOffset;
        }

        if (localEnd <= localStart) return;

        const globalStart = segment.start + localStart;
        const globalEnd = segment.start + localEnd;

        if (start === null) start = globalStart;
        end = globalEnd;
        parts.push(segment.text.slice(localStart, localEnd));
    });

    if (start === null || end === null || end <= start) {
        return null;
    }

    return {
        text: parts.join(''),
        start,
        end,
        stream,
        anchor: buildAnchorFromOffsets(stream.text, start, end, stream.fingerprint),
    };
}

function resolveDomBoundary(segments, offset, bias) {
    if (!segments.length) return null;

    if (bias === 'start') {
        for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i];
            if (offset < segment.end || (i === segments.length - 1 && offset === segment.end)) {
                if (segment.type === 'atomic') {
                    return { type: 'before', element: segment.element };
                }

                return {
                    type: 'text',
                    node: segment.node,
                    offset: Math.max(0, Math.min(offset - segment.start, segment.node.data.length)),
                };
            }
        }

        const lastSegment = segments[segments.length - 1];
        if (lastSegment.type === 'atomic') {
            return { type: 'after', element: lastSegment.element };
        }

        return { type: 'text', node: lastSegment.node, offset: lastSegment.node.data.length };
    }

    for (let i = 0; i < segments.length; i += 1) {
        const segment = segments[i];
        if (offset <= segment.end) {
            if (segment.type === 'atomic') {
                return { type: 'after', element: segment.element };
            }

            return {
                type: 'text',
                node: segment.node,
                offset: Math.max(0, Math.min(offset - segment.start, segment.node.data.length)),
            };
        }
    }

    const lastSegment = segments[segments.length - 1];
    if (lastSegment.type === 'atomic') {
        return { type: 'after', element: lastSegment.element };
    }

    return { type: 'text', node: lastSegment.node, offset: lastSegment.node.data.length };
}

function applyBoundary(range, boundaryType, boundary) {
    if (!boundary) return;

    if (boundary.type === 'before') {
        if (boundaryType === 'start') range.setStartBefore(boundary.element);
        else range.setEndBefore(boundary.element);
        return;
    }

    if (boundary.type === 'after') {
        if (boundaryType === 'start') range.setStartAfter(boundary.element);
        else range.setEndAfter(boundary.element);
        return;
    }

    if (boundaryType === 'start') range.setStart(boundary.node, boundary.offset);
    else range.setEnd(boundary.node, boundary.offset);
}

export function createDomRangeFromOffsets(segments, start, end) {
    if (!segments?.length || end <= start) return null;

    const range = document.createRange();
    const startBoundary = resolveDomBoundary(segments, start, 'start');
    const endBoundary = resolveDomBoundary(segments, end, 'end');

    if (!startBoundary || !endBoundary) return null;

    applyBoundary(range, 'start', startBoundary);
    applyBoundary(range, 'end', endBoundary);

    return range;
}
