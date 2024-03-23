import { App, PluginSettingTab, Setting } from "obsidian";
import MarkdownExtended from "./main";

export class MarkdownExtendedSettingsTab extends PluginSettingTab {
    plugin: MarkdownExtended;

    constructor(app: App, plugin: MarkdownExtended) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.addClass("mx-settings");

        new Setting(containerEl)
            .setName("Additional image properties")
            .setDesc("Add captions and css classes to image links for more robust styling. Disabling this uses the default embed rendering functionality.")
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.renderImageProperties).onChange(async (value) => {
                    // Update settings
                    this.plugin.settings.renderImageProperties = value;
                    await this.plugin.saveSettings();
                    // Refresh settings view
                    this.display();
                })
            );
        new Setting(containerEl)
            .setName("Inline Quotes")
            .setDesc('Render text surrounded by double quotation marks ("") between <q></q> tags.')
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.renderInlineQuotes).onChange(async (value) => {
                    // Update settings
                    this.plugin.settings.renderInlineQuotes = value;
                    await this.plugin.saveSettings();
                    // Refresh settings view
                    this.display();
                })
            );

        new Setting(containerEl)
            .setName("Subscript")
            .setDesc("Render text surrounded by single tildes (~) between <sub></sub> tags.")
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.renderSubscript).onChange(async (value) => {
                    // Update settings
                    this.plugin.settings.renderSubscript = value;
                    await this.plugin.saveSettings();
                    // Refresh settings view
                    this.display();
                })
            );

        new Setting(containerEl)
            .setName("Superscript")
            .setDesc("Render text surrounded by single carets (^) between <sup></sup> tags.")
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.renderSuperscript).onChange(async (value) => {
                    // Update settings
                    this.plugin.settings.renderSuperscript = value;
                    await this.plugin.saveSettings();
                    // Refresh settings view
                    this.display();
                })
            );
    }
}
