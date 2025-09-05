// src/hooks/useTextSelection.js
"use client";

import { useState, useEffect } from 'react';

const defaultSelection = { text: '', position: { x: 0, y: 0 } };

export function useTextSelection() {
    const [selection, setSelection] = useState(defaultSelection);

    useEffect(() => {
        const handleMouseUp = (event) => {
            setTimeout(() => {
                const selectedText = window.getSelection()?.toString().trim() || '';
                if (selectedText.length > 5) {
                    setSelection({ text: selectedText, position: { x: event.clientX, y: event.clientY } });
                } else {
                    if (selection.text) setSelection(defaultSelection);
                }
            }, 10);
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [selection.text]);

    const clearSelection = () => {
        window.getSelection()?.removeAllRanges();
        setSelection(defaultSelection);
    };

    return { selection, clearSelection };
}