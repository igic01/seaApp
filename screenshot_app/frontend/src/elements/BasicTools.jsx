import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { byPrefixAndName } from "@awesome.me/kit-KIT_CODE/icons";

const toolIcons = [
    { id: "open", icon: byPrefixAndName.far["folder-open"], label: "Open image" },
    { id: "crop", icon: byPrefixAndName.fas["crop"], label: "Toggle crop" },
    { id: "send", icon: byPrefixAndName.fas["floppy-disk"], label: "Send to backend" },
];

function BasicTools({ className, onOpenFolder, onToggleCrop, onSendImage, isCropping, canSendImage }) {
    const handleClick = (id) => {
        switch (id) {
            case "open":
                onOpenFolder?.();
                break;
            case "crop":
                onToggleCrop?.();
                break;
            case "send":
                onSendImage?.();
                break;
            default:
                break;
        }
    };

    return (
        <div className={className}>
            {toolIcons.map(({ id, icon, label }) => {
                const active = id === "crop" && isCropping;
                const disabled = id === "send" && !canSendImage;
                return (
                    <button
                        key={id}
                        type="button"
                        aria-label={label}
                        onClick={() => handleClick(id)}
                        disabled={disabled}
                        style={{
                            background: active ? "rgba(13, 110, 253, 0.1)" : "transparent",
                            border: active ? "1px solid #0d6efd" : "none",
                            padding: "8px",
                            cursor: disabled ? "not-allowed" : "pointer",
                            color: active ? "#0d6efd" : "inherit",
                            opacity: disabled ? 0.5 : 1,
                            borderRadius: "6px",
                        }}
                    >
                        <FontAwesomeIcon icon={icon} size="lg" aria-hidden />
                    </button>
                );
            })}
        </div>
    );
}

export default BasicTools;
