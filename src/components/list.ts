export const DLIST_TOKEN = ": ";
export const DLIST_REGEX = new RegExp(`^\\s*${DLIST_TOKEN}.+$`, "im");
export const DLIST_INLINE_TOKEN = "::";
export const DLIST_INLINE_REGEX = new RegExp(`^.+\\s+${DLIST_INLINE_TOKEN}\\s*.*$`, "im");

export function renderDescriptionList(container: HTMLElement) {
    // Get all paragraph tags (<p>) in the container
    const paragraphs = container.findAll("p");
    for (const paragraph of paragraphs) {
        // Skip paragraphs that don't have the token
        if (!paragraph.textContent.match(DLIST_REGEX)) continue;

        // Get the parent of 'paragraph'
        const parent = paragraph.parentElement;
        // Set up lastEl as a reference for where to insert new elements
        let lastEl = paragraph;
        // Delcare the description list elements outside of the loop
        let dl = createEl("dl");
        let dt = dl.createEl("dt");
        let dd: HTMLElement;
        let currentPart = dt;
        // Iterate using a while loop and the firstChild. Because we're
        // appending the children to other collections, they get removed
        // from 'paragraph' which messes with for loops.
        while (paragraph.firstChild) {
            const child = paragraph.firstChild;
            // Line breaks (<br>) are the key dividers and determine
            // whether to keep buildling the current item/list
            if (child.nodeName == "BR") {
                // If the next node is a details node, remove the <br>
                // and loop so it can be added to the current list.
                if (child.nextSibling && child.nextSibling.nodeName == "#text" && child.nextSibling.textContent.trimStart().startsWith(DLIST_TOKEN)) {
                    paragraph.removeChild(child);
                    continue;
                }
                // If currentPart is a <dt> then the terms are still
                // being built. Start a new dt, remove the <br>,
                // then loop.
                if (currentPart.nodeName == "DT") {
                    dt = dl.createEl("dt");
                    currentPart = dt;
                    paragraph.removeChild(child);
                    continue;
                }
                // If there are no more details, push the current list
                parent.insertAfter(dl, lastEl);
                lastEl = dl;
                // Reset the list so it doesn't get caught after
                // processing the paragraph.
                dl = null;
                // Check if there are any more tokens left
                if (paragraph.textContent.match(DLIST_REGEX)) {
                    // Create a new list, remove this <br>, then loop
                    dl = createEl("dl");
                    dt = dl.createEl("dt");
                    currentPart = dt;
                    paragraph.removeChild(child);
                    continue;
                }
                // No tokens means the remaining nodes are not part of the list.
                // Create a paragraph to hold the nodes, then push it to the parent.
                const temp = createEl("p");
                while (child.nextSibling) {
                    temp.append(child.nextSibling);
                }
                parent.insertAfter(temp, lastEl);
                lastEl = temp;
                // Finally, remove this <br>
                paragraph.removeChild(child);
            }
            // #text nodes that start with the token mark description details
            else if (child.nodeName == "#text" && child.textContent.trimStart().startsWith(DLIST_TOKEN)) {
                // Initialize a new dd
                dd = dl.createEl("dd");
                currentPart = dd;
                // Take anything after the token and put it in dd
                dd.append(child.textContent.trimStart().slice(DLIST_TOKEN.length).replace("\n", ""));
                // Look at the subsequent nodes until a line break.
                // Use a while loop because append will remove the
                // node from the paragraph automatically.
                while (child.nextSibling && child.nextSibling.nodeName != "BR") {
                    dd.append(child.nextSibling);
                }
                // Remove the child from paragraph
                paragraph.removeChild(child);
            }
            // All other nodes should get pushed into the description term
            else {
                dt.append(child);
            }
        }

        // If there is a list, push it
        if (dl) {
            parent.insertAfter(dl, lastEl);
            lastEl = dl;
        }
        // Finally, remove paragraph
        parent.removeChild(paragraph);
    }
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
        let buildingItem = false;
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
                    let moreItems = false;
                    let next = child.nextSibling;
                    while (next && next.nodeName != "BR") {
                        if (next.nodeName == "#text" && next.textContent.contains(DLIST_INLINE_TOKEN)) {
                            moreItems = true;
                        }
                        next = next.nextSibling;
                    }
                    if (!moreItems) {
                        // No subsequent items, push list
                        parent.insertAfter(dl, lastEl);
                        lastEl = dl;
                        // Reset the list
                        dl = null;
                    }
                    // Regardless, reset dt and dd
                    dt = null;
                    dd = null;
                    buildingItem = false;
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
                buildingItem = true;

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
                dt.append(child.textContent.slice(0, i).trimEnd());
                // Put everything after into dd
                dd.append(child.textContent.slice(i + DLIST_INLINE_TOKEN.length).trimStart());
                // Remove the child from paragraph
                paragraph.removeChild(child);
            }
            // While buildingItem is true, put everything
            // in the details.
            else if (buildingItem) {
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
