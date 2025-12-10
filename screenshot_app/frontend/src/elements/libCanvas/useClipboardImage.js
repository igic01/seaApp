import { useCallback, useEffect, useRef, useState } from "react";

export function useClipboardImage({ initialSrc = "" } = {}) {
    const [imageSrc, setImageSrc] = useState(initialSrc);
    const lastObjectUrlRef = useRef(null);
    const fileInputRef = useRef(null);

    const setFromBlob = useCallback((blob) => {
        if (!blob) return;
        if (lastObjectUrlRef.current) {
            URL.revokeObjectURL(lastObjectUrlRef.current);
            lastObjectUrlRef.current = null;
        }
        const url = URL.createObjectURL(blob);
        lastObjectUrlRef.current = url;
        setImageSrc(url);
    }, []);

    const handleFiles = useCallback((fileList) => {
        if (!fileList?.length) return;
        const imageFile = Array.from(fileList).find((file) => file.type.startsWith("image/"));
        if (imageFile) {
            setFromBlob(imageFile);
        }
    }, [setFromBlob]);

    const triggerFileDialog = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handlePaste = useCallback((event) => {
        const items = event.clipboardData?.items;
        const files = event.clipboardData?.files;

        const imageItem = items && Array.from(items).find((item) => item.type?.startsWith("image/"));
        const fileFromItems = imageItem?.getAsFile();
        const fileFromFiles = files && Array.from(files).find((file) => file.type?.startsWith("image/"));
        const file = fileFromItems || fileFromFiles;

        if (!file) return;

        event.preventDefault();
        setFromBlob(file);
    }, [setFromBlob]);

    const copyImageToClipboard = useCallback(async () => {
        if (!imageSrc || !navigator.clipboard?.write) return false;
        try {
            const response = await fetch(imageSrc);
            const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
            return true;
        } catch (error) {
            console.error("Failed to copy image to clipboard:", error);
            return false;
        }
    }, [imageSrc]);

    const pasteFromClipboard = useCallback(async () => {
        if (navigator.clipboard?.read) {
            try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                    const type = item.types.find((t) => t.startsWith("image/"));
                    if (type) {
                        const blob = await item.getType(type);
                        setFromBlob(blob);
                        return true;
                    }
                }
            } catch (error) {
                console.error("Failed to paste image from clipboard:", error);
            }
        }
        return false;
    }, [setFromBlob]);

    useEffect(() => () => {
        if (lastObjectUrlRef.current) {
            URL.revokeObjectURL(lastObjectUrlRef.current);
        }
    }, []);

    useEffect(() => {
        const isEditableTarget = (target) =>
            target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

        const handleKeyDown = (e) => {
            const isModifier = e.ctrlKey || e.metaKey;
            if (!isModifier) return;

            if (isEditableTarget(e.target)) return;

            const key = e.key?.toLowerCase();
            if (key === "v") {
                pasteFromClipboard();
            } else if (key === "c" && imageSrc) {
                e.preventDefault();
                copyImageToClipboard();
            }
        };

        const handleCopy = (e) => {
            if (!imageSrc) return;
            if (isEditableTarget(e.target)) return;
            e.preventDefault();
            copyImageToClipboard();
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("paste", handlePaste);
        window.addEventListener("copy", handleCopy);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("paste", handlePaste);
            window.removeEventListener("copy", handleCopy);
        };
    }, [handlePaste, copyImageToClipboard, pasteFromClipboard, imageSrc]);

    return {
        imageSrc,
        setImageSrc,
        setFromBlob,
        fileInputRef,
        handleFiles,
        triggerFileDialog,
        copyImageToClipboard,
        pasteFromClipboard,
    };
}
