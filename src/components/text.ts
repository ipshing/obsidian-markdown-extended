import { Editor } from "obsidian";

export function renderMarkdownToken<K extends keyof HTMLElementTagNameMap>(element: HTMLElement, token: string, tag: K) {
    // Validate
    if (!element || !element.hasChildNodes()) return;

    // Rules for token replacement are:
    //   - Tokens work in pairs
    //   - Markdown formatting may occur between two tokens BUT
    //     it must be fully contained between two tokens.
    //   - Tokens that do not have a matching pair must remain unchanged

    let orphan: { node: ChildNode; index: number };
    for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i];
        // Look for tokens inside #text nodes
        if (child.nodeName == "#text" && child.textContent.contains(token)) {
            // First check if there's an orphan that needs connecting
            if (orphan) {
                // Get the index of the token
                let i = orphan.node.textContent.indexOf(token);
                // Create a temporary container to hold processed nodes
                const temp = createDiv();
                // Add the text before the token
                temp.append(orphan.node.textContent.slice(0, i));
                // Create a new element using 'tag' and add the text after the token
                const tokenEl = temp.createEl(tag, { text: orphan.node.textContent.slice(i + token.length) });
                // Add all nodes after orphan (but before child) to tokenEl.
                // This automatically removes them from 'element'.
                while (orphan.node.nextSibling && orphan.node.nextSibling != child) {
                    tokenEl.append(orphan.node.nextSibling);
                }
                // Get the index of the token in child
                i = child.textContent.indexOf(token);
                // Add the text before the token to tokenEl
                tokenEl.append(child.textContent.slice(0, i));
                // Add the text after the token to temp
                temp.append(child.textContent.slice(i + token.length));
                // Track the last child of temp
                const last = temp.lastChild;
                // Push everyhing from temp to after child
                child.after(...temp.childNodes);
                // Remove orphan and child
                element.removeChild(orphan.node);
                element.removeChild(child);
                // Clear orphan
                orphan = null;
                // Set i = the index of 'last'
                i = element.indexOf(last);
                // Loop
                continue;
            }

            const result = replaceTokensInText(child, token, tag);
            if (result.nodes) {
                // Add result.nodes after child, then remove child
                child.after(...result.nodes);
                element.removeChild(child);
                // Set i to the index of the last node in result.nodes
                i = element.indexOf(result.nodes.last());
            }
            if (result.orphan) {
                // Track orphan
                orphan = {
                    node: result.orphan,
                    index: element.indexOf(result.orphan),
                };
            }
        }
        // Only look at the title text and content of a callout
        else if (child instanceof HTMLElement && child.hasClass("callout")) {
            const title = child.find(":scope > .callout-title > .callout-title-inner");
            if (title && title.hasChildNodes()) {
                renderMarkdownToken(title, token, tag);
            }
            const content = child.find(":scope > .callout-content");
            if (content && content.hasChildNodes()) {
                renderMarkdownToken(content, token, tag);
            }
        }
        // Cast to HTMLElement to avoid #text nodes
        // that don't include the token.
        else if (child instanceof HTMLElement && child.hasChildNodes()) {
            // Recurse to look inside element
            renderMarkdownToken(child, token, tag);
        }
    }
}

interface ReplacementResult {
    nodes?: ChildNode[];
    orphan?: ChildNode;
}

function replaceTokensInText<K extends keyof HTMLElementTagNameMap>(textNode: ChildNode, token: string, tag: K): ReplacementResult {
    const result: ReplacementResult = {};
    // Create a temporary container to hold processed nodes
    const temp = createDiv();
    // Extract the text
    const text = textNode.textContent;
    // Look for token
    const i = text.indexOf(token);
    if (i == -1) return result;
    // Check to make sure the closing tag isn't also in this node
    const j = text.indexOf(token, i + token.length);
    if (j > i) {
        // Split up the node, placing the text between the tokens
        // in a new element using 'tag'. Add the nodes to temp.
        temp.append(text.slice(0, i));
        temp.createEl(tag, { text: text.slice(i + token.length, j) });
        temp.append(text.slice(j + token.length));

        // Check the last node in temp for the token and recurse if found
        if (temp.lastChild.textContent.contains(token)) {
            const res = replaceTokensInText(temp.lastChild, token, tag);
            if (res.nodes) {
                // Remove the last child and replace with res.nodes
                temp.removeChild(temp.lastChild);
                temp.append(...res.nodes);
            }
            if (res.orphan) {
                // Set to result.orphan
                result.orphan = res.orphan;
            }
        }

        // Put all nodes from temp into result.nodes
        result.nodes = [];
        result.nodes.push(...temp.childNodes);
    }
    // Otherwise note the node as an orphan
    else {
        result.orphan = textNode;
    }

    return result;
}

export function toggleToken(editor: Editor, token: string) {
    // Save these to return to the original selection when done
    const originalFrom = editor.getCursor("from");
    const originalTo = editor.getCursor("to");
    // Copy current positions for checking token presence
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    // If from and to are the same, move them to the nearest non alpha-numeric character
    if (editor.posToOffset(originalFrom) == editor.posToOffset(originalTo)) {
        // Move 'from' back to nearest non-alpha-numeric char or beginning of line
        while (from.ch > 0 && isAlphaNumeric(editor.getRange({ line: from.line, ch: from.ch - 1 }, from))) {
            from.ch -= 1;
        }
        // Move 'to' forward to nearest non-alphanumeric char or end of line
        const toLine = editor.getLine(to.line);
        while (to.ch < toLine.length && isAlphaNumeric(editor.getRange(to, { line: to.line, ch: to.ch + 1 }))) {
            to.ch += 1;
        }
        // Set selection (easier for replacing later on than using setRange)
        editor.setSelection(from, to);
    }
    // Get the text
    const text = editor.getSelection();

    // Get the length of text equal to the token length before and after the selection
    const before = editor.getRange({ line: from.line, ch: from.ch - token.length }, from);
    const after = editor.getRange(to, { line: to.line, ch: to.ch + token.length });

    // Offsets used to determine how much original selection should shift by
    let fromOffset = 0,
        toOffset = 0;

    // First check if token is within the selection
    if (text.startsWith(token) && text.endsWith(token) && text.length >= token.length * 2) {
        // Remove token from both sides
        editor.replaceSelection(text.slice(token.length, text.length - token.length));
        // Only need to shift the end position
        toOffset -= token.length * 2; // times 2 because the token was removed from start AND end
    }
    // No token before or after
    else if (before != token && after != token) {
        // Add token to start and end
        editor.replaceSelection(token + text + token);
        // Shift start/end positions
        fromOffset += token.length;
        toOffset += token.length;
    }
    // Token after, but not before
    else if (before != token && after == token) {
        // Add token to start
        editor.replaceSelection(token + text);
        // Shift start/end positions
        fromOffset += token.length;
        toOffset += token.length;
    }
    // Token before, but not after
    else if (before == token && after != token) {
        // Add token to end
        editor.replaceSelection(text + token);
        // No need to shift cursor/selection
    }
    // Token before and after
    else if (before == token && after == token) {
        // Remove token from both sides
        editor.setSelection({ line: from.line, ch: from.ch - token.length }, { line: to.line, ch: to.ch + token.length });
        editor.replaceSelection(text);
        // Shift start/end positions
        fromOffset -= token.length;
        toOffset -= token.length;
    }

    // Re-select original selection
    editor.setSelection({ line: originalFrom.line, ch: originalFrom.ch + fromOffset }, { line: originalTo.line, ch: originalTo.ch + toOffset });
}

function isAlphaNumeric(str: string) {
    let code;
    for (let i = 0; i < str.length; i++) {
        code = str.charCodeAt(i);
        if (
            !(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)
        ) {
            // lower alpha (a-z)
            return false;
        }
    }
    return true;
}
