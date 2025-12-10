import { useEffect, useRef } from "react";
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
    const { scale, setScale } = useZoom(containerRef);
    const { offset, isDragging, handleMouseDown, handleMouseMove, endDrag, setOffset } = usePan();
    const {
        imageSrc,
        imageName,
        setFromBlob,
        fileInputRef,
        handleFiles,
        triggerFileDialog,
        getImageBlob,
    } = useClipboardImage({ initialSrc: src, onImageChange });
    const { buildFormData, sendToBackend } = useImageSender({ getImageBlob });
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
    } = useCrop({
        containerRef,
        imageRef,
        scale,
        offset,
        imageSrc,
        onApplyCrop: (blob) => {
            const croppedName = imageName ? `cropped-${imageName}` : "cropped-image.png";
            setFromBlob(blob, croppedName);
            setOffset({ x: 0, y: 0 });
            setScale(1);
        },
        onStateChange: onCropModeChange,
    });

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
            buildFormData,
            sendToBackend,
            imageSrc,
            imageName,
        });
    }, [buildFormData, getImageBlob, imageName, imageSrc, onRegisterImageAccess, sendToBackend]);

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
