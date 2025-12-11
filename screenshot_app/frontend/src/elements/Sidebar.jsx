import { useMemo, useState } from "react";
import Selection from "./Selection.jsx";
import BasicTools from "./BasicTools.jsx";
import styles from "../styles/Sidebar.module.css";

function Sidebar({
    onOpenFolder,
    onToggleCrop,
    onSendImage,
    onShowMeta,
    onSaveImage,
    isCropping,
    canSendImage,
    ocrText,
    ocrStatus,
    ocrError,
    onCopyOcrText,
    copyFeedback,
    onToggleCovers,
    coversEnabled,
}) {
    const listCovers = ["Date", "IBAN", "Phone-numbers", "Emails", "Faces"];
    const [cover, setCover] = useState([]);

    const handleCheckboxChange = (value) => {
        if (cover.includes(value)) {
            setCover(cover.filter((item) => item !== value));
        } else {
            setCover([...cover, value]);
        }
    };

    const listTypeCovers = ["Color", "Blur", "Pixelate"];
    const [typeCover, setTypeCover] = useState(listTypeCovers[0]);

    const ocrStatusMessage = useMemo(() => {
        if (ocrStatus === "loading") return "Reading text from the selected area...";
        if (ocrStatus === "success") return "Text detected – copy or edit below.";
        if (ocrStatus === "error") return "Could not read text.";
        return "Press File info to extract text from the current image.";
    }, [ocrStatus]);

    return (
        <div className={styles.sidebar}>
            <Selection
                title="Covers"
                type="checkbox"
                options={listCovers}
                value={cover}
                onChange={(e) => handleCheckboxChange(e.target.value)}
            />

            <Selection
                title="Type of covers"
                type="radio"
                options={listTypeCovers}
                value={typeCover}
                onChange={(e) => setTypeCover(e.target.value)}
            />

            <BasicTools
                className={styles.tools}
                onOpenFolder={onOpenFolder}
                onToggleCrop={onToggleCrop}
                onSendImage={onSendImage}
                onShowMeta={onShowMeta}
                onSave={onSaveImage}
                isCropping={isCropping}
                canSendImage={canSendImage}
                canSaveImage={canSendImage}
            />

            <div className={styles.tools} style={{ marginTop: "12px" }}>
                <button type="button" onClick={onToggleCovers}>
                    {coversEnabled ? "Hide test cover" : "Show test cover"}
                </button>
            </div>

            <div className={styles.ocrCard}>
                <h3>File info</h3>
                <p className={styles.ocrStatus}>{ocrStatusMessage}</p>
                <textarea
                    className={styles.ocrText}
                    placeholder="Recognized text will appear here."
                    value={ocrText}
                    readOnly
                    rows={6}
                />
                <div className={styles.ocrActions}>
                    <button type="button" onClick={onCopyOcrText} disabled={!ocrText}>
                        Copy text
                    </button>
                    {copyFeedback ? <span className={styles.copyFeedback}>{copyFeedback}</span> : null}
                </div>
                {ocrError ? <p className={styles.error}>{ocrError}</p> : null}
            </div>
        </div>
    );
}

export default Sidebar;
