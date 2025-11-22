import { useState } from "react"
import Selection from "./Selection.jsx"
import BasicTools from "./BasicTools.jsx"
import styles from "./Sidebar.module.css"

function Sidebar() {
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

            <BasicTools className={styles.tools} />
        </div>
    )
}

export default Sidebar
