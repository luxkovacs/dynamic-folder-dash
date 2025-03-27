import { App, TFile, TFolder } from 'obsidian';
import DynamicFolderDash from './main';

export class DashboardManager {
    app: App;
    plugin: DynamicFolderDash;

    constructor(app: App, plugin: DynamicFolderDash) {
        this.app = app;
        this.plugin = plugin;
    }

    // Initialize dashboard behavior
    initialize() {
        // Mark existing dashboards
        this.markAllDashboards();
        
        // Set up folder click handling
        this.setupFolderClickHandling();
    }

    // Mark all folders that have dashboards
    markAllDashboards() {
        this.app.workspace.onLayoutReady(() => {
            const files = this.app.vault.getMarkdownFiles();
            for (const file of files) {
                const folder = file.parent;
                if (folder && file.basename === folder.name) {
                    this.markFolderWithDashboard(folder);
                    this.markDashboardFile(file);
                }
            }
        });
    }

    // Set up click handlers for folders
    setupFolderClickHandling() {
        // Handle normal clicks on folders with dashboards
        this.plugin.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            // Skip if modifier keys are pressed (handled by trigger mode)
            if (evt.altKey || evt.ctrlKey || evt.shiftKey) return;
            
            const target = evt.target as HTMLElement;
            const folderTitleEl = target.closest('.nav-folder-title');
            if (!folderTitleEl) return;
            
            // Check if this folder has a dashboard
            const folderPath = folderTitleEl.getAttribute('data-path');
            if (!folderPath) return;
            
            const folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!(folder instanceof TFolder)) return;
            
            // Check for dashboard file
            const dashboardPath = `${folderPath}/${folder.name}.md`;
            const dashboardFile = this.app.vault.getAbstractFileByPath(dashboardPath);
            
            // If dashboard exists, open it
            if (dashboardFile instanceof TFile) {
                evt.preventDefault();
                evt.stopPropagation();
                
                // Open the dashboard file
                this.app.workspace.openLinkText(
                    dashboardPath, 
                    '', 
                    false
                );
            }
        });
        
        // Handle file creation
        this.plugin.registerEvent(
            this.app.vault.on('create', (file) => {
                if (file instanceof TFile) {
                    const folder = file.parent;
                    if (folder && file.basename === folder.name) {
                        this.markFolderWithDashboard(folder);
                        this.markDashboardFile(file);
                    }
                }
            })
        );
        
        // Handle file deletion
        this.plugin.registerEvent(
            this.app.vault.on('delete', (file) => {
                if (file instanceof TFile) {
                    const folder = file.parent;
                    if (folder && file.basename === folder.name) {
                        this.unmarkFolderWithDashboard(folder);
                    }
                }
            })
        );
    }
    
    // Mark a folder as having a dashboard
    markFolderWithDashboard(folder: TFolder) {
        setTimeout(() => {
            const folderEl = document.querySelector(
                `.nav-folder-title[data-path="${folder.path}"]`
            )?.parentElement?.parentElement;
            
            if (folderEl) {
                folderEl.addClass('has-dashboard');
            }
        }, 100);
    }
    
    // Unmark a folder when dashboard is removed
    unmarkFolderWithDashboard(folder: TFolder) {
        setTimeout(() => {
            const folderEl = document.querySelector(
                `.nav-folder-title[data-path="${folder.path}"]`
            )?.parentElement?.parentElement;
            
            if (folderEl) {
                folderEl.removeClass('has-dashboard');
            }
        }, 100);
    }
    
    // Mark a file as being a dashboard file
    markDashboardFile(file: TFile) {
        setTimeout(() => {
            const fileEl = document.querySelector(
                `.nav-file-title[data-path="${file.path}"]`
            )?.parentElement;
            
            if (fileEl) {
                fileEl.addClass('is-dashboard-file');
            }
        }, 100);
    }
    
    // Update visibility based on settings
    updateVisibility() {
        // Set CSS variables based on settings
        if (this.plugin.settings.hideNotesInExplorer) {
            document.body.style.setProperty('--dynamic-folder-dash-file-display', 'none');
        } else {
            document.body.style.setProperty('--dynamic-folder-dash-file-display', 'block');
        }
        
        if (this.plugin.settings.hideFolderContents) {
            document.body.style.setProperty('--dynamic-folder-dash-display', 'none');
        } else {
            document.body.style.setProperty('--dynamic-folder-dash-display', 'block');
        }
    }
}