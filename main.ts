import { App, Plugin, TFolder, TFile, MarkdownView, TAbstractFile, PluginSettingTab, Setting } from 'obsidian';
import { DynamicFolderDashSettings, DEFAULT_SETTINGS, DynamicFolderDashSettingTab } from './settings';
import { DashboardManager } from './dashboard-manager';

export default class DynamicFolderDash extends Plugin {
    settings: DynamicFolderDashSettings;
    dashboardManager: DashboardManager;
    customStyleEl: HTMLStyleElement;
    folderClickHandler: (event: MouseEvent) => void;
    private pendingUpdates: Map<string, number> = new Map();
    private updateDebounceMs = 500;  // Milliseconds to wait before updating

    async onload() {
        await this.loadSettings();

        // Render folder content at display time
        this.registerMarkdownCodeBlockProcessor('dynamic-folder', async (source, el, ctx) => {
            // Get the current folder from the file's context
            const file = this.app.vault.getFileByPath(ctx.sourcePath);
            if (!file) return;
            
            const folder = file.parent;
            if (!folder) return;
            
            // Generate fresh HTML content
            const content = document.createElement('div');
            content.className = `dynamic-folder-dash ${this.settings.viewType}`;
            
            // Generate actual content based on current folder state
            switch (this.settings.viewType) {
                case 'card-view':
                    content.innerHTML = await this.generateCardView(folder);
                    break;
                case 'column-view':
                    content.innerHTML = await this.generateColumnView(folder);
                    break;
                case 'simple-list':
                default:
                    content.innerHTML = await this.generateSimpleListView(folder);
                    break;
            }
            
            // Insert the content into the rendered document
            el.appendChild(content);
        });
        
        // Initialize dashboard manager
        this.dashboardManager = new DashboardManager(this.app, this);
        this.dashboardManager.initialize();
        
        // Set initial visibility based on settings
        this.dashboardManager.updateVisibility();
        
        // Set up trigger mode for creating dashboards
        this.setupTriggerMode();
        
        // Add command for creating dashboards
        this.addCommand({
            id: 'create-folder-dashboard',
            name: 'Create folder dashboard',
            callback: () => {
                const folder = this.getActiveFolderFromExplorer();
                if (folder) {
                    this.createFolderDashboard(folder);
                }
            }
        });

        // Register event listeners for file changes
        this.registerEvent(
            this.app.vault.on('create', (file: TAbstractFile) => this.handleFileChange(file))
        );

        this.registerEvent(
            this.app.vault.on('delete', (file: TAbstractFile) => this.handleFileChange(file))
        );

        this.registerEvent(
            this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
                this.handleFileChange(file);
                this.updateDashboardsForPath(oldPath);
            })
        );
        
        // Add CSS style element for custom CSS
        this.customStyleEl = document.createElement('style');
        document.head.appendChild(this.customStyleEl);
        this.updateCustomCSS();
        
        // Add settings tab
        this.addSettingTab(new DynamicFolderDashSettingTab(this.app, this));
    }
    
    // Update methods to use dashboard manager
    updateExplorerStyles() {
        this.dashboardManager.updateVisibility();
    }
    
    updateFolderDisplay() {
        this.dashboardManager.updateVisibility();
    }

    onunload() {
        // Removing custom style element
        if (this.customStyleEl && this.customStyleEl.parentNode) {
            this.customStyleEl.parentNode.removeChild(this.customStyleEl);
        }

        // Cleaning up event listeners
        if (this.folderClickHandler) {
            document.removeEventListener('click', this.folderClickHandler, true);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    updateCustomCSS() {
        this.customStyleEl.textContent = this.settings.customCSS;
    }
    
    getNavFolderEl(path: string): HTMLElement | null {
        const fileExplorer = this.app.workspace.getLeavesOfType('file-explorer')[0];
        if (!fileExplorer) return null;
        
        // Use DOM query to find the folder element
        const folderEl = fileExplorer.view.containerEl.querySelector(
            `.nav-folder-title[data-path="${path}"]`
        )?.parentElement;
        
        return folderEl as HTMLElement || null;
    }
    
    async createFolderDashboardForActiveFolder() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;
        
        const folder = activeFile.parent;
        if (folder) {
            await this.createFolderDashboard(folder);
        }
    }

    async createFolderDashboard(folder: TFolder) {
        const dashboardName = `${folder.name}.md`;
        const dashboardPath = `${folder.path}/${dashboardName}`;
        
        // Checking if dashboard already exists
        const existingDashboard = this.app.vault.getAbstractFileByPath(dashboardPath);
        if (existingDashboard instanceof TFile) {
            // Just open the existing dashboard
            await this.app.workspace.getLeaf().openFile(existingDashboard);
            return;
        }
        
        // Process welcome message, replacing placeholders
        let welcomeMessage = this.settings.welcomeMessage || '';
        welcomeMessage = welcomeMessage.replace(/{folder}/g, folder.name);
        
        // Creating initial dashboard content with dynamic code block
        let content = '';
        
        // Only add welcome message if it's not empty
        if (welcomeMessage.trim()) {
            content += `${welcomeMessage}\n\n`;
        }
        
        // Add the dynamic code block
        content += "```dynamic-folder\n" +
                  "# This content updates automatically\n" +
                  "```\n";
        
        // Creating new dashboard file
        const newDashboard = await this.app.vault.create(dashboardPath, content);
        
        // Opening the new dashboard
        await this.app.workspace.getLeaf().openFile(newDashboard);
    }

    // Fix this function declaration
    async updateFolderDashboard(folder: TFolder, dashboardFile: TFile) {
        const dashboardPath = dashboardFile.path;
        
        // Cancel any pending update for this dashboard
        if (this.pendingUpdates.has(dashboardPath)) {
            window.clearTimeout(this.pendingUpdates.get(dashboardPath));
        }
        
        // Schedule a new update
        const timeoutId = window.setTimeout(async () => {
            // Generate new content and update the dashboard
            const content = await this.generateDashboardContent(folder);
            await this.app.vault.modify(dashboardFile, content);
            
            // Remove from pending updates
            this.pendingUpdates.delete(dashboardPath);
        }, this.updateDebounceMs);
        
        // Store the timeout ID
        this.pendingUpdates.set(dashboardPath, timeoutId);
    }

    /**
     * Generating content based on the selected view type
     */
    async generateDashboardContent(folder: TFolder): Promise<string> {
        const viewType = this.settings.viewType;
        let content = `# ${folder.name}\n\n`;
        content += `*This is a dynamic dashboard for the "${folder.name}" folder.*\n\n`;
        
        content += `<div class="dynamic-folder-dash ${viewType}">\n`;
        
        // Generating content based on view type
        switch (viewType) {
            case 'card-view':
                content += await this.generateCardView(folder);
                break;
            case 'column-view':
                content += await this.generateColumnView(folder);
                break;
            case 'simple-list':
            default:
                content += await this.generateSimpleListView(folder);
                break;
        }
        
        content += `</div>`;
        
        return content;
    }

    /**
     * Generating a simple list view of folder contents
     */
    async generateSimpleListView(folder: TFolder): Promise<string> {
        let content = '';
        
        // Generate subfolders section
        const subfolders = folder.children.filter(child => child instanceof TFolder);
        if (subfolders.length > 0) {
            content += `<h2>Subfolders</h2>\n<ul>`;
            
            for (const subfolder of subfolders) {
                // Use HTML links
                content += `<li>📁 <a class="internal-link" href="${subfolder.path}/${subfolder.name}" data-href="${subfolder.path}/${subfolder.name}">${subfolder.name}</a></li>\n`;
            }
            
            content += `</ul>\n`;
        }
        
        // Generating files section
        const files = folder.children.filter(child => 
            child instanceof TFile && 
            child.name !== `${folder.name}.md`
        );
        
        if (files.length > 0) {
            content += `<h2>Files</h2>\n<ul>`;
            
            for (const file of files) {
                if (file instanceof TFile) {
                    // Use HTML links for files
                    const fileName = file.basename;
                    content += `<li>📄 <a class="internal-link" href="${file.path}" data-href="${file.path}">${fileName}</a>${await this.getFileMetadataHTML(file)}</li>\n`;
                }
            }
            
            content += `</ul>`;
        }
        
        return content;
    }

    /**
     * Generating a card view of folder contents
     */
    async generateCardView(folder: TFolder): Promise<string> {
        let content = '';
        const allItems = folder.children;
        
        for (const item of allItems) {
            if (item instanceof TFolder) {
                content += `<div class="card folder-card">
                    <div class="card-title">📁 <a class="internal-link" href="${item.path}/${item.name}" data-href="${item.path}/${item.name}">${item.name}</a></div>
                    <div class="card-content">Folder with ${item.children.length} items</div>
                </div>\n`;
            } else if (item instanceof TFile && item.name !== `${folder.name}.md`) {
                const file = item as TFile;
                const fileIcon = this.getFileIcon(file);
                
                content += `<div class="card file-card">
                    <div class="card-title">${fileIcon} <a class="internal-link" href="${file.basename}" data-href="${file.basename}">${file.basename}</a></div>
                    ${await this.generateFileMetadata(file)}
                </div>\n`;
            }
        }
        
        return content;
    }

    /**
     * Generating a column view with separate columns for folders and files
     */
    async generateColumnView(folder: TFolder): Promise<string> {
        let content = '';
        
        // Generating subfolders column
        const subfolders = folder.children.filter(child => child instanceof TFolder);
        if (subfolders.length > 0) {
            content += `<div class="column folders-column">
                <h3>Folders</h3>
                <ul>`;
            
            for (const subfolder of subfolders) {
                // Keeping the full path in href but only show the name
                content += `<li>📁 <a class="internal-link" href="${subfolder.path}/${subfolder.name}" data-href="${subfolder.path}/${subfolder.name}">${subfolder.name}</a></li>\n`;
            }
            
            content += `</ul>
            </div>\n`;
        }
        
        // Generating files column
        const files = folder.children.filter(child => 
            child instanceof TFile && 
            child.name !== `${folder.name}.md`
        );
        
        if (files.length > 0) {
            content += `<div class="column files-column">
                <h3>Files</h3>
                <ul>`;
            
            for (const file of files) {
                if (file instanceof TFile) {
                    // Using HTML anchor tags for files too
                    const fileName = file.basename;
                    content += `<li>📄 <a class="internal-link" href="${fileName}" data-href="${fileName}">${fileName}</a>${await this.getFileMetadataHTML(file)}</li>\n`;
                }
            }
            
            content += `</ul>
            </div>\n`;
        }
        
        return content;
    }

    /**
     * Generating a gallery view with visual tiles — disabled for now due to similarity to card view
    async generateGalleryView(folder: TFolder): Promise<string> {
        let content = '';
        const allItems = folder.children.filter(child => 
            child instanceof TFile && 
            child.name !== `${folder.name}.md` ||
            child instanceof TFolder
        );
        
        for (const item of allItems) {
            if (item instanceof TFolder) {
                content += `<div class="gallery-item folder-item">
                <div class="gallery-item-icon">📁</div>
                <div class="gallery-item-title"><a class="internal-link" href="${item.path}/${item.name}" data-href="${item.path}/${item.name}">${item.name}</a></div>
            </div>\n`;
            } else if (item instanceof TFile) {
                const file = item as TFile;
                const fileIcon = this.getFileIcon(file);
                
                content += `<div class="gallery-item file-item">
                <div class="gallery-item-icon">${fileIcon}</div>
                <div class="gallery-item-title"><a class="internal-link" href="${file.path}" data-href="${file.path}">${file.basename}</a></div>
            </div>\n`;
            }
        }
        
        return content;
    }
    */

    /**
     * Generating metadata for a file based on settings
     */
    async generateFileMetadata(file: TFile): Promise<string> {
        let metadata = '<div class="file-metadata">';
        
        // Adding creation date if enabled
        if (this.settings.showFileCreationDate) {
            const created = file.stat.ctime;
            const createdDate = new Date(created).toLocaleDateString();
            metadata += `<div class="file-created">Created: ${createdDate}</div>`;
        }
        
        // Adding modification date if enabled
        if (this.settings.showFileModificationDate) {
            const modified = file.stat.mtime;
            const modifiedDate = new Date(modified).toLocaleDateString();
            metadata += `<div class="file-modified">Modified: ${modifiedDate}</div>`;
        }
        
        // Adding frontmatter if enabled
        if (this.settings.includeFrontmatter) {
            const frontmatter = await this.getFrontmatter(file);
            if (frontmatter && Object.keys(frontmatter).length > 0) {
                metadata += `<div class="file-frontmatter">`;
                
                for (const [key, value] of Object.entries(frontmatter)) {
                    metadata += `<div><span class="frontmatter-key">${key}:</span> ${value}</div>`;
                }
                
                metadata += `</div>`;
            }
        }
        
        metadata += '</div>';
        return metadata;
    }

    /**
     * Generating a list item for a file
     */
    async generateFileListItem(file: TFile, includeMetadata: boolean = true): Promise<string> {
        const fileIcon = this.getFileIcon(file);
        let item = `- ${fileIcon} [[${file.basename}]]`;
        
        if (includeMetadata && (this.settings.showFileCreationDate || this.settings.showFileModificationDate)) {
            item += ' ';
            
            if (this.settings.showFileCreationDate) {
                const created = file.stat.ctime;
                const createdDate = new Date(created).toLocaleDateString();
                item += `(Created: ${createdDate}) `;
            }
            
            if (this.settings.showFileModificationDate) {
                const modified = file.stat.mtime;
                const modifiedDate = new Date(modified).toLocaleDateString();
                item += `(Modified: ${modifiedDate})`;
            }
        }
        
        item += '\n';
        return item;
    }

    /**
     * Assigning an icon to a file based on its extension
     */
    getFileIcon(file: TFile): string {
        const ext = file.extension.toLowerCase();
        
        switch (ext) {
            case 'md':
                return '📄';
            case 'pdf':
                return '📑';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return '🖼️';
            case 'mp3':
            case 'wav':
            case 'ogg':
                return '🎵';
            default:
                return '📄';
        }
    }

    // Method to trigger view refresh
    handleFileChange(file: TAbstractFile) {
        // Find parent folder and update its dashboard if it exists
        const parentFolder = file.parent;
        if (!parentFolder) return;
        
        // Update the dashboard for this folder
        const dashboardPath = `${parentFolder.path}/${parentFolder.name}.md`;
        const dashboardFile = this.app.vault.getAbstractFileByPath(dashboardPath);
        
        if (dashboardFile instanceof TFile) {
            // Force refresh any open views of this dashboard
            this.refreshOpenDashboardView(dashboardFile);
        }
    }

    //  Force re-rendering of open dashboards
    refreshOpenDashboardView(dashboardFile: TFile) {
        // Find any open leaves that are displaying this file
        this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
            if (leaf.view instanceof MarkdownView) {
                // Check if this view is showing our dashboard
                if (leaf.view.file && leaf.view.file.path === dashboardFile.path) {
                    // Force a re-render of the view
                    leaf.view.previewMode.rerender(true);
                }
            }
        });
    }

    handleFileRename(file: TFile | TFolder, oldPath: string) {
        // Handling folder renames
        this.handleFileChange(file);
        
        if (file instanceof TFolder) {
            const dashboardPath = `${file.path}/${file.name}.md`;
            const dashboardFile = this.app.vault.getAbstractFileByPath(dashboardPath);
            
            if (dashboardFile instanceof TFile) {
                this.updateFolderDashboard(file, dashboardFile);
            }
        }
    }

    /**
     * Handling clicks on internal links to folders to create folder dashboards if not present yet
     */
    async handleInternalLinkClick(target: HTMLElement, evt: MouseEvent) {
        // Get the href attribute which contains the path
        const href = target.getAttribute('href');
        if (!href) return;
        
        // Check if this is a valid file or folder path
        let path = decodeURI(href);
        
        // Remove the leading / if present
        if (path.startsWith('/')) {
            path = path.substring(1);
        }
        
        // Determining if this is a folder or a folder dashboard
        const file = this.app.vault.getAbstractFileByPath(path);
        
        if (file instanceof TFolder) {
            // User clicked directly on a folder link -> create dashboard
            evt.preventDefault();
            await this.createFolderDashboard(file);
            return;
        }
        
        // Check if this could be a link to a non-existent folder dashboard
        // Format would typically be: "folder/folder"
        // Extracting potential folder path
        const potentialFolderPath = path.substring(0, path.lastIndexOf('/'));
        const folderName = path.substring(path.lastIndexOf('/') + 1);
        
        // If the last segment matches the folder name, this links to a folder dashboard
        if (potentialFolderPath && folderName && potentialFolderPath.endsWith(folderName)) {
            const folder = this.app.vault.getAbstractFileByPath(potentialFolderPath);
            
            if (folder instanceof TFolder) {
                evt.preventDefault();
                await this.createFolderDashboard(folder);
                return;
            }
        }
        
        // For debugging:
        // console.log("Link clicked, but not a folder: ", path);
    }

    /**
     * Updates all existing folder dashboards
     */
    async updateAllDashboards() {
        const dashboards = this.app.vault.getMarkdownFiles().filter(file => {
            const folder = file.parent;
            return folder && file.basename === folder.name;
        });
        
        for (const dashboard of dashboards) {
            const folder = dashboard.parent;
            if (folder) {
                await this.updateFolderDashboard(folder, dashboard);
            }
        }
    }

    // Method to extract frontmatter
    async getFrontmatter(file: TFile): Promise<Record<string, any> | null> {
        try {
            const content = await this.app.vault.read(file);
            const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
            const match = content.match(frontmatterRegex);
            
            if (match && match[1]) {
                const yaml = match[1];
                // Simple YAML parsing - for complex cases you might want a proper YAML parser
                const properties: Record<string, any> = {};
                
                const lines = yaml.split('\n');
                for (const line of lines) {
                    const keyValueMatch = line.match(/(.+?)\s*:\s*(.*)/);
                    if (keyValueMatch) {
                        const [, key, value] = keyValueMatch;
                        properties[key.trim()] = value.trim();
                    }
                }
                
                return properties;
            }
        } catch (error) {
            console.error(`Error parsing frontmatter for ${file.path}:`, error);
        }
        
        return null;
    }

    // Event handler based on the trigger mode
    setupTriggerMode() {
        // Remove previous event listener if it exists
        if (this.folderClickHandler) {
            document.removeEventListener('click', this.folderClickHandler, true);
        }

        // Only set up click detection if using a click trigger mode
        if (this.settings.triggerMode !== 'command-only') {
            this.folderClickHandler = this.createFolderClickHandler();
            document.addEventListener('click', this.folderClickHandler, true);
        }
    }

    // Create the event handler based on the current trigger mode
    createFolderClickHandler() {
        return (event: MouseEvent) => {
            // Check for the correct modifier key based on settings
            const modifierActive = 
                (this.settings.triggerMode === 'alt-click' && event.altKey) ||
                (this.settings.triggerMode === 'ctrl-click' && event.ctrlKey) ||
                (this.settings.triggerMode === 'shift-click' && event.shiftKey);
            
            if (!modifierActive) return;
            
            // Find if user clicked on a folder in the file explorer
            const target = event.target as HTMLElement;
            const folderTitleEl = target.closest('.nav-folder-title');
            
            if (!folderTitleEl) return;
            
            // Get the folder path from the data attribute
            const folderPath = folderTitleEl.getAttribute('data-path');
            if (!folderPath) return;
            
            // Find the corresponding folder object
            const folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!(folder instanceof TFolder)) return;
            
            // Prevent default navigation
            event.preventDefault();
            event.stopPropagation();
            
            // Create or open the folder dashboard
            this.createFolderDashboard(folder);
        };
    }

    // Create the event handler based on the current trigger mode
    async setupFolderClickInterception() {
        // Handle regular clicks on folders that have dashboards
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            // Don't process if modifier keys are used (handled by other handler)
            if (evt.altKey || evt.ctrlKey || evt.shiftKey) return;
            
            // Get clicked element
            const target = evt.target as Element;
            const folderTitleEl = target.closest('.nav-folder-title');
            
            // Only process if we clicked on a folder title
            if (!folderTitleEl) return;
            
            // Check if this folder has a dashboard
            const folderPath = folderTitleEl.getAttribute('data-path');
            if (!folderPath) return;
            
            const folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!(folder instanceof TFolder)) return;
            
            // Check for dashboard file
            const dashboardPath = `${folderPath}/${folder.name}.md`;
            const dashboardFile = this.app.vault.getAbstractFileByPath(dashboardPath);
            
            // If dashboard exists, intercept the click
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
    }

    // Helper method for file metadata in HTML
    async getFileMetadataHTML(file: TFile): Promise<string> {
        let metadata = '';
        
        if (this.settings.showFileCreationDate || this.settings.showFileModificationDate) {
            metadata += ' <span class="file-metadata">';
            
            if (this.settings.showFileCreationDate) {
                const created = file.stat.ctime;
                const createdDate = new Date(created).toLocaleDateString();
                metadata += `(Created: ${createdDate}) `;
            }
            
            if (this.settings.showFileModificationDate) {
                const modified = file.stat.mtime;
                const modifiedDate = new Date(modified).toLocaleDateString();
                metadata += `(Modified: ${modifiedDate})`;
            }
            
            metadata += '</span>';
        }
        
        return metadata;
    }

    // Find and mark all dashboard files in the explorer
    markDashboardFiles() {
        // Find all markdown files that have the same name as their parent folder
        const files = this.app.vault.getMarkdownFiles();
        
        for (const file of files) {
            // Check if file basename matches parent folder name
            const folder = file.parent;
            if (folder && file.basename === folder.name) {
                this.markFileInExplorer(file);
            }
        }
    }

    // Helper to mark a single file
    markFileInExplorer(file: TFile) {
        setTimeout(() => {
            // Use the file path to find the file element in the explorer
            const fileEl = document.querySelector(
                `.nav-file-title[data-path="${file.path}"]`
            )?.parentElement;
            
            if (fileEl) {
                // Add class for styling/hiding
                fileEl.addClass('is-dashboard-file');
            }
        }, 100);
    }

    getActiveFolderFromExplorer(): TFolder | null {
        // Try to get the active file explorer view
        const fileExplorer = this.app.workspace.getLeavesOfType('file-explorer')[0];
        if (!fileExplorer) return null;
        
        // Get the selected element from the file explorer
        const selectedEl = fileExplorer.view.containerEl.querySelector('.nav-folder.is-active');
        if (!selectedEl) return null;
        
        // Find the folder title element to get the path
        const folderTitleEl = selectedEl.querySelector('.nav-folder-title');
        if (!folderTitleEl) return null;
        
        // Get path from the data attribute
        const folderPath = folderTitleEl.getAttribute('data-path');
        if (!folderPath) return null;
        
        // Get the folder object from the path
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!(folder instanceof TFolder)) return null;
        
        return folder;
    }

    updateDashboardsForPath(path: string) {
        // Find all possible affected folders
        const pathParts = path.split('/');
        let currentPath = '';
        
        // Check each parent folder in the path
        for (const part of pathParts) {
            if (currentPath) {
                currentPath += '/';
            }
            currentPath += part;
            
            // Check if this folder has a dashboard
            const dashboardPath = `${currentPath}/${part}.md`;
            const dashboardFile = this.app.vault.getAbstractFileByPath(dashboardPath);
            const folder = this.app.vault.getAbstractFileByPath(currentPath);
            
            if (dashboardFile instanceof TFile && folder instanceof TFolder) {
                this.updateFolderDashboard(folder, dashboardFile);
            }
        }
    }
}