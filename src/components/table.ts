import Token from "markdown-it/lib/token";
import { MarkdownPostProcessorContext, MarkdownRenderer } from "obsidian";
import MarkdownExtended from "src/main";

export const TABLE_TOKEN = "--mx-table";
export const CAPTION_TOKEN = "caption:";
export const MARKDOWN_IT_OPTIONS = { html: true };

export function renderTable(container: HTMLElement, plugin: MarkdownExtended, context: MarkdownPostProcessorContext) {
    const sourcePath = typeof context == "string" ? context : context?.sourcePath ?? this.app.workspace.getActiveFile()?.path ?? "";

    // Get the markdown and split into lines
    const src = getSourceMarkdown(container, context);
    const lines = src.split("\n");

    // Easy mode: 'container' has only a table or starts with a table
    // (if items exist after the table, don't try to maintain them)
    if (lines[0].trim().startsWith(TABLE_TOKEN)) {
        // Get css classes
        const cssStr = lines[0].trim().slice(TABLE_TOKEN.length);
        // Split by separators, remove(filter) empty entries
        const cssClasses = cssStr.split(/;|,| /).filter((s) => s);

        let firstLine = 1;

        // Look for caption
        let caption = null;
        if (lines.length > 1 && lines[1].startsWith(CAPTION_TOKEN)) {
            // Set caption
            caption = lines[1].slice(CAPTION_TOKEN.length).trim();

            // Adjust first table line
            firstLine = 2;
        }

        // Rejoin the remaining lines and parse with MarkdownIt
        const tableMd = lines.slice(firstLine).join("\n").trim();
        // Generate table element from the markdown
        const table = getTableFromMarkdown(tableMd, plugin, sourcePath);
        if (table) {
            // Set the css for the table
            table.addClasses(cssClasses);
            if (caption) {
                const captionEl = createEl("caption");
                MarkdownRenderer.render(plugin.app, caption, captionEl, sourcePath, plugin);
                const child = captionEl.firstElementChild;
                if (child) {
                    // Get ride of the <p> element and put its children directly in the cell
                    if (child instanceof HTMLParagraphElement) {
                        child.replaceWith(...child.childNodes);
                    }
                }
                table.prepend(captionEl);
            }
            // Replace all children in the container
            container.replaceChildren(table);
        }
    }
    // Hard mode: 'container' is a callout with a table in it
    else if (lines[0].trim().match(/^>*\s?\[!/)) {
        // Look through each line for table markers,
        // put all following table lines into an array,
        // then create table. Iterating over all lines
        // allows finding multiple tables.
        const tables: HTMLElement[] = [];
        let cssClasses = null;
        let caption = null;
        let tableLines = [];
        let inTable = false;
        for (let i = 0; i < lines.length; i++) {
            let regex = new RegExp(`^[>\\s]*(${TABLE_TOKEN}.*)`, "i");
            let match = lines[i].trim().match(regex);
            if (match) {
                inTable = true;
                // Get table delcaration
                const tableDec = match[1];
                // Get css classes
                const cssStr = tableDec.trim().slice(TABLE_TOKEN.length);
                // Split by separators, remove(filter) empty entries
                cssClasses = cssStr.split(/;|,| /).filter((s) => s);
                continue;
            }
            if (inTable) {
                // Only check for caption if it hasn't been found yet
                if (!caption) {
                    regex = new RegExp(`^[>\\s]*(${CAPTION_TOKEN}.*)`);
                    match = lines[i].trim().match(regex);
                    if (match) {
                        caption = match[1].slice(CAPTION_TOKEN.length).trim();
                        continue;
                    }
                }
                // Check if table row
                match = lines[i].trim().match(/^[>\s]*(\|.*)/);
                if (match) {
                    tableLines.push(match[1]);
                }
                // No match or last line indicates to close table
                if (!match || i == lines.length - 1) {
                    // Join table lines to create markdown
                    const tableMd = tableLines.join("\n").trim();
                    // Get table element
                    const table = getTableFromMarkdown(tableMd, plugin, sourcePath);
                    if (table) {
                        // Set the css for the table
                        table.addClasses(cssClasses);
                        if (caption) {
                            const captionEl = createEl("caption");
                            MarkdownRenderer.render(plugin.app, caption, captionEl, sourcePath, plugin);
                            const child = captionEl.firstElementChild;
                            if (child) {
                                // Get ride of the <p> element and put its children directly in the cell
                                if (child instanceof HTMLParagraphElement) {
                                    child.replaceWith(...child.childNodes);
                                }
                            }
                            table.prepend(captionEl);
                        }
                        // Push to tables array
                        tables.push(table);
                    }
                    // Reset all variables
                    cssClasses = null;
                    caption = null;
                    tableLines = [];
                    inTable = false;
                }
            }
        }

        // Locate each element that has a table by getting all <p>
        // elements and checking if it has a table declaration.
        container.findAll("p").forEach((p) => {
            if (p.textContent.trim().match(/^[>\s]*--mx-table/i)) {
                // Get next table from array
                const table = tables.shift();
                // Replace paragraph with table
                p.replaceWith(table);
            }
        });
    }
}

function getTableFromMarkdown(tableMd: string, plugin: MarkdownExtended, sourcePath: string): HTMLElement {
    // Tokenize the table markdown, then process the tokens
    // to get the only the text within the cells
    const tokens = plugin.md.parse(tableMd, {}),
        MarkdownTextInTable = processTokens(tokens);

    // Render the tokens to get the html
    const html = plugin.md.renderer.render(tokens, MARKDOWN_IT_OPTIONS, {});
    // Create a temp container and set the html
    const temp = createDiv();
    temp.innerHTML = html;

    // Get all the cells that have an MX_## id
    for (const el of temp.findAll("[id^=MX_]")) {
        const cell = el as HTMLElement;
        // Get index (as a string) from the cell
        const indexStr = cell.id.substring(3); // Skip the "MX_"

        // Remove the id attribute
        cell.removeAttribute("id");

        // Validate the indexStr
        if (!Number.isInteger(+indexStr)) continue;
        // Then get the text
        const cellText = MarkdownTextInTable[+indexStr];
        if (!cellText) continue;

        // Clear the cell then use Obsidian's
        // renderer to process the text
        cell.empty();
        MarkdownRenderer.render(plugin.app, cellText, cell, sourcePath, plugin);

        const child = cell.firstElementChild;
        if (child) {
            // Copy attributes from child up to cell
            ["style", "class", "id"].forEach((attr) => copyAttribute(attr, child, cell));
            if (child instanceof HTMLElement) {
                Object.assign(cell.dataset, child.dataset);
            }
            // Get ride of the <p> element and put its children directly in the cell
            if (child instanceof HTMLParagraphElement) {
                child.replaceWith(...child.childNodes);
            }
        }
    }

    // return the table element
    return temp.find("table");
}

const elsToPreserveText = ["td", "th", "caption"];
function processTokens(tokens: Token[]): string[] {
    const srcMarkdown: string[] = [];

    // Iterate through tokens to extract markdown text from table cells
    for (let i = 0; i < tokens.length; i++) {
        // Get the token
        const token = tokens[i];
        // Look only for opening <td>, <th>, and <caption> tags
        if (elsToPreserveText.includes(token.tag) && token.nesting === 1) {
            // Get the next token
            let iInline = i,
                nextToken = tokens[++iInline];

            // Move through inline tokens until we hit the closing tag
            while (!elsToPreserveText.includes(nextToken.tag) || nextToken.nesting !== -1) {
                let content = "";
                //Look for content
                if (nextToken.type === "inline") {
                    content = nextToken.content;
                } else if (nextToken.type === "fence") {
                    content = "```" + nextToken.info + "\n" + nextToken.content + "\n" + "```";
                } else if (nextToken.type === "code_block") {
                    content = nextToken.content.replace(/^/gm, "    ");
                }

                // Push the content to the array and set an Id for
                // the token (this will be referenced later)
                if (content) {
                    const index = srcMarkdown.push(content) - 1;
                    token.attrSet("id", `MX_${index}`);
                    break;
                }
                nextToken = tokens[++iInline];
            }

            // Move i forward past the inline tokens since
            // they've already been processed
            i = iInline;
        }
    }

    return srcMarkdown;
}

function getSourceMarkdown(el: HTMLElement, context: MarkdownPostProcessorContext): string | null {
    const info = context.getSectionInfo(el);
    if (info) {
        return info.text
            .split("\n")
            .slice(info.lineStart, info.lineEnd + 1)
            .join("\n");
    } else {
        return null;
    }
}

function copyAttribute(attr: string, from: Element, to: Element) {
    const val = from.getAttribute(attr);
    if (val) {
        to.setAttribute(attr, val);
    }
}
