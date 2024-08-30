const CSS_TOKEN = "css:";
const CLS_TOKEN = "cls:";
const ALT_TOKEN = "alt:";
const CAPTION_TOKEN = "caption:";
const CAP_TOKEN = "cap:";

/**
 * Replaces the default image rendering functionality by extracting
 * css classes and captions from the 'alt' text of an <img> and
 * adding it to the element.
 * @param img The HTMLImageElement to process.
 */
export function renderImageAttributes(img: HTMLImageElement) {
    // Check for a <figure class="mx-image"> (indicates this has already been processed)
    if (img.closest("figure.mx-image")) return;

    // Get the "alt" value and parse for properties
    const alt = img.getAttribute("alt");
    if (!alt) return;

    const cssClasses: string[] = [];
    let caption = "";
    let newAltValue = "";
    let replaceAlt = false;

    if (alt.contains(CSS_TOKEN) || alt.contains(CLS_TOKEN) || alt.contains(ALT_TOKEN) || alt.contains(CAPTION_TOKEN) || alt.contains(CAP_TOKEN)) {
        // Split using a semi-colon, trim, then filter out empty entries
        const altLines = alt
            .split(";")
            .map((line) => line.trim())
            .filter((line) => line);
        altLines.forEach((line) => {
            // Check for custom css styling
            if (line.startsWith(CSS_TOKEN)) {
                const cssClassStr = line.slice(CSS_TOKEN.length).trim();
                // Parse into array of classes
                if (cssClassStr) {
                    cssClasses.push(...cssClassStr.split(/,| /).filter((s) => s));
                    replaceAlt = true;
                }
            } else if (line.startsWith(CLS_TOKEN)) {
                const cssClassStr = line.slice(CLS_TOKEN.length).trim();
                // Parse into array of classes
                if (cssClassStr) {
                    cssClasses.push(...cssClassStr.split(/,| /).filter((s) => s));
                    replaceAlt = true;
                }
            }
            // Look for alt text that should stay when processing is done
            else if (line.startsWith(ALT_TOKEN)) {
                newAltValue = line.slice(ALT_TOKEN.length).trim();
                replaceAlt = true;
            }
            // Look for caption to be placed after image
            else if (line.startsWith(CAPTION_TOKEN)) {
                caption += ` ${line.slice(CAPTION_TOKEN.length).trim()}`;
                replaceAlt = true;
            } else if (line.startsWith(CAP_TOKEN)) {
                caption += ` ${line.slice(CAP_TOKEN.length).trim()}`;
                replaceAlt = true;
            }
        });
    } else {
        // No tokens, check if alt is just the file name
        let fileName = img.src;
        // Remove '?' if it's present
        const qMark = fileName.indexOf("?");
        if (qMark > -1) {
            fileName = fileName.slice(0, qMark);
        }
        if (!fileName.endsWith(alt)) {
            // process as caption, but leave alt
            caption = alt;
        }
    }

    // Replace alt if necessary
    if (replaceAlt) {
        // Replace the img[alt] with the new value
        img.removeAttribute("alt");
        if (newAltValue) {
            img.setAttribute("alt", newAltValue);
        }
    }

    // Get span holding the image
    const span = img.closest("span.image-embed") ?? img.parentElement;
    // Create a figure element
    const figure = span.createEl("figure", { cls: "mx-image" });
    // Create a container to hold the image
    const container = figure.createDiv();
    // Move img from current parent to figure
    container.appendChild(img);
    // Add the caption
    if (caption) {
        figure.createEl("figcaption", { text: caption.trim() });
    }
    // Set styling
    if (cssClasses.length > 0) {
        figure.addClasses(cssClasses);
    }
    if (img.hasAttribute("width")) {
        figure.style.width = img.getAttribute("width") + "px";
    }
}
