import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    buildHandlePositions,
    buildOverlayBox,
    computeMetrics,
    createDefaultRect,
    metricsEqual,
    pointToImageSpace,
} from "./cropMath";
import { calculateHandleRect, calculateMoveRect } from "./cropDrag";

export function useCrop({
    containerRef,
    imageRef,
    scale,
    offset,
    imageSrc,
    onApplyCrop,
    onStateChange,
}) {
    const [isCropping, setIsCropping] = useState(false);
    const [cropRect, setCropRect] = useState(null);
    const [isDraggingCrop, setIsDraggingCrop] = useState(false);
    const [metrics, setMetrics] = useState(null);
    const dragRef = useRef(null);

    const syncMetrics = useCallback(() => {
        setMetrics((prev) => {
            const next = (() => {
                try {
                    return computeMetrics({ containerRef, imageRef, scale, offset });
                } catch (error) {
                    console.error("Failed to read crop metrics", error);
                    return null;
                }
            })();

            return metricsEqual(prev, next) ? prev : next;
        });
    }, [containerRef, imageRef, offset, scale]);

    useLayoutEffect(() => {
        syncMetrics();
    }, [syncMetrics]);

    useEffect(() => {
        const handleResize = () => syncMetrics();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [syncMetrics]);

    useEffect(() => {
        const image = imageRef?.current;
        if (!image) return undefined;

        const handleLoad = () => syncMetrics();
        if (image.complete && image.naturalWidth) {
            syncMetrics();
        }

        image.addEventListener("load", handleLoad);
        return () => image.removeEventListener("load", handleLoad);
    }, [imageRef, imageSrc, syncMetrics]);

    const overlayBox = useMemo(
        () => buildOverlayBox(cropRect, metrics, scale),
        [cropRect, metrics, scale]
    );

    const handlePositions = useMemo(
        () => buildHandlePositions(overlayBox),
        [overlayBox]
    );

    const setCropActive = useCallback(
        (next) => {
            setIsCropping(next);
            if (onStateChange) {
                onStateChange(next);
            }
        },
        [onStateChange]
    );

    const startCrop = useCallback(() => {
        if (!imageSrc) return;
        syncMetrics();
        const metricsSnapshot = metrics ?? computeMetrics({ containerRef, imageRef, scale, offset });
        setCropRect((prev) => prev ?? createDefaultRect(metricsSnapshot));
        setCropActive(true);
    }, [containerRef, imageRef, imageSrc, metrics, offset, scale, setCropActive, syncMetrics]);

    const applyCrop = useCallback(async () => {
        if (!cropRect || !imageSrc) return false;
        const imageEl = imageRef.current;
        if (!imageEl) return false;

        const canvas = document.createElement("canvas");
        const width = Math.max(1, Math.round(cropRect.width));
        const height = Math.max(1, Math.round(cropRect.height));
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(imageEl, -Math.round(cropRect.x), -Math.round(cropRect.y));

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        onApplyCrop?.(blob);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                },
                "image/png"
            );
        });
    }, [cropRect, imageRef, imageSrc, onApplyCrop]);

    const finishCrop = useCallback(async () => {
        if (!isCropping) return false;
        const result = await applyCrop();
        setCropActive(false);
        setCropRect(null);
        return result;
    }, [applyCrop, isCropping, setCropActive]);

    const toggleCrop = useCallback(() => {
        if (isCropping) {
            finishCrop();
        } else {
            startCrop();
        }
    }, [finishCrop, isCropping, startCrop]);

    const toImagePoint = useCallback(
        (clientX, clientY) => {
            const nextMetrics = metrics ?? computeMetrics({ containerRef, imageRef, scale, offset });
            return pointToImageSpace(clientX, clientY, nextMetrics, scale);
        },
        [containerRef, imageRef, metrics, offset, scale]
    );

    const beginHandleDrag = useCallback(
        (handle, event) => {
            if (!cropRect) return;
            const point = toImagePoint(event.clientX, event.clientY);
            if (!point) return;
            event.preventDefault();
            event.stopPropagation();
            dragRef.current = {
                type: "handle",
                handle,
                startRect: cropRect,
                startPoint: point,
                aspect: cropRect.width && cropRect.height ? cropRect.width / cropRect.height : 1,
            };
            setIsDraggingCrop(true);
        },
        [cropRect, toImagePoint]
    );

    const beginMoveDrag = useCallback(
        (event) => {
            if (!cropRect) return;
            const point = toImagePoint(event.clientX, event.clientY);
            if (!point) return;
            event.preventDefault();
            event.stopPropagation();
            dragRef.current = {
                type: "move",
                startRect: cropRect,
                startPoint: point,
            };
            setIsDraggingCrop(true);
        },
        [cropRect, toImagePoint]
    );

    useEffect(() => {
        const handleMoveEvent = (e) => {
            if (!dragRef.current) return;
            const point = toImagePoint(e.clientX, e.clientY);
            if (!point) return;

            if (dragRef.current.type === "move") {
                const next = calculateMoveRect({
                    startRect: dragRef.current.startRect,
                    startPoint: dragRef.current.startPoint,
                    point,
                });
                if (next) setCropRect(next);
            } else if (dragRef.current.type === "handle") {
                const next = calculateHandleRect({
                    handle: dragRef.current.handle,
                    startRect: dragRef.current.startRect,
                    point,
                    aspect: dragRef.current.aspect,
                    keepAspect: e.shiftKey,
                });
                if (next) setCropRect(next);
            }
        };

        const handleUpEvent = () => {
            if (!dragRef.current) return;
            dragRef.current = null;
            setIsDraggingCrop(false);
        };

        window.addEventListener("mousemove", handleMoveEvent);
        window.addEventListener("mouseup", handleUpEvent);

        return () => {
            window.removeEventListener("mousemove", handleMoveEvent);
            window.removeEventListener("mouseup", handleUpEvent);
        };
    }, [toImagePoint]);

    return {
        isCropping,
        cropRect,
        overlayBox,
        handlePositions,
        isDraggingCrop,
        startCrop,
        finishCrop,
        toggleCrop,
        beginHandleDrag,
        beginMoveDrag,
    };
}
