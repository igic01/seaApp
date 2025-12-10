import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { byPrefixAndName } from "@awesome.me/kit-KIT_CODE/icons";

const toolIcons = [
    { icon: byPrefixAndName.fas["plus"], label: "add" },
    { icon: byPrefixAndName.far["folder-open"], label: "open folder" },
    { icon: byPrefixAndName.fas["floppy-disk"], label: "save" },
    { icon: byPrefixAndName.fas["pen"], label: "draw" },
    { icon: byPrefixAndName.fas["crop"], label: "crop" },
    { icon: byPrefixAndName.far["file-lines"], label: "file lines" }
];

function BasicTools({ className, onOpenFolder, onToggleCrop, isCropping }) {
    return (
        <div className={className}>
            {toolIcons.map(({ icon, label }) => {
                const isCropButton = label === "crop";
                const active = isCropButton && isCropping;
                return (
                    <button
                        key={label}
                        type="button"
                        aria-label={label}
                        onClick={
                            label === "open folder"
                                ? onOpenFolder
                                : isCropButton
                                    ? onToggleCrop
                                    : undefined
                        }
                        style={{
                            background: active ? "rgba(13, 110, 253, 0.1)" : "transparent",
                            border: active ? "1px solid #0d6efd" : "none",
                            padding: "8px",
                            cursor: "pointer",
                            color: active ? "#0d6efd" : "inherit",
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

export default BasicTools
