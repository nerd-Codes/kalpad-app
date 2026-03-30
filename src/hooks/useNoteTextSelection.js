"use client";

import { useEffect, useState } from 'react';
import { serializeRangeToSelection } from '@/lib/noteHighlights';

const defaultSelection = { text: '', anchor: null, position: { x: 0, y: 0 } };

function containsNode(root, node) {
    if (!root || !node) return false;
    if (root === node) return true;
    if (node.nodeType === Node.TEXT_NODE) {
        return root.contains(node.parentNode);
    }
    return root.contains(node);
}

export function useNoteTextSelection(rootRef, enabled = true) {
    const [selection, setSelection] = useState(defaultSelection);

    useEffect(() => {
        if (!enabled) {
            setSelection(defaultSelection);
            return undefined;
        }

        const updateSelection = () => {
            const root = rootRef.current;
            const nativeSelection = window.getSelection();

            if (!root || !nativeSelection || nativeSelection.rangeCount === 0 || nativeSelection.isCollapsed) {
                setSelection(defaultSelection);
                return;
            }

            const range = nativeSelection.getRangeAt(0);

            if (
                !containsNode(root, range.commonAncestorContainer) ||
                !containsNode(root, range.startContainer) ||
                !containsNode(root, range.endContainer)
            ) {
                setSelection(defaultSelection);
                return;
            }

            const serialized = serializeRangeToSelection(root, range);

            if (!serialized || !serialized.text.trim()) {
                setSelection(defaultSelection);
                return;
            }

            const rect = range.getBoundingClientRect();
            setSelection({
                text: serialized.text,
                anchor: serialized.anchor,
                position: {
                    x: rect.left + (rect.width / 2),
                    y: rect.top,
                },
            });
        };

        const handleSelectionEvent = () => {
            window.setTimeout(updateSelection, 10);
        };

        document.addEventListener('mouseup', handleSelectionEvent);
        document.addEventListener('keyup', handleSelectionEvent);
        document.addEventListener('touchend', handleSelectionEvent);

        return () => {
            document.removeEventListener('mouseup', handleSelectionEvent);
            document.removeEventListener('keyup', handleSelectionEvent);
            document.removeEventListener('touchend', handleSelectionEvent);
        };
    }, [enabled, rootRef]);

    const clearSelection = () => {
        window.getSelection()?.removeAllRanges();
        setSelection(defaultSelection);
    };

    return { selection, clearSelection };
}
