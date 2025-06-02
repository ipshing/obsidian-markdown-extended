import { MarkdownPostProcessorContext, Plugin, setIcon } from "obsidian";
import { valid, lt } from "semver";
import { MarkdownExtendedSettingsTab } from "./settings";
import { renderMarkdownToken, toggleToken } from "./components/text";
import { DLIST_INLINE_REGEX, DLIST_REGEX, renderDescriptionList, renderInlineDescriptionList } from "./components/list";
import MarkdownIt from "markdown-it";
import mTable from "markdown-it-multimd-table";
import { MARKDOWN_IT_OPTIONS, TABLE_TOKEN, renderTable } from "./components/table";
import { renderImageAttributes } from "./components/image";

interface MarkdownExtendedSettings {
    version: string;
    previousVersion: string;
    renderEmbedProperties: boolean;
    renderImageProperties: boolean;
    renderDLists: boolean;
    renderInlineDLists: boolean;
    renderInlineQuotes: boolean;
    renderSubscript: boolean;
    renderSuperscript: boolean;
    inlineShowCopyButton: boolean;
}

const DEFAULT_SETTINGS: MarkdownExtendedSettings = {
    version: "",
    previousVersion: "",
    renderEmbedProperties: true,
    renderImageProperties: true,
    renderDLists: true,
    renderInlineDLists: true,
    renderInlineQuotes: true,
    renderSubscript: true,
    renderSuperscript: true,
    inlineShowCopyButton: true,
};

const QUOTE_TOKEN = '""';
const SUB_TOKEN = "~";
const SUP_TOKEN = "^";

export default class MarkdownExtended extends Plugin {
    settings: MarkdownExtendedSettings;
    md: MarkdownIt;
    private observers: MutationObserver[];

    async onload() {
        this.observers = [];

        // Load settings
        await this.loadSettings();
        // Check version
        await this.runVersionCheck();
        // Set up settings tab
        this.addSettingTab(new MarkdownExtendedSettingsTab(this.app, this));

        // Set up processor to check containers
        this.registerMarkdownPostProcessor(this.processContainers.bind(this));

        // Set up MarkdownIt
        this.md = MarkdownIt(MARKDOWN_IT_OPTIONS).use(mTable, {
            multiline: true,
            rowspan: true,
            headerless: true,
        });
        /** keep only table required features, let obsidian handle the markdown inside cell */
        this.md.block.ruler.enableOnly(["code", "fence", "table", "paragraph", "reference", "blockquote"]);
        this.md.inline.ruler.enableOnly([]);

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
        if (!this.observers) {
            this.observers = [];
        }
        this.observers.push(observer);
    }
    removeObserver(observer: MutationObserver) {
        observer.disconnect();
        if (this.observers) {
            this.observers.remove(observer);
        }
    }

    processContainers(container: HTMLElement, context: MarkdownPostProcessorContext) {
        // Ignore frontmatter
        if (container.find(".frontmatter")) return;

        // Ignore empty containers
        if (!container.hasChildNodes()) return;

        // Check if contains dataview
        const hasDv = container.find(".block-language-dataviewjs, .block-language-dataview");

        // Render tables (can be stand-alone or in callouts)
        const tableRegex = new RegExp(`^[>\\s]*${TABLE_TOKEN}`, "im");
        if (container.textContent.trim().match(tableRegex)) {
            renderTable(container, this, context);
        }
        // Render description lists
        if (this.settings.renderDLists && container.textContent.match(DLIST_REGEX) && !hasDv) {
            renderDescriptionList(container);
        }
        // Render inline description lists
        if (this.settings.renderDLists && this.settings.renderInlineDLists && container.textContent.match(DLIST_INLINE_REGEX) && !hasDv) {
            renderInlineDescriptionList(container);
        }
        // Render inline quotations
        const quoteRegex = new RegExp(`^.*${QUOTE_TOKEN}.+${QUOTE_TOKEN}.*$`, "is");
        if (this.settings.renderInlineQuotes && container.textContent.match(quoteRegex)) {
            renderMarkdownToken(container, QUOTE_TOKEN, "q");
        }
        // Render subscript
        const subRegex = new RegExp(`^.*${SUB_TOKEN}.+${SUB_TOKEN}.*$`, "is");
        if (this.settings.renderSubscript && container.textContent.match(subRegex)) {
            renderMarkdownToken(container, SUB_TOKEN, "sub");
        }
        // Render superscript
        const supRegex = new RegExp(`^.*\\${SUP_TOKEN}.+\\${SUP_TOKEN}.*$`, "is");
        if (this.settings.renderSuperscript && container.textContent.match(supRegex)) {
            renderMarkdownToken(container, SUP_TOKEN, "sup");
        }
        // Inline code
        if (this.settings.inlineShowCopyButton && container.find("code")) {
            const codes = container.findAll("code");
            for (const code of codes) {
                if (code.parentElement.nodeName !== "PRE" && code.textContent.startsWith("^")) {
                    // Remove the leading carat without disturbing any inner elements
                    code.innerText = code.innerText.slice(1);
                    // Add class
                    code.addClass("mx-code");
                    // Create button
                    const button = code.createEl("button", { cls: "copy-code-button mx-copy-code-button" });
                    // Set icon
                    setIcon(button, "lucide-copy");
                    // Save text
                    const textToCopy = code.textContent;
                    // Add click event handler
                    button.onclick = (event) => {
                        if (textToCopy) {
                            event.stopPropagation();
                            // Copy text to clipboard
                            navigator.clipboard.writeText(textToCopy);
                            // Set icon and style
                            setIcon(button, "lucide-check");
                            button.setCssStyles({
                                color: "var(--text-success)",
                                display: "inline-flex",
                            });
                            setTimeout(() => {
                                // change icon and style back
                                setIcon(button, "lucide-copy");
                                button.setCssStyles({
                                    color: "",
                                    display: "",
                                });
                            }, 1000);
                        }
                    };
                }
            }
        }
        // Render embed attributes
        if (this.settings.renderEmbedProperties || this.settings.renderImageProperties) {
            // Set up observers to monitor embeds so they can be
            // formatted after the content has been loaded. Run
            // this after all other formatting has happend in case
            // elements were moved around during the rendering process.
            container.findAll(".internal-embed").forEach((el) => {
                // Create the observer and its callback
                const observer = new MutationObserver((mutations, observer) => {
                    // Iterate over mutations to find embeds that have been loaded
                    for (const mutation of mutations) {
                        // Also verify the settings
                        if (mutation.target instanceof HTMLElement && mutation.target.matches(".image-embed.is-loaded") && this.settings.renderImageProperties) {
                            // Format image
                            renderImageAttributes(mutation.target.find("img") as HTMLImageElement);
                        }
                        if (mutation.target instanceof HTMLElement && mutation.target.matches(".markdown-embed.is-loaded") && this.settings.renderEmbedProperties) {
                            const embed = mutation.target as HTMLElement;
                            // Check to see if the 'alt' property has been set
                            const alt = embed.getAttribute("alt");
                            if (alt) {
                                // Split the alt on commas and spaces
                                const cssClasses = alt.split(/,| /).filter((str) => str);
                                // Add the css classes to the 'class' attribute
                                embed.addClasses(cssClasses);
                            }
                        }
                    }
                    // Clean up
                    this.removeObserver(observer);
                });
                // Set to monitor the 'class' attribute
                observer.observe(el, {
                    attributes: true,
                    attributeFilter: ["class"],
                });
                // Add to tracked observers
                this.addObserver(observer);
            });
        }

        // Render external image attributes
        if (this.settings.renderImageProperties) {
            // <img> tags that are not in a span.internal-embed indicate an
            // external link.These can just be formatted in place right now.
            container.findAll("img:not(.internal-embed > img)").forEach((img: HTMLImageElement) => {
                // Format image
                renderImageAttributes(img);
            });
        }
    }
}
