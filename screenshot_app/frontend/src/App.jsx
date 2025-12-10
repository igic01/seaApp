import { useRef, useState } from "react";
import Sidebar from "./elements/Sidebar.jsx";
import Canvas from "./elements/Canvas.jsx";

function App() {
  const openFileRef = useRef(null);
  const cropActionsRef = useRef(null);
  const imageAccessRef = useRef(null);
  const [isCropping, setIsCropping] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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

  return (
    <>
      <Canvas
        onRegisterOpenFile={handleRegisterOpenFile}
        onRegisterCropActions={handleRegisterCropActions}
        onRegisterImageAccess={handleRegisterImageAccess}
        onCropModeChange={setIsCropping}
        onImageChange={handleImageChange}
      />
      <Sidebar
        onOpenFolder={handleOpenFolder}
        onToggleCrop={handleToggleCrop}
        onSendImage={handleSendImage}
        isCropping={isCropping}
        canSendImage={!!selectedImage?.src}
      />
    </>
  );
}

export default App;
