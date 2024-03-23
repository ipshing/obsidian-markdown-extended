import { MarkdownPostProcessorContext, Plugin } from "obsidian";
import { valid, lt } from "semver";
import { MarkdownExtendedSettingsTab } from "./settings";
import { renderMarkdownToken, toggleToken } from "./components/text";
import { DLIST_INLINE_TOKEN, DLIST_TOKEN, renderDescriptionList, renderInlineDescriptionList } from "./components/list";

interface MarkdownExtendedSettings {
    version: string;
    previousVersion: string;
    renderImageProperties: boolean;
    renderDLists: boolean;
    renderInlineDLists: boolean;
    renderInlineQuotes: boolean;
    renderSubscript: boolean;
    renderSuperscript: boolean;
}

const DEFAULT_SETTINGS: MarkdownExtendedSettings = {
    version: "",
    previousVersion: "",
    renderImageProperties: true,
    renderDLists: true,
    renderInlineDLists: true,
    renderInlineQuotes: true,
    renderSubscript: true,
    renderSuperscript: true,
};

const QUOTE_TOKEN = '""';
const SUB_TOKEN = "~";
const SUP_TOKEN = "^";
const CSS_TOKEN = "css:";
const CLS_TOKEN = "cls:";
const ALT_TOKEN = "alt:";
const CAPTION_TOKEN = "caption:";
const CAP_TOKEN = "cap:";

export default class MarkdownExtended extends Plugin {
    settings: MarkdownExtendedSettings;
    private imageObservers: MutationObserver[];

    async onload() {
        this.imageObservers = [];

        // Load settings
        await this.loadSettings();
        // Check version
        await this.runVersionCheck();
        // Set up settings tab
        this.addSettingTab(new MarkdownExtendedSettingsTab(this.app, this));

        // Set up processor to check containers
        this.registerMarkdownPostProcessor(this.processContainers.bind(this));

        // Add commands
        this.addCommand({
            id: "toggle-quote",
            name: "Toggle Quote",
            icon: "quote",
            editorCallback: (editor) => {
                toggleToken(editor, QUOTE_TOKEN);
            },
        });
        this.addCommand({
            id: "toggle-subscript",
            name: "Toggle Subscript",
            icon: "subscript",
            editorCallback: (editor) => {
                toggleToken(editor, SUB_TOKEN);
            },
        });
        this.addCommand({
            id: "toggle-superscript",
            name: "Toggle Superscript",
            icon: "superscript",
            editorCallback: (editor) => {
                toggleToken(editor, SUP_TOKEN);
            },
        });

        console.log("Markdown Extended loaded");
    }

    onunload() {
        console.log("Markdown Extended unloaded");
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async runVersionCheck() {
        // Check previous version
        if (!valid(this.settings.version)) this.settings.version = "0.1.0";
        if (lt(this.settings.version, this.manifest.version)) {
            // Run updates here

            // Update version properties in settings
            this.settings.previousVersion = this.settings.version;
            this.settings.version = this.manifest.version;
            await this.saveSettings();
        }
    }

    addObserver(observer: MutationObserver) {
        if (!this.imageObservers) {
            this.imageObservers = [];
        }
        this.imageObservers.push(observer);
    }
    removeObserver(observer: MutationObserver) {
        observer.disconnect();
        if (this.imageObservers) {
            this.imageObservers.remove(observer);
        }
    }

    processContainers(container: HTMLElement, context: MarkdownPostProcessorContext) {
        // Ignore frontmatter
        if (container.find(".frontmatter")) return;

        // Ignore empty containers
        if (!container.hasChildNodes()) return;

        // Set up observers for .internal-embed elements to format them
        // after the embedded content has been loaded.
        if (this.settings.renderImageProperties) {
            container.findAll(".internal-embed").forEach((el) => {
                const observer = new MutationObserver((mutations, observer) => {
                    for (const mutation of mutations) {
                        const embedContainer = mutation.target as HTMLElement;
                        // Make sure content is an image and is loaded
                        if (embedContainer.matches(".image-embed.is-loaded")) {
                            // Format image
                            this.renderEmbeddedImage(embedContainer);
                        }
                    }

                    // Clean up
                    this.removeObserver(observer);
                });
                observer.observe(el, {
                    attributes: true,
                    attributeFilter: ["class"],
                });

                this.addObserver(observer);
            });
        }

        // Render description lists
        const dListRegex = new RegExp(`^\\s*${DLIST_TOKEN}.+$`, "im");
        if (this.settings.renderDLists && container.textContent.match(dListRegex)) {
            renderDescriptionList(container);
        }
        // Render inline description lists
        const inlineDListRegex = new RegExp(`^.+\\s+${DLIST_INLINE_TOKEN}\\s*.*$`, "im");
        if (this.settings.renderDLists && this.settings.renderInlineDLists && container.textContent.match(inlineDListRegex)) {
            renderInlineDescriptionList(container);
        }
        // Render inline quotations
        const quoteRegex = new RegExp(`^.*${QUOTE_TOKEN}.+${QUOTE_TOKEN}.*$`, "im");
        if (this.settings.renderInlineQuotes && container.textContent.match(quoteRegex)) {
            renderMarkdownToken(container, QUOTE_TOKEN, "q");
        }
        // Render subscript
        const subRegex = new RegExp(`^.*${SUB_TOKEN}.+${SUB_TOKEN}.*$`, "im");
        if (this.settings.renderSubscript && container.textContent.match(subRegex)) {
            renderMarkdownToken(container, SUB_TOKEN, "sub");
        }
        // Render superscript
        const supRegex = new RegExp(`^.*\\${SUP_TOKEN}.+\\${SUP_TOKEN}.*$`, "im");
        if (this.settings.renderSuperscript && container.textContent.match(supRegex)) {
            renderMarkdownToken(container, SUP_TOKEN, "sup");
        }
    }

    /**
     * Replaces the default image rendering functionality by extracting
     * css classes and captions from the 'alt' text of an <img> and
     * adding it to the element.
     * @param embedContainer The HTMLElement containing the <img> tag.
     */
    renderEmbeddedImage(embedContainer: HTMLElement) {
        // Get the "alt" value and parse for properties
        const alt = embedContainer.getAttribute("alt");
        if (!alt) return;

        // Get image
        const img = embedContainer.querySelector("img");
        if (!img) return;

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

        // Default to embedContainer
        let containerToReplace = embedContainer;
        // Check the parent. If it's a <p> with no other children
        // than the image, switch to replacing it instead.
        const parent = embedContainer.parentElement;
        if (parent && parent.matches("p") && parent.children.length == 1) {
            containerToReplace = parent;
        }

        // Create the figure and add the image
        const figure = createEl("figure", { cls: cssClasses });
        figure.appendChild(img);
        // Add the caption
        if (caption) {
            figure.createEl("figcaption", {
                text: caption.trim(),
            });
        }
        // Set figure width if image has width
        if (img.hasAttribute("width")) {
            figure.style.width = img.getAttribute("width") + "px";
        }

        if (caption) {
            // Replace with the <figure>
            containerToReplace.replaceWith(figure);
        } else {
            // Add css classes to the <img>
            img.addClasses(cssClasses);
            // Replace with the <img>
            containerToReplace.replaceWith(img);
        }
    }
}
