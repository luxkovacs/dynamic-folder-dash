# Dynamic Folder Dashboard

An Obsidian plugin that creates interactive dashboards for your folders with real-time updates and customizable views.

## Features

- **Dynamic Folder Dashboards**: Automatically generate content dashboards for any folder
- **Multiple View Types**: Choose between Simple List, Card View, or Column View
- **Real-time Updates**: Dashboards automatically reflect changes to folder contents
- **Metadata Display**: Optionally show creation and modification dates for files
- **Custom Styling**: Add your own CSS to customize the appearance
- **Configurable Trigger**: Create dashboards with keyboard shortcuts or commands
- **Dashboard File Hiding**: Option to hide the dashboard files in the file explorer

## Installation

### From Obsidian Community Plugins (Coming Soon)

1. Open Obsidian Settings
2. Go to Community Plugins and turn off Safe Mode
3. Click Browse and search for "Dynamic Folder Dashboard"
4. Install and enable the plugin

### Manual Installation

1. Download the latest release from the GitHub repository
2. Extract the zip file
3. Move the extracted folder to your vault's `.obsidian/plugins/` directory
4. Enable the plugin in Obsidian settings

## Usage

### Creating a Dashboard

There are multiple ways to create a folder dashboard:

1. **Command Palette**: Use the command "Dynamic Folder Dashboard: Create folder dashboard"
2. **Context Menu**: Right-click on a folder and select "Create folder dashboard"
3. **Keyboard + Click**: Use the configured trigger (Alt+Click, Ctrl+Click, or Shift+Click) on any folder

### View Types

The plugin offers several view types for displaying folder contents:

#### Simple List View

A clean, hierarchical list of subfolders and files with optional metadata.

#### Card View

A grid of cards representing folders and files, with visual icons and metadata.

#### Column View

A two-column layout with folders on the left and files on the right.

## Settings

### General Settings

- **Hide folder note file in sidebar**: Hides the dashboard files in the file explorer
- **Hide folder contents in sidebar**: Optionally hide folder contents when a dashboard exists
- **Creation trigger**: Choose how to trigger dashboard creation (Command only, Alt+Click, Ctrl+Click, or Shift+Click)

### Display Settings

- **View Type**: Choose the default appearance style for dashboards
- **Show file creation date**: Display when files were created
- **Show file modification date**: Display when files were last modified
- **Include frontmatter**: Show file frontmatter properties in dashboards

### Advanced Settings

- **Custom CSS**: Add your own CSS rules to customize the dashboard appearance

## Credits

This plugin was inspired by the excellent [Folder Note](https://github.com/xpgo/obsidian-folder-note) plugin by xpgo. While Dynamic Folder Dashboard offers a different take on the concept with its own implementation and feature set, we appreciate the groundwork laid by the Folder Note plugin.

## License

MIT

## Support

If you encounter issues or have feature suggestions, please open an issue on the GitHub repository.

---

Developed with ❤️ for the Obsidian community.