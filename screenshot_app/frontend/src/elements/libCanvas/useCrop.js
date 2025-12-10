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
    onStateChange,
}) {
    const [isCropping, setIsCropping] = useState(false);
    const [cropRect, setCropRect] = useState(null);
    const [appliedCropRect, setAppliedCropRect] = useState(null);
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

    const appliedOverlayBox = useMemo(
        () => buildOverlayBox(appliedCropRect, metrics, scale),
        [appliedCropRect, metrics, scale]
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
        setCropRect((prev) => prev ?? appliedCropRect ?? createDefaultRect(metricsSnapshot, 0));
        setCropActive(true);
    }, [appliedCropRect, containerRef, imageRef, imageSrc, metrics, offset, scale, setCropActive, syncMetrics]);

    const getCroppedBlob = useCallback(async () => {
        const targetRect = appliedCropRect || cropRect;
        if (!targetRect || !imageSrc) return null;
        const imageEl = imageRef.current;
        if (!imageEl) return null;

        const width = Math.max(1, Math.round(targetRect.width));
        const height = Math.max(1, Math.round(targetRect.height));
        const sx = Math.max(0, Math.round(targetRect.x));
        const sy = Math.max(0, Math.round(targetRect.y));

        const createCanvas = () => {
            if (typeof OffscreenCanvas !== "undefined") {
                return new OffscreenCanvas(width, height);
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            return canvas;
        };

        try {
            let bitmap = null;
            if (typeof createImageBitmap === "function") {
                bitmap = await createImageBitmap(imageEl, sx, sy, width, height);
            }

            const canvas = createCanvas();
            const ctx = canvas.getContext("2d");
            if (!ctx) return false;

            if (bitmap) {
                ctx.drawImage(bitmap, 0, 0, width, height);
                bitmap.close?.();
            } else {
                ctx.drawImage(imageEl, -sx, -sy);
            }

            const blob =
                typeof canvas.convertToBlob === "function"
                    ? await canvas.convertToBlob({ type: "image/png" })
                    : await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

            if (!blob) return null;
            return {
                blob,
                name: "cropped-image.png",
            };
        } catch (error) {
            console.error("Failed to apply crop", error);
            return null;
        }
    }, [appliedCropRect, cropRect, imageRef, imageSrc]);

    const finishCrop = useCallback(() => {
        if (!isCropping || !cropRect) {
            setCropActive(false);
            setCropRect(null);
            return false;
        }
        setAppliedCropRect(cropRect);
        setCropActive(false);
        setCropRect(null);
        return true;
    }, [cropRect, isCropping, setCropActive]);

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

    useEffect(() => {
        dragRef.current = null;
        setCropRect(null);
        setAppliedCropRect(null);
        setCropActive(false);
    }, [imageSrc, setCropActive]);

    const appliedClipStyle = useMemo(() => {
        if (!appliedCropRect || !metrics?.naturalWidth || !metrics?.naturalHeight) return null;
        const { naturalWidth, naturalHeight } = metrics;
        const top = (appliedCropRect.y / naturalHeight) * 100;
        const left = (appliedCropRect.x / naturalWidth) * 100;
        const bottom = ((naturalHeight - appliedCropRect.y - appliedCropRect.height) / naturalHeight) * 100;
        const right = ((naturalWidth - appliedCropRect.x - appliedCropRect.width) / naturalWidth) * 100;
        const clip = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
        return { clipPath: clip, WebkitClipPath: clip };
    }, [appliedCropRect, metrics]);

    return {
        isCropping,
        cropRect,
        appliedCropRect,
        appliedOverlayBox,
        appliedClipStyle,
        hasAppliedCrop: !!appliedCropRect,
        overlayBox,
        handlePositions,
        isDraggingCrop,
        startCrop,
        finishCrop,
        toggleCrop,
        beginHandleDrag,
        beginMoveDrag,
        getCroppedBlob,
    };
}
