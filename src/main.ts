import { MarkdownPostProcessorContext, Plugin } from "obsidian";
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

export default class MarkdownExtended extends Plugin {
    settings: MarkdownExtendedSettings;
    md: MarkdownIt;
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

        // Render tables
        if (container.textContent.trim().startsWith(TABLE_TOKEN)) {
            renderTable(container, this, context);
        }
        // Render description lists
        if (this.settings.renderDLists && container.textContent.match(DLIST_REGEX)) {
            renderDescriptionList(container);
        }
        // Render inline description lists
        if (this.settings.renderDLists && this.settings.renderInlineDLists && container.textContent.match(DLIST_INLINE_REGEX)) {
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
        // Render image attributes
        if (this.settings.renderImageProperties) {
            // <img> tags indicate an external link. These can just be
            // formatted in place right now.
            container.findAll("img").forEach((img) => {
                // Format image
                renderImageAttributes(img);
            });
            // Set up observers for embedded images to format them
            // after the content has been loaded. Run this after
            // all other formatting has happened in case image
            // elements were moved around during the rendering process.
            container.findAll(".internal-embed").forEach((el) => {
                const observer = new MutationObserver((mutations, observer) => {
                    for (const mutation of mutations) {
                        const target = mutation.target as HTMLElement;
                        // Make sure content is either an <img> or, if
                        // it's embedded, that it's finished loading.
                        if (target.matches(".image-embed.is-loaded")) {
                            // Format image
                            renderImageAttributes(target);
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
    }
}
