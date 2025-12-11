import { useCallback, useRef, useState } from "react";
import Sidebar from "./elements/Sidebar.jsx";
import Canvas from "./elements/Canvas.jsx";

function App() {
  const openFileRef = useRef(null);
  const cropActionsRef = useRef(null);
  const imageAccessRef = useRef(null);
  const [isCropping, setIsCropping] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrStatus, setOcrStatus] = useState("idle"); // idle | loading | success | error
  const [ocrError, setOcrError] = useState(null);
  const [ocrCopyFeedback, setOcrCopyFeedback] = useState("");
  const [coversEnabled, setCoversEnabled] = useState(false);
  const [coverOrigin, setCoverOrigin] = useState({ x: 0, y: 0 });
  const [coverRects, setCoverRects] = useState([]);

  const handleRegisterOpenFile = (fn) => {
    openFileRef.current = fn;
  };

  const handleRegisterCropActions = (actions) => {
    cropActionsRef.current = actions;
  };

  const handleRegisterImageAccess = (access) => {
    imageAccessRef.current = access;
  };

  const handleImageChange = (payload) => {
    setSelectedImage(payload);
    setOcrText("");
    setOcrStatus("idle");
    setOcrError(null);
    setOcrCopyFeedback("");
  };

  const handleOpenFolder = () => {
    openFileRef.current?.();
  };

  const handleToggleCrop = () => {
    cropActionsRef.current?.toggle?.();
  };

  const handleSendImage = async () => {
    const access = imageAccessRef.current;
    if (!access) return;
    const built = await access.buildFormData();
    if (!built) {
      console.warn("No image selected to send");
      return;
    }

    const endpoint = import.meta?.env?.VITE_UPLOAD_ENDPOINT;
    if (!endpoint) {
      console.info("FormData ready to send", built.formData);
      return;
    }

    try {
      const result = await access.sendToBackend({ endpoint });
      if (!result.ok) {
        console.warn("Image upload failed", result.status);
      } else {
        console.info("Image uploaded", result.status);
      }
    } catch (error) {
      console.error("Failed to send image", error);
    }
  };

  const resolveOcrEndpoint = () => {
    if (import.meta?.env?.VITE_OCR_ENDPOINT) return import.meta.env.VITE_OCR_ENDPOINT;
    // If running Vite dev server (usually port 5173), default to the Flask backend on 5000.
    if (window?.location?.port === "5173") return "http://127.0.0.1:5000/api/ocr";
    return "/api/ocr";
  };

  const handleExtractText = async () => {
    const access = imageAccessRef.current;
    if (!access) return;

    // Apply any pending crop so OCR uses the selected region.
    cropActionsRef.current?.finish?.();

    const built = await access.buildFormData();
    if (!built) {
      setOcrStatus("error");
      setOcrError("No image selected.");
      setOcrText("");
      return;
    }

    const endpoint = resolveOcrEndpoint();

    setOcrStatus("loading");
    setOcrError(null);
    setOcrCopyFeedback("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: built.formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setOcrStatus("error");
        setOcrError(payload?.error || payload?.message || "Failed to read text from image.");
        setOcrText("");
        return;
      }

      setOcrText(typeof payload?.text === "string" ? payload.text : "");
      setOcrStatus("success");
    } catch (error) {
      setOcrStatus("error");
      setOcrError(error?.message || "Failed to contact OCR service.");
      setOcrText("");
    }
  };

  const handleCopyOcrText = async () => {
    if (!ocrText) return;
    try {
      await navigator.clipboard.writeText(ocrText);
      setOcrCopyFeedback("Copied!");
      setTimeout(() => setOcrCopyFeedback(""), 1500);
    } catch (error) {
      setOcrCopyFeedback("Copy failed");
    }
  };

  const saveCroppedToFile = useCallback(async () => {
    const access = imageAccessRef.current;
    if (!access) return;
    const payload = (await access.getCroppedBlob?.()) || (await access.getImageBlob?.());
    if (!payload?.blob) return;

    const suggestedName = payload.name || "cropped-image.png";

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: "Image",
              accept: {
                [payload.blob.type || "image/png"]: [".png", ".jpg", ".jpeg", ".webp", ".bmp"],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(payload.blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(payload.blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = suggestedName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Failed to save cropped image", error);
      }
    }
  }, []);

  const handleSaveImage = async () => {
    const access = imageAccessRef.current;
    if (!access || !selectedImage?.src) return;

    if (isCropping) {
      cropActionsRef.current?.finish?.();
    }

    await saveCroppedToFile();
  };

  const handleToggleCovers = () => {
    const next = !coversEnabled;
    if (next) {
      const applied = imageAccessRef.current?.getAppliedCropRect?.();
      const anchor = applied ? { x: applied.x || 0, y: applied.y || 0 } : { x: 0, y: 0 };
      setCoverOrigin(anchor);
    }
    setCoversEnabled(next);
  };

  const resolveOcrBoxesEndpoint = () => {
    if (import.meta?.env?.VITE_OCR_BOXES_ENDPOINT) return import.meta.env.VITE_OCR_BOXES_ENDPOINT;
    if (window?.location?.port === "5173") return "http://127.0.0.1:5000/api/ocr/boxes";
    return "/api/ocr/boxes";
  };

  const handleDetectTextRegions = async () => {
    const access = imageAccessRef.current;
    if (!access) return;

    // Apply pending crop to align detection with visible area.
    cropActionsRef.current?.finish?.();
    const applied = access.getAppliedCropRect?.();
    const anchor = applied ? { x: applied.x || 0, y: applied.y || 0 } : { x: 0, y: 0 };

    const built = await access.buildFormData();
    if (!built) {
      console.warn("No image selected for OCR boxes");
      return;
    }

    const endpoint = resolveOcrBoxesEndpoint();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: built.formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.boxes) {
        console.warn("OCR boxes failed", payload);
        setCoverRects([]);
        setCoversEnabled(false);
        return;
      }

      const boxes = Array.isArray(payload.boxes)
        ? payload.boxes
            .filter(
              (b) =>
                typeof b.x === "number" &&
                typeof b.y === "number" &&
                typeof b.width === "number" &&
                typeof b.height === "number"
            )
            .map((b, idx) => ({
              id: b.id ?? `box-${idx}`,
              x: b.x,
              y: b.y,
              width: b.width,
              height: b.height,
              color: "#000",
            }))
        : [];

      setCoverOrigin(anchor);
      setCoverRects(boxes);
      setCoversEnabled(true);
    } catch (error) {
      console.error("Failed to fetch OCR boxes", error);
      setCoverRects([]);
      setCoversEnabled(false);
    }
  };

  return (
    <>
      <Canvas
        onRegisterOpenFile={handleRegisterOpenFile}
        onRegisterCropActions={handleRegisterCropActions}
        onRegisterImageAccess={handleRegisterImageAccess}
        onCropModeChange={setIsCropping}
        onImageChange={handleImageChange}
        coversEnabled={coversEnabled}
        coverOrigin={coverOrigin}
        coverRects={coverRects}
      />
      <Sidebar
        onOpenFolder={handleOpenFolder}
        onToggleCrop={handleToggleCrop}
        onSendImage={handleSendImage}
        onShowMeta={handleExtractText}
        onSaveImage={handleSaveImage}
        isCropping={isCropping}
        canSendImage={!!selectedImage?.src}
        canSaveImage={!!selectedImage?.src}
        ocrText={ocrText}
        ocrStatus={ocrStatus}
        ocrError={ocrError}
        onCopyOcrText={handleCopyOcrText}
        copyFeedback={ocrCopyFeedback}
        onToggleCovers={handleToggleCovers}
        coversEnabled={coversEnabled}
        onDetectTextRegions={handleDetectTextRegions}
      />
    </>
  );
}

export default App;
