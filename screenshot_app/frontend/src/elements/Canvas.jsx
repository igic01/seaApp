import { useCallback, useEffect, useRef } from "react";
import { usePan } from "./libCanvas/usePan";
import { useZoom } from "./libCanvas/useZoom";
import { useClipboardImage } from "./libCanvas/useClipboardImage";
import { useCrop } from "./libCanvas/useCrop";
import { useImageSender } from "./libCanvas/useImageSender";
import CropOverlay from "./CropOverlay";
import styles from "../styles/Canvas.module.css";

export default function Canvas({
    src,
    onRegisterOpenFile,
    onRegisterCropActions,
    onRegisterImageAccess,
    onCropModeChange,
    onImageChange,
}) {
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    const cropBlobRef = useRef(null);
    const hasCropRef = useRef(false);
    const { scale } = useZoom(containerRef);
    const { offset, isDragging, handleMouseDown, handleMouseMove, endDrag } = usePan();
    const getCroppedBlobProxy = useCallback(() => {
        const fn = cropBlobRef.current;
        return fn ? fn() : null;
    }, []);
    const getHasCrop = useCallback(() => hasCropRef.current, []);
    const {
        imageSrc,
        imageName,
        fileInputRef,
        handleFiles,
        triggerFileDialog,
        getImageBlob,
    } = useClipboardImage({
        initialSrc: src,
        onImageChange,
        getCroppedBlob: getCroppedBlobProxy,
        getHasCrop,
    });
    const {
        isCropping,
        overlayBox,
        handlePositions,
        isDraggingCrop,
        startCrop,
        finishCrop,
        toggleCrop,
        beginHandleDrag,
        beginMoveDrag,
        appliedOverlayBox,
        appliedClipStyle,
        hasAppliedCrop,
        getCroppedBlob,
    } = useCrop({
        containerRef,
        imageRef,
        scale,
        offset,
        imageSrc,
        onStateChange: onCropModeChange,
    });
    const { buildFormData, sendToBackend } = useImageSender({ getImageBlob, getCroppedBlob });

    useEffect(() => {
        cropBlobRef.current = getCroppedBlob;
        hasCropRef.current = !!hasAppliedCrop;
    }, [getCroppedBlob, hasAppliedCrop]);

    useEffect(() => {
        if (onRegisterOpenFile) {
            onRegisterOpenFile(triggerFileDialog);
        }
    }, [onRegisterOpenFile, triggerFileDialog]);

    useEffect(() => {
        if (onRegisterCropActions) {
            onRegisterCropActions({
                toggle: () => toggleCrop(),
                finish: () => finishCrop(),
                start: () => startCrop(),
            });
        }
    }, [finishCrop, onRegisterCropActions, startCrop, toggleCrop]);

    useEffect(() => {
        if (!onRegisterImageAccess) return;
        onRegisterImageAccess({
            getImageBlob,
            getCroppedBlob,
            getHasCrop,
            buildFormData,
            sendToBackend,
            imageSrc,
            imageName,
        });
    }, [
        buildFormData,
        getCroppedBlob,
        getHasCrop,
        getImageBlob,
        imageName,
        imageSrc,
        onRegisterImageAccess,
        sendToBackend,
    ]);

    useEffect(() => {
        if (!isCropping) return undefined;
        const handleKeyDown = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                finishCrop();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [finishCrop, isCropping]);

    const containerClasses = [
        styles.container,
        isDragging || isDraggingCrop ? styles.dragging : "",
        isCropping ? styles.cropping : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            ref={containerRef}
            className={containerClasses}
            onMouseDown={isCropping ? undefined : handleMouseDown}
            onMouseMove={isCropping ? undefined : handleMouseMove}
            onMouseUp={isCropping ? undefined : endDrag}
            onMouseLeave={isCropping ? undefined : endDrag}
            tabIndex={0}
        >
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className={styles.hiddenInput}
                onChange={(e) => handleFiles(e.target.files)}
            />

            {!imageSrc && (
                <div className={styles.placeholder}>
                    <button
                        type="button"
                        onClick={triggerFileDialog}
                        className={`${styles.button} ${styles.buttonLarge}`}
                    >
                        Open file
                    </button>
                </div>
            )}

            {imageSrc && (
                <img
                    ref={imageRef}
                    src={imageSrc}
                    alt=""
                    draggable={false}
                    className={styles.image}
                    style={{
                        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        ...(!isCropping && appliedClipStyle ? appliedClipStyle : null),
                    }}
                />
            )}

            {!isCropping && appliedOverlayBox && (
                <div
                    className={styles.appliedOverlay}
                    style={{
                        left: appliedOverlayBox.relativeLeft,
                        top: appliedOverlayBox.relativeTop,
                        width: appliedOverlayBox.width,
                        height: appliedOverlayBox.height,
                        pointerEvents: "none",
                    }}
                />
            )}

            {isCropping && overlayBox && (
                <CropOverlay
                    overlayBox={overlayBox}
                    handlePositions={handlePositions}
                    onOverlayMouseDown={beginMoveDrag}
                    onHandleMouseDown={beginHandleDrag}
                />
            )}

        </div>
    );
}
