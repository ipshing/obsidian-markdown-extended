import { App, PluginSettingTab, SettingGroup } from "obsidian";
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

        new SettingGroup(containerEl)
            .addSetting((setting) => {
                setting
                    .setName("Additional embed properties")
                    .setDesc("Add css classes to markdown embeds. Disabling this ueses the default embed rendering functionliaty.")
                    .addToggle((toggle) =>
                        toggle.setValue(this.plugin.settings.renderEmbedProperties).onChange(async (value) => {
                            // Update settings
                            await this.plugin.updateSettings({ renderEmbedProperties: value });
                            // Refresh settings view
                            this.display();
                        }),
                    );
            })
            .addSetting((setting) => {
                setting
                    .setName("Additional image properties")
                    .setDesc("Add captions and css classes to image links for more robust styling. Disabling this uses the default embed rendering functionality.")
                    .addToggle((toggle) =>
                        toggle.setValue(this.plugin.settings.renderImageProperties).onChange(async (value) => {
                            // Update settings
                            await this.plugin.updateSettings({ renderImageProperties: value });
                            // Refresh settings view
                            this.display();
                        }),
                    );
            })
            /* Disable this for now */
            // .addSetting((setting) => {
            //     setting
            //         .setName("Subscript")
            //         .setDesc("Render text surrounded by single tildes (~) between <sub></sub> tags.")
            //         .addToggle((toggle) =>
            //             toggle.setValue(this.plugin.settings.renderSubscript).onChange(async (value) => {
            //                 // Update settings
            //                 await this.plugin.updateSettings({ renderSubscript: value });
            //                 // Refresh settings view
            //                 this.display();
            //             }),
            //         );
            // })
            /* Disable this for now */
            // .addSetting((setting) => {
            //     setting
            //         .setName("Superscript")
            //         .setDesc("Render text surrounded by single carets (^) between <sup></sup> tags.")
            //         .addToggle((toggle) =>
            //             toggle.setValue(this.plugin.settings.renderSuperscript).onChange(async (value) => {
            //                 // Update settings
            //                 await this.plugin.updateSettings({ renderSuperscript: value });
            //                 // Refresh settings view
            //                 this.display();
            //             }),
            //         );
            // })
            .addSetting((setting) => {
                setting
                    .setName("Inline Quotes")
                    .setDesc('Render text surrounded by double quotation marks ("") between <q></q> tags.')
                    .addToggle((toggle) =>
                        toggle.setValue(this.plugin.settings.renderInlineQuotes).onChange(async (value) => {
                            // Update settings
                            await this.plugin.updateSettings({ renderInlineQuotes: value });
                            // Refresh settings view
                            this.display();
                        }),
                    );
            });

        new SettingGroup(containerEl)
            .setHeading("Description Lists")
            .addSetting((setting) => {
                setting
                    .setName("Description lists")
                    .setDesc(
                        "Render multiple lines of text into description lists (also known as definition lists) when the second and subsequent lines each start with a colon (:) followed by a space.",
                    )
                    .addToggle((toggle) =>
                        toggle.setValue(this.plugin.settings.renderDLists).onChange(async (value) => {
                            // Update settings
                            await this.plugin.updateSettings({ renderDLists: value });
                            // Refresh settings view
                            this.display();
                        }),
                    );
            })
            .addSetting((setting) => {
                setting
                    .setName("Inline description lists")
                    .setDesc(
                        "Allows description lists to be defined on the same line, separated by a double-colon (::). This setting can potentially interfere with other plugins that rely on a double-colon as a token. Requires the 'Description lists' setting above to be turned on.",
                    )
                    .setDisabled(!this.plugin.settings.renderDLists)
                    .addToggle((toggle) =>
                        toggle
                            .setValue(this.plugin.settings.renderDLists && this.plugin.settings.renderInlineDLists)
                            .setDisabled(!this.plugin.settings.renderDLists)
                            .onChange(async (value) => {
                                // Update settings
                                await this.plugin.updateSettings({ renderInlineDLists: value });
                                // Refresh settings view
                                this.display();
                            }),
                    );
            });

        new SettingGroup(containerEl)
            .setHeading("Inline Code")
            .addSetting((setting) => {
                setting
                    .setName("Show copy button")
                    .setDesc("Show the copy button in inline code blocks. (Requires restart of Obsidian.)")
                    .addToggle((toggle) =>
                        toggle.setValue(this.plugin.settings.showCopyButton).onChange(async (value) => {
                            // Update settings
                            await this.plugin.updateSettings({ showCopyButton: value });
                            //Refresh settings view
                            this.display();
                        }),
                    );
            })
            .addSetting((setting) => {
                setting
                    .setName("Copy token")
                    .setDesc(
                        "Used to identify which inline code blocks to add a copy button to. Can be any string of standard characters (case-sensitive). White spaces will be ignored. Leave empty to use default.",
                    )
                    .setDisabled(!this.plugin.settings.showCopyButton)
                    .addText((text) => {
                        text.setValue(this.plugin.settings.copyToken);
                        text.setDisabled(!this.plugin.settings.showCopyButton);
                        text.setPlaceholder("^");
                        text.onChange(async (value) => {
                            // Update settings
                            await this.plugin.updateSettings({ copyToken: value });
                        });
                    });
            })
            .addSetting((setting) => {
                setting
                    .setName("Hidden copy tokn")
                    .setDesc(
                        "Used to hide the text inside the inline code block and show only the copy button. Can be any string of standard characters (case-sensitive). White spaces will be ignored. Leave empty to use default.",
                    )
                    .setDisabled(!this.plugin.settings.showCopyButton)
                    .addText((text) => {
                        text.setValue(this.plugin.settings.hiddenToken);
                        text.setDisabled(!this.plugin.settings.showCopyButton);
                        text.setPlaceholder("^?");
                        text.onChange(async (value) => {
                            // Update settings
                            await this.plugin.updateSettings({ hiddenToken: value });
                        });
                    });
            });
    }
}
