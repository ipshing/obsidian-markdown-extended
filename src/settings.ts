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
    }
}
