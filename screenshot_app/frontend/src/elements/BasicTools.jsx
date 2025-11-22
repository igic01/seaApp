import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { byPrefixAndName } from "@awesome.me/kit-KIT_CODE/icons";

const toolIcons = [
    { icon: byPrefixAndName.fas["plus"], label: "add" },
    { icon: byPrefixAndName.far["folder-open"], label: "open folder" },
    { icon: byPrefixAndName.fas["floppy-disk"], label: "save" },
    { icon: byPrefixAndName.fas["pen"], label: "draw" },
    { icon: byPrefixAndName.fas["rotate-left"], label: "undo" },
    { icon: byPrefixAndName.fas["crop"], label: "crop" },
    { icon: byPrefixAndName.far["file-lines"], label: "file lines" }
];

function BasicTools({ className }) {
    return (
        <div className={className}>
            {toolIcons.map(({ icon, label }) => (
                <FontAwesomeIcon key={label} icon={icon} size="lg" aria-label={label} />
            ))}
        </div>
    );
}

export default BasicTools