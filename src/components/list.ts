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
            dl.createEl("dt", { text: item.term });
            // Add the details (<dd>)
            item.details.forEach((detail) => {
                dl.createEl("dl", { text: detail });
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
    // Only process containers that have a single <p> child.
    // Anything else might indicate custom formatting and
    // should be ignored by this (for now).
    if (container.childNodes.length == 1) {
        const child = container.children[0] as HTMLElement;
        if (child.tagName.toLowerCase() == "p") {
            // Use innerHTML to split the text up by line breaks (<br>)
            const lines = child.innerHTML.split("<br>");
            // Clear container
            container.empty();

            let buildingList = false;
            let list: DescriptionList = new DescriptionList();
            let pLines: string[] = [];
            // Iterate through lines to build list(s). Any text not part of a list
            // (before or after) should be put in <p> tags.
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
                            const p = container.createEl("p");
                            // Join using a line break (<br>) and new line char
                            // (matches Obsidian behavior for multi-line text)
                            p.innerHTML = pLines.join("<br>\n");
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
                        list.items.push({
                            term: term,
                            details: details,
                        });
                    }
                    // Otherwise, add the line to pLines
                    else {
                        // First check if a list needs to be pushed to the container
                        if (buildingList) {
                            container.appendChild(list.generateHtmlElement());
                            // The reset for a new list
                            list = new DescriptionList();
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
                container.appendChild(list.generateHtmlElement());
            }
            // If there any left-over lines of text, push those into
            // a final <p> element.
            if (pLines.length > 0) {
                const p = container.createEl("p");
                // Join using a line break (<br>) and new line char
                // (matches Obsidian behavior for multi-line text)
                p.innerHTML = pLines.join("<br>\n");
            }
        }
    }
}

export function renderInlineDescriptionList(container: HTMLElement) {
    // Only process containers that have a single <p> child.
    // Anything else might indicate custom formatting and
    // should be ignored by this (for now).
    if (container.childNodes.length === 1) {
        const child = container.children[0] as HTMLElement;
        if (child.tagName.toLowerCase() === "p") {
            // Use innerHTML to split the text up by line breaks (<br>)
            const lines = child.innerHTML.split("<br>");
            // Clear container
            container.empty();

            let pLines: string[] = [];
            // Iterate through lines to build list(s). Any text not part of a list
            // (before or after) should be put in <p> tags.
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
                        const p = container.createEl("p");
                        // Join using a line break (<br>) and new line char
                        // (matches Obsidian behavior for multi-line text)
                        p.innerHTML = pLines.join("<br>\n");
                        pLines = [];
                    }

                    // Create a new list, split the line into the term/details,
                    // then add the list to the container.
                    const list = new DescriptionList();
                    list.items.push({
                        term: line.slice(0, index).trim(),
                        details: [line.slice(index + DLIST_INLINE_TOKEN.length).trim()],
                    });
                    container.appendChild(list.generateHtmlElement());
                }
                // Otherwise, add the line to pLines
                else {
                    pLines.push(line.trim());
                }
            }

            // If there any left-over lines of text, push those into
            // a final <p> element.
            if (pLines.length > 0) {
                const p = container.createEl("p");
                // Join using a line break (<br>) and new line char
                // (matches Obsidian behavior for multi-line text)
                p.innerHTML = pLines.join("<br>\n");
            }
        }
    }
}
