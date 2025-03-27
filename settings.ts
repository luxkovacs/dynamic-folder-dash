import { App, PluginSettingTab, Setting } from 'obsidian';
import DynamicFolderDash from './main';

export interface DynamicFolderDashSettings {
    hideFolderContents: boolean;
    viewType: 'simple-list' | 'card-view' | 'column-view';
    includeFrontmatter: boolean;
    showFileCreationDate: boolean;
    showFileModificationDate: boolean;
    customCSS: string;
    triggerMode: 'command-only' | 'alt-click' | 'ctrl-click' | 'shift-click';
    hideNotesInExplorer: boolean;
    welcomeMessage: string; // New setting for welcome message
}

export const DEFAULT_SETTINGS: DynamicFolderDashSettings = {
    hideFolderContents: false,
    viewType: 'simple-list',
    includeFrontmatter: false,
    showFileCreationDate: false,
    showFileModificationDate: false,
    customCSS: '',
    triggerMode: 'command-only',
    hideNotesInExplorer: true,
    welcomeMessage: '*This is a dynamic dashboard for the "{folder}" folder.*' // Default message with placeholder
}

export class DynamicFolderDashSettingTab extends PluginSettingTab {
    plugin: DynamicFolderDash;

    constructor(app: App, plugin: DynamicFolderDash) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();
        
        containerEl.createEl('h2', {text: 'Dynamic Folder Dashboard Settings'});
        
        // General Settings
        containerEl.createEl('h3', {text: 'General Settings'});
        
        // First setting - Hide dashboard files
        new Setting(containerEl)
            .setName('Hide folder note .md file in sidebar')
            .setDesc('When enabled, the folder note file will be hidden in the file explorer; the contents of the folder will stay visible.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hideNotesInExplorer)
                .onChange(async (value) => {
                    this.plugin.settings.hideNotesInExplorer = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateExplorerStyles();
                }));
        
        // Hide folder contents
        new Setting(containerEl)
            .setName('Hide folder contents in sidebar')
            .setDesc('When enabled, folder contents will be hidden in the sidebar when a folder dashboard exists.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hideFolderContents)
                .onChange(async (value) => {
                    this.plugin.settings.hideFolderContents = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateFolderDisplay();
                }));
        
        // Creation trigger
        new Setting(containerEl)
            .setName('Creation trigger')
            .setDesc('Choose how to trigger folder dashboard creation when clicking on folders')
            .addDropdown(dropdown => dropdown
                .addOption('command-only', 'Command only')
                .addOption('alt-click', 'Alt + Click')
                .addOption('ctrl-click', 'Ctrl + Click')
                .addOption('shift-click', 'Shift + Click')
                .setValue(this.plugin.settings.triggerMode)
                .onChange(async (value) => {
                    this.plugin.settings.triggerMode = value as DynamicFolderDashSettings['triggerMode'];
                    await this.plugin.saveSettings();
                    this.plugin.setupTriggerMode();
                }));
                
        // Display Settings
        containerEl.createEl('h3', {text: 'Display Settings'});
        
        // View Type
        new Setting(containerEl)
            .setName('View Type')
            .setDesc('Choose how folder contents are displayed in the dashboard.')
            .addDropdown(dropdown => dropdown
                .addOption('simple-list', 'Simple List')
                .addOption('card-view', 'Card View')
                .addOption('column-view', 'Column View')
                .setValue(this.plugin.settings.viewType)
                .onChange(async (value) => {
                    this.plugin.settings.viewType = value as DynamicFolderDashSettings['viewType'];
                    await this.plugin.saveSettings();
                    this.plugin.updateAllDashboards();
                }));
        
        // Default welcome message
        new Setting(containerEl)
            .setName('Default welcome message')
            .setDesc('Template for the welcome message shown at the top of new dashboards. Use {folder} to insert the folder name.')
            .addTextArea(text => text
                .setValue(this.plugin.settings.welcomeMessage)
                .onChange(async (value) => {
                    this.plugin.settings.welcomeMessage = value;
                    await this.plugin.saveSettings();
                })
            )
            .setClass('welcome-message-setting');
                
        // Metadata Settings
        containerEl.createEl('h3', {text: 'Metadata Settings'});
        
        // Include frontmatter
        new Setting(containerEl)
            .setName('Include frontmatter')
            .setDesc('When enabled, displays frontmatter properties in file listings.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeFrontmatter)
                .onChange(async (value) => {
                    this.plugin.settings.includeFrontmatter = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllDashboards();
                }));
                
        // Show creation date
        new Setting(containerEl)
            .setName('Show file creation date')
            .setDesc('Display creation date for each file.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFileCreationDate)
                .onChange(async (value) => {
                    this.plugin.settings.showFileCreationDate = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllDashboards();
                }));
                
        // Show modification date
        new Setting(containerEl)
            .setName('Show file modification date')
            .setDesc('Display last modified date for each file.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFileModificationDate)
                .onChange(async (value) => {
                    this.plugin.settings.showFileModificationDate = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllDashboards();
                }));
                
        // Advanced Settings
        containerEl.createEl('h3', {text: 'Advanced Settings'});
        
        // Custom CSS
        new Setting(containerEl)
            .setName('Custom CSS')
            .setDesc('Add custom CSS rules to adjust the dashboard appearance.')
            .addTextArea(text => text
                .setValue(this.plugin.settings.customCSS)
                .onChange(async (value) => {
                    this.plugin.settings.customCSS = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateCustomCSS();
                })
            )
            .setClass('custom-css-setting');
    }
}