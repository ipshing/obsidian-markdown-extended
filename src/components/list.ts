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
    const paragraphs = container.findAll("p");
    for (const paragraph of paragraphs) {
        // Skip paragraphs that don't have the token
        if (!paragraph.textContent.contains(DLIST_INLINE_TOKEN)) continue;

        // Get the parent of 'paragraph'
        const parent = paragraph.parentElement;
        // Set up lastEl as a reference for where to insert new elements
        let lastEl = paragraph;
        // Set up a temp paragraph to hold nodes while iterating
        let temp = createEl("p");
        // Set up lastBR as a way to mark split points in temp
        let lastBR: HTMLBRElement;
        // Delcare the description list elements outside of the loop
        let dl: HTMLDListElement, dt: HTMLElement, dd: HTMLElement;
        // Iterate using a while loop and the firstChild. Because we're
        // appending the children to other collections, they get removed
        // from 'paragraph' which messes with for loops.
        while (paragraph.firstChild) {
            const child = paragraph.firstChild;
            // Line breaks (<br>) are the key dividers
            if (child.nodeName == "BR") {
                // Check for list in progress (not null)
                if (dl) {
                    // Look at following siblings until next <br>.
                    // If another term/details pair is found,
                    // don't push the list just yet.
                    let found = false;
                    let next = child.nextSibling;
                    while (next && next.nodeName != "BR") {
                        if (next.nodeName == "#text" && next.textContent.contains(DLIST_INLINE_TOKEN)) {
                            found = true;
                        }
                        next = next.nextSibling;
                    }
                    if (found) {
                        // Reset dt and dd to prep for new term/details
                        dt = null;
                        dd = null;
                    } else {
                        // No subsequent term, push list
                        parent.insertAfter(dl, lastEl);
                        lastEl = dl;
                        // Reset all list items
                        dl = null;
                        dt = null;
                        dd = null;
                    }
                }
                // Add the line break to temp
                temp.append(child);
                // Track this <br> in lastBR. This will help with
                // identifying what goes into the dl below.
                lastBR = child as HTMLBRElement;
            }
            // #text nodes that contain the token are the indicator for a list
            else if (child.nodeName == "#text" && child.textContent.contains(DLIST_INLINE_TOKEN)) {
                // Create a new list with a dt and dd
                if (dl == null) dl = createEl("dl");
                dt = dl.createEl("dt");
                dd = dl.createEl("dd");

                // Check for a <br> in temp. Everything before goes into a <p>
                // in the parent. Everything after goes into the <dt>.
                if (lastBR) {
                    while (lastBR.nextSibling) {
                        // Push to dt (automatically removes from temp)
                        dt.append(lastBR.nextSibling);
                    }
                    // Clear any leading/trailing line breaks from temp
                    while (temp.firstChild && temp.firstChild.nodeName == "BR") temp.removeChild(temp.firstChild);
                    while (temp.lastChild && temp.lastChild.nodeName == "BR") temp.removeChild(temp.lastChild);
                    // If there are still nodes left, push temp
                    if (temp.hasChildNodes()) {
                        parent.insertAfter(temp, lastEl);
                        lastEl = temp;
                    }
                    // Reset lastBR
                    lastBR = null;
                }
                // Othewrise, put everything from temp into the <dt>
                else {
                    temp.childNodes.forEach((node) => {
                        dt.append(node);
                    });
                }
                // Reset temp
                temp = createEl("p");

                // Split the #text node around the token
                const i = child.textContent.indexOf(DLIST_INLINE_TOKEN);
                // Put everything before into dt
                dt.append(child.textContent.slice(0, i).trim());
                // Put everything after into dd
                dd.append(child.textContent.slice(i + DLIST_INLINE_TOKEN.length).trim());
                // Remove the child from paragraph
                paragraph.removeChild(child);
            }
            // If dl has a value, a list is being built;
            // everything goes in the list
            else if (dl) {
                if (dd == null) {
                    // This shouldn't happen, but just in case,
                    // create a new dd and add it to dl.
                    dd = dl.createEl("dd");
                }
                // Append child to dd
                dd.append(child);
            }
            // For now, everything that's not a #text element should not
            // be checked. Just put it in temp until a token is found.
            else {
                temp.append(child);
            }
        }

        // If there is a list, push it
        if (dl) {
            parent.insertAfter(dl, lastEl);
            lastEl = dl;
        }
        // If there is anything left in temp, push it
        if (temp.hasChildNodes()) {
            // If the first or last nodes are line breaks, remove them
            while (temp.firstChild && temp.firstChild.nodeName == "BR") temp.removeChild(temp.firstChild);
            while (temp.lastChild && temp.lastChild.nodeName == "BR") temp.removeChild(temp.lastChild);
            // If there are still nodes left, push temp
            if (temp.hasChildNodes()) {
                parent.insertAfter(temp, lastEl);
            }
        }
        // Finally, remove paragraph
        parent.removeChild(paragraph);
    }
}
