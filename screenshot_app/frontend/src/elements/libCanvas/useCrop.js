import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const MIN_SIZE = 12;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const metricsEqual = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
        a.naturalWidth === b.naturalWidth &&
        a.naturalHeight === b.naturalHeight &&
        a.boxWidth === b.boxWidth &&
        a.boxHeight === b.boxHeight &&
        a.left === b.left &&
        a.top === b.top &&
        a.relativeLeft === b.relativeLeft &&
        a.relativeTop === b.relativeTop
    );
};

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

    const readMetrics = useCallback(() => {
        const container = containerRef?.current;
        const image = imageRef?.current;
        if (!container || !image) return null;

        const { naturalWidth, naturalHeight } = image;
        if (!naturalWidth || !naturalHeight) return null;

        const containerRect = container.getBoundingClientRect();
        const boxWidth = naturalWidth * scale;
        const boxHeight = naturalHeight * scale;
        const relativeLeft = containerRect.width / 2 + offset.x - boxWidth / 2;
        const relativeTop = containerRect.height / 2 + offset.y - boxHeight / 2;

        return {
            naturalWidth,
            naturalHeight,
            containerRect,
            boxWidth,
            boxHeight,
            left: containerRect.left + relativeLeft,
            top: containerRect.top + relativeTop,
            relativeLeft,
            relativeTop,
        };
    }, [containerRef, imageRef, offset.x, offset.y, scale]);

    const syncMetrics = useCallback(() => {
        setMetrics((prev) => {
            const next = (() => {
                try {
                    return readMetrics();
                } catch (error) {
                    console.error("Failed to read crop metrics", error);
                    return null;
                }
            })();

            if (metricsEqual(prev, next)) {
                return prev;
            }
            return next;
        });
    }, [readMetrics]);

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

    const overlayBox = useMemo(() => {
        if (!cropRect || !metrics) return null;
        return {
            left: metrics.left + cropRect.x * scale,
            top: metrics.top + cropRect.y * scale,
            width: cropRect.width * scale,
            height: cropRect.height * scale,
            relativeLeft: metrics.relativeLeft + cropRect.x * scale,
            relativeTop: metrics.relativeTop + cropRect.y * scale,
        };
    }, [cropRect, metrics, scale]);

    const handlePositions = useMemo(() => {
        if (!overlayBox) return [];
        const { relativeLeft: left, relativeTop: top, width, height } = overlayBox;
        const cx = left + width / 2;
        const cy = top + height / 2;
        const right = left + width;
        const bottom = top + height;

        return [
            { id: "nw", x: left, y: top, cursor: "nwse-resize" },
            { id: "n", x: cx, y: top, cursor: "ns-resize" },
            { id: "ne", x: right, y: top, cursor: "nesw-resize" },
            { id: "e", x: right, y: cy, cursor: "ew-resize" },
            { id: "se", x: right, y: bottom, cursor: "nwse-resize" },
            { id: "s", x: cx, y: bottom, cursor: "ns-resize" },
            { id: "sw", x: left, y: bottom, cursor: "nesw-resize" },
            { id: "w", x: left, y: cy, cursor: "ew-resize" },
        ];
    }, [overlayBox]);

    const createDefaultRect = useCallback(() => {
        const currentMetrics = metrics ?? readMetrics();
        if (!currentMetrics) return null;
        const padding = 0.1;
        const width = Math.max(MIN_SIZE, currentMetrics.naturalWidth * (1 - padding * 2));
        const height = Math.max(MIN_SIZE, currentMetrics.naturalHeight * (1 - padding * 2));
        return {
            x: clamp(currentMetrics.naturalWidth * padding, 0, currentMetrics.naturalWidth - width),
            y: clamp(currentMetrics.naturalHeight * padding, 0, currentMetrics.naturalHeight - height),
            width,
            height,
        };
    }, [metrics, readMetrics]);

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
        setCropRect((prev) => prev ?? createDefaultRect());
        setCropActive(true);
    }, [createDefaultRect, imageSrc, setCropActive, syncMetrics]);

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

    const resetCropOnImageChange = useCallback(() => {
        setCropActive(false);
        setCropRect(null);
        setIsDraggingCrop(false);
        setMetrics(null);
        dragRef.current = null;
    }, [setCropActive]);

    useEffect(() => {
        resetCropOnImageChange();
    }, [imageSrc, resetCropOnImageChange]);

    const toImagePoint = useCallback(
        (clientX, clientY) => {
            const bounds = metrics ?? readMetrics();
            if (!bounds) return null;

            const x = (clientX - bounds.left) / scale;
            const y = (clientY - bounds.top) / scale;
            return {
                x: clamp(x, 0, bounds.naturalWidth),
                y: clamp(y, 0, bounds.naturalHeight),
                bounds,
            };
        },
        [metrics, readMetrics, scale]
    );

    const updateMove = useCallback(
        (point) => {
            if (!dragRef.current?.startRect) return;
            const { naturalWidth, naturalHeight } = point.bounds;
            const start = dragRef.current.startRect;
            const deltaX = point.x - dragRef.current.startPoint.x;
            const deltaY = point.y - dragRef.current.startPoint.y;

            const nextX = clamp(start.x + deltaX, 0, naturalWidth - start.width);
            const nextY = clamp(start.y + deltaY, 0, naturalHeight - start.height);
            setCropRect({ ...start, x: nextX, y: nextY });
        },
        []
    );

    const updateHandle = useCallback(
        (handle, point, keepAspect) => {
            if (!dragRef.current?.startRect) return;
            const start = dragRef.current.startRect;
            const aspect = dragRef.current.aspect;
            const maxX = point.bounds.naturalWidth;
            const maxY = point.bounds.naturalHeight;

            let { x, y, width, height } = start;
            const right = start.x + start.width;
            const bottom = start.y + start.height;

            const applyAspect = (fixedX, fixedY, newWidth, newHeight) => {
                if (!keepAspect) return { x: fixedX, y: fixedY, width: newWidth, height: newHeight };
                let adjustedWidth = newWidth;
                let adjustedHeight = newHeight;
                const currentRatio = newWidth / newHeight || aspect;
                if (currentRatio > aspect) {
                    adjustedWidth = newHeight * aspect;
                } else {
                    adjustedHeight = newWidth / aspect;
                }
                return { x: fixedX, y: fixedY, width: adjustedWidth, height: adjustedHeight };
            };

            switch (handle) {
                case "n": {
                    const newY = clamp(point.y, 0, bottom - MIN_SIZE);
                    const newHeight = bottom - newY;
                    y = newY;
                    height = newHeight;
                    break;
                }
                case "s": {
                    const newBottom = clamp(point.y, y + MIN_SIZE, maxY);
                    height = newBottom - y;
                    break;
                }
                case "w": {
                    const newX = clamp(point.x, 0, right - MIN_SIZE);
                    width = right - newX;
                    x = newX;
                    break;
                }
                case "e": {
                    const newRight = clamp(point.x, x + MIN_SIZE, maxX);
                    width = newRight - x;
                    break;
                }
                case "nw": {
                    const newX = clamp(point.x, 0, right - MIN_SIZE);
                    const newY = clamp(point.y, 0, bottom - MIN_SIZE);
                    const newWidth = right - newX;
                    const newHeight = bottom - newY;
                    const sized = applyAspect(newX, newY, newWidth, newHeight);
                    x = right - sized.width;
                    y = bottom - sized.height;
                    width = sized.width;
                    height = sized.height;
                    break;
                }
                case "ne": {
                    const newRight = clamp(point.x, x + MIN_SIZE, maxX);
                    const newY = clamp(point.y, 0, bottom - MIN_SIZE);
                    const newWidth = newRight - x;
                    const newHeight = bottom - newY;
                    const sized = applyAspect(x, newY, newWidth, newHeight);
                    y = bottom - sized.height;
                    width = sized.width;
                    height = sized.height;
                    break;
                }
                case "sw": {
                    const newX = clamp(point.x, 0, right - MIN_SIZE);
                    const newBottom = clamp(point.y, y + MIN_SIZE, maxY);
                    const newWidth = right - newX;
                    const newHeight = newBottom - y;
                    const sized = applyAspect(newX, y, newWidth, newHeight);
                    x = right - sized.width;
                    width = sized.width;
                    height = sized.height;
                    break;
                }
                case "se": {
                    const newRight = clamp(point.x, x + MIN_SIZE, maxX);
                    const newBottom = clamp(point.y, y + MIN_SIZE, maxY);
                    const newWidth = newRight - x;
                    const newHeight = newBottom - y;
                    const sized = applyAspect(x, y, newWidth, newHeight);
                    width = sized.width;
                    height = sized.height;
                    break;
                }
                default:
                    break;
            }

            const clampedX = clamp(x, 0, maxX - MIN_SIZE);
            const clampedY = clamp(y, 0, maxY - MIN_SIZE);
            const maxWidth = maxX - clampedX;
            const maxHeight = maxY - clampedY;
            setCropRect({
                x: clampedX,
                y: clampedY,
                width: clamp(width, MIN_SIZE, maxWidth),
                height: clamp(height, MIN_SIZE, maxHeight),
            });
        },
        []
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
            if (dragRef.current?.type === "move") {
                updateMove(point);
            } else if (dragRef.current?.type === "handle") {
                updateHandle(dragRef.current.handle, point, e.shiftKey);
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
    }, [toImagePoint, updateHandle, updateMove]);

    useEffect(() => {
        if (!isCropping || cropRect || !metrics) return;
        const defaultRect = createDefaultRect();
        if (defaultRect) {
            setCropRect(defaultRect);
        }
    }, [createDefaultRect, cropRect, isCropping, metrics]);

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
