class DescriptionList {
    items: DescriptionListItem[];
    constructor() {
        this.items = [];
    }
    generateHtmlElement(): HTMLDListElement {
        // Set up the list (<dl>)
        const dl = createEl("dl");
        this.items.forEach((item) => {
            // Add the term (<dt>)
            const dt = dl.createEl("dt");
            dt.innerHTML = item.term;
            // Add the details (<dd>)
            item.details.forEach((detail) => {
                const dd = dl.createEl("dd");
                dd.innerHTML = detail;
            });
        });
        return dl;
    }
}
interface DescriptionListItem {
    term: string;
    details: string[];
}

export const DLIST_TOKEN = ": ";
export const DLIST_INLINE_TOKEN = "::";

export function renderDescriptionList(container: HTMLElement) {
    // Get all paragraph tags (<p>) in the container
    container.findAll("p").forEach((paragraph) => {
        // Get the parent of 'paragraph'
        const parent = paragraph.parentElement;
        // Set up 'lastEl' as a reference for where to insert new elements
        let lastEl = paragraph;
        // Use innerHTML to split the text up by line breaks (<br>)
        const lines = paragraph.innerHTML.split("<br>");
        // Iterate through lines to build list(s). Any text not part of a list
        // (before or after) should be put in <p> tags.
        let buildingList = false;
        let descriptionList: DescriptionList = new DescriptionList();
        let pLines: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Look for lines that don't start with ": "
            // (to not have to read backward)
            if (!line.trim().startsWith(DLIST_TOKEN)) {
                // Look for ": " on next line
                if (i + 1 < lines.length && lines[i + 1].trim().startsWith(DLIST_TOKEN)) {
                    // Start building the list
                    buildingList = true;
                    // If there is any text in pLines, push that to
                    // a <p> tag and add to the container
                    if (pLines.length > 0) {
                        const p = createEl("p");
                        // Join using a line break (<br>) and new line char
                        // (matches Obsidian behavior for multi-line text)
                        p.innerHTML = pLines.join("<br>\n");
                        // Insert after 'paragraph'
                        parent.insertAfter(p, lastEl);
                        lastEl = p;
                        // Reset pLines
                        pLines = [];
                    }
                    // Set line as term
                    const term = line.trim();
                    // Get details
                    const details: string[] = [];
                    while (i + 1 < lines.length) {
                        const next = lines[i + 1].trim();
                        if (next.startsWith(DLIST_TOKEN)) {
                            details.push(next.slice(1).trim());
                            i++;
                        } else {
                            break;
                        }
                    }
                    // Add to list
                    descriptionList.items.push({
                        term: term,
                        details: details,
                    });
                }
                // Otherwise, add the line to pLines
                else {
                    // First check if a list needs to be pushed to the container
                    if (buildingList) {
                        const list = descriptionList.generateHtmlElement();
                        parent.insertAfter(list, lastEl);
                        lastEl = list;
                        // Then reset for a new list
                        descriptionList = new DescriptionList();
                        buildingList = false;
                    }
                    // Finally, push the line to pLines
                    pLines.push(line.trim());
                }
            }
            // Otherwise, add the line to pLines
            else {
                pLines.push(line.trim());
            }
        }

        // Check for any remaining lists (happens if the list
        // was the last thing in the container).
        if (buildingList) {
            const list = descriptionList.generateHtmlElement();
            parent.insertAfter(list, lastEl);
            lastEl = list;
        }
        // If there any left-over lines of text, push those into
        // a final <p> element.
        if (pLines.length > 0) {
            const p = createEl("p");
            // Join using a line break (<br>) and new line char
            // (matches Obsidian behavior for multi-line text)
            p.innerHTML = pLines.join("<br>\n");
            // Insert after 'paragraph'
            parent.insertAfter(p, lastEl);
        }
        // Finally, remove 'paragraph'
        parent.removeChild(paragraph);
    });
}

export function renderInlineDescriptionList(container: HTMLElement) {
    // Get all paragraph tags (<p>) in the container
    container.findAll("p").forEach((paragraph) => {
        // Get the parent of 'paragraph'
        const parent = paragraph.parentElement;
        // Set up 'lastEl' as a reference for where to insert new elements
        let lastEl = paragraph;
        // Use innerHTML to split the text up by line breaks (<br>)
        const lines = paragraph.innerHTML.split("<br>");
        // Iterate through lines to build list(s). Any text not part of a list
        // (before or after) should be put in <p> tags.
        let pLines: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Only the first occurrence of "::" is important
            // (surrounding spaces don't matter)
            const index = line.indexOf(DLIST_INLINE_TOKEN);
            // There needs to be at least one character before
            // the first occurrence of the inline token
            if (index > 0) {
                // If there is any text in pLines, push that to
                // a <p> tag and add to the container
                if (pLines.length > 0) {
                    const p = createEl("p");
                    // Join using a line break (<br>) and new line char
                    // (matches Obsidian behavior for multi-line text)
                    p.innerHTML = pLines.join("<br>\n");
                    // Insert after 'paragraph'
                    parent.insertAfter(p, lastEl);
                    lastEl = p;
                    // Reset pLines
                    pLines = [];
                }
                // Create a new list, split the line into the term/details,
                // then add the list to the container.
                const descriptionList = new DescriptionList();
                descriptionList.items.push({
                    term: line.slice(0, index).trim(),
                    details: [line.slice(index + DLIST_INLINE_TOKEN.length).trim()],
                });
                const list = descriptionList.generateHtmlElement();
                parent.insertAfter(list, lastEl);
                lastEl = list;
            }
            // Otherwise, add the line to pLines
            else {
                pLines.push(line.trim());
            }
        }
        // If there any left-over lines of text, push those into
        // a final <p> element.
        if (pLines.length > 0) {
            const p = createEl("p");
            // Join using a line break (<br>) and new line char
            // (matches Obsidian behavior for multi-line text)
            p.innerHTML = pLines.join("<br>\n");
            // Insert after 'paragraph'
            parent.insertAfter(p, lastEl);
        }
        // Finally, remove 'paragraph'
        parent.removeChild(paragraph);
    });
}
