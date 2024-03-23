import { Editor } from "obsidian";

export function renderMarkdownToken<K extends keyof HTMLElementTagNameMap>(element: HTMLElement, token: string, tag: K) {
    // Validate
    if (!element || !element.hasChildNodes()) return;

    element.findAll(":scope > *").forEach((child) => {
        if (child.hasClass("callout")) {
            // Only look at .callout-title-inner and .callout-content
            const title = child.find(":scope > .callout-title > .callout-title-inner");
            if (title) {
                replaceToken(title, token, tag);
            }
            const content = child.find(":scope > .callout-content");
            if (content) {
                // Recurse the content node (in case of nested callouts/tables)
                renderMarkdownToken(content, token, tag);
            }
        } else {
            // Process
            replaceToken(child, token, tag);
        }
    });
}

function replaceToken<K extends keyof HTMLElementTagNameMap>(element: HTMLElement, token: string, tag: K) {
    // Validate arguments
    if (!element || !element.hasChildNodes()) return;

    let html = "",
        index = -1,
        inside = false;
    const open = `<${tag}>`;
    const close = `</${tag}>`;

    // Process each child
    element.childNodes.forEach((child: HTMLElement) => {
        if (child.nodeName == "#text") {
            // Get the text
            let text = child.nodeValue;
            // Look for double quotes
            index = text.indexOf(token);
            // Process
            while (index > -1) {
                inside = !inside;
                const before = text.slice(0, index);
                const after = text.slice(index + token.length);
                text = `${before}${inside ? open : close}${after}`;
                // Look for next double quote
                index = text.indexOf(token, index + token.length);
            }
            html += text;
        } else {
            // Just put into html
            html += child.outerHTML;
        }
    });

    // Look for last opening tag and make sure there's a following closing or revert it
    index = html.lastIndexOf(open);
    if (index > -1) {
        const match = html.lastIndexOf(close);
        if (match > -1 && match < index) {
            const before = html.slice(0, index);
            const after = html.slice(index + token.length + 1);
            html = `${before}${token}${after}`;
        }
    }

    // Replace element html
    element.innerHTML = html;
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
