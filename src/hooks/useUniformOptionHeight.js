"use client";

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export function useUniformOptionHeight(items) {
    const optionRefs = useRef([]);
    const [optionHeight, setOptionHeight] = useState(null);

    useLayoutEffect(() => {
        optionRefs.current = optionRefs.current.slice(0, items.length);
        setOptionHeight(null);

        if (typeof window === 'undefined' || items.length === 0) return undefined;

        let frameId = null;

        const measure = () => {
            frameId = null;
            const nextHeight = optionRefs.current.reduce((maxHeight, node) => {
                if (!node) return maxHeight;
                return Math.max(maxHeight, node.getBoundingClientRect().height);
            }, 0);

            const roundedHeight = nextHeight > 0 ? Math.ceil(nextHeight) : null;
            setOptionHeight((previousHeight) => (
                previousHeight === roundedHeight ? previousHeight : roundedHeight
            ));
        };

        const scheduleMeasure = () => {
            if (frameId !== null) cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(measure);
        };

        scheduleMeasure();

        const resizeObservers = optionRefs.current
            .filter(Boolean)
            .map((node) => {
                const observer = new ResizeObserver(scheduleMeasure);
                observer.observe(node);
                return observer;
            });

        window.addEventListener('resize', scheduleMeasure);

        return () => {
            if (frameId !== null) cancelAnimationFrame(frameId);
            resizeObservers.forEach((observer) => observer.disconnect());
            window.removeEventListener('resize', scheduleMeasure);
        };
    }, [items]);

    const setOptionRef = useCallback((index) => (node) => {
        optionRefs.current[index] = node;
    }, []);

    return { optionHeight, setOptionRef };
}
