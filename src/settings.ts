import { App, PluginSettingTab, Setting, TFolder } from 'obsidian'
import FrontmatterModified from './main'
import { unitOfTime } from 'moment'
import { LabeledSuggestModal } from "suggesterFuzzy"

export interface FrontmatterModifiedSettings {
  frontmatterProperty: string;
  createdDateProperty: string;
  momentFormat: string;
  storeHistoryLog: boolean;
  historyNewestFirst: boolean;
  historyMaxItems: number;
  excludedFolders: string[];
  useKeyupEvents: boolean;
  onlyUpdateExisting: boolean;
  timeout: number;
  excludeField: string;
  appendField: string;
  appendMaximumFrequency: unitOfTime.StartOf;
}

// export interface Folder {
//   name: string;
//   path: string;
// }
export const DEFAULT_SETTINGS: FrontmatterModifiedSettings = {
  frontmatterProperty: 'modified',
  createdDateProperty: '',
  momentFormat: '',
  storeHistoryLog: false,
  historyNewestFirst: false,
  historyMaxItems: 0,
  excludedFolders: [],
  useKeyupEvents: false,
  onlyUpdateExisting: false,
  timeout: 10,
  excludeField: 'exclude_modified_update',
  appendField: 'append_modified_update',
  appendMaximumFrequency: 'day' // Append a maximum of 1 row per 'unit'
}

export class FrontmatterModifiedSettingTab extends PluginSettingTab {
  plugin: FrontmatterModified

  constructor (app: App, plugin: FrontmatterModified) {
    super(app, plugin)
    this.plugin = plugin
  }

  display (): void {
    const { containerEl } = this

    containerEl.empty()

    // Modified date property
    new Setting(containerEl)
      .setName('Modified date property')
      .setDesc('The name of the YAML/frontmatter property to update when your note is modified')
      .addText(text => text
        .setPlaceholder('modified')
        .setValue(this.plugin.settings.frontmatterProperty)
        .onChange(async value => {
          this.plugin.settings.frontmatterProperty = value
          await this.plugin.saveSettings()
        }))
    // Created date property
    new Setting(containerEl)
      .setName('Created date property (optional)')
      .setDesc('Optional. Add a created property name, and the plugin will also update the note creation date.')
      .addText(text => text
        .setPlaceholder('created')
        .setValue(this.plugin.settings.createdDateProperty)
        .onChange(async value => {
          this.plugin.settings.createdDateProperty = value
          await this.plugin.saveSettings()
        }))

    // Date format setting
    new Setting(containerEl)
      .setName('Date format')
      .setDesc('This is in MomentJS format. Leave blank for the default ATOM format.')
      .addText(text => text
        .setPlaceholder('ATOM format')
        .setValue(this.plugin.settings.momentFormat)
        .onChange(async value => {
          this.plugin.settings.momentFormat = value
          await this.plugin.saveSettings()
        }))

    // Store history as list or single value
    new Setting(containerEl)
      .setName('Store history of all updates')
      .setDesc(`Instead of storing only the last modified time, this will turn your "${this.plugin.settings.frontmatterProperty}" frontmatter property into a list of all of the dates/times you've edited this note.`)
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.storeHistoryLog)
          .onChange(async value => {
            this.plugin.settings.storeHistoryLog = value
            await this.plugin.saveSettings()
            this.display()
          })
      })
    if (this.plugin.settings.storeHistoryLog) {
      new Setting(containerEl)
        .setName('Frequency of updates')
        .setDesc('The plugin will store a maximum of 1 history entry per minute, hour, day, etc. If there are multiple edits in the specified period, the last edit entry will be updated instead.')
        .addDropdown(dropdown => {
          ['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year']
            .forEach(unit => dropdown.addOption(unit, unit))
          dropdown
            .setValue(this.plugin.settings.appendMaximumFrequency || '')
            .onChange(async (value) => {
              this.plugin.settings.appendMaximumFrequency = value as unitOfTime.StartOf
              await this.plugin.saveSettings()
            })
        })
      new Setting(containerEl)
        .setName('Order to store the history items')
        .addDropdown(dropdown => {
          dropdown.addOption('newest', 'Newest item at start of list')
          dropdown.addOption('oldest', 'Oldest item at start of list')
          dropdown
            .setValue(this.plugin.settings.historyNewestFirst ? 'newest' : 'oldest')
            .onChange(async (value) => {
              this.plugin.settings.historyNewestFirst = value === 'newest'
              await this.plugin.saveSettings()
            })
        })
      new Setting(containerEl)
        .setName('Maximum number of history items')
        .setDesc('Leave blank or zero for unlimited history items.')
        .addText(text => text
          .setPlaceholder('Unlimited')
          .setValue(this.plugin.settings.historyMaxItems === 0 ? '' : this.plugin.settings.historyMaxItems.toString())
          .onChange(async value => {
            const num = parseInt(value, 10)
            this.plugin.settings.historyMaxItems = num > 0 ? num : 0
            await this.plugin.saveSettings()
          }))
    }

    new Setting(containerEl)
      .setName('Vault options')
      .setHeading()

    // Exclude folders
    for (let [index, folders] of this.plugin.settings.excludedFolders.entries()) {

      const f = new Setting(containerEl)
        .setName("Excluded folder")
        f.addText((text) =>
          text
          .setPlaceholder('Exclude folder')
          .setValue(this.plugin.settings.excludedFolders[index])
          .onChange(async (value) => {
            this.plugin.settings.excludedFolders[index] = value;
            await this.plugin.saveSettings();
          })
        );

      // Folder delete button
      f.addButton((el) =>
        el
          .setButtonText(`Delete `).setIcon("trash")
          .onClick(async () => {
            this.plugin.settings.excludedFolders.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          })
        );
      };

    // Folder add button
    new Setting(this.containerEl)
      .setName("Add excluded folder")
      .setDesc("Click the plus folder button to add a folder to exclude")
      .addButton((el) =>
        el.setButtonText("Add Folder").setIcon('folder-plus').onClick(async () => {
          let allFolders = [];
          let allFoldersStr = [];
          let result = this.app.vault.getAllLoadedFiles().filter((file) => file instanceof TFolder);
          for (let i = 0; i < result.length; i++) {
            if (result[i].name !== "") {
              allFolders.push({name: `${result[i].name}`, path: `${result[i].path}`});
              allFoldersStr.push(result[i].path);
            };
          };
          // Get folder selection from user
          let returnedFolderObj = await LabeledSuggestModal.open(allFolders, allFoldersStr, "Select folder to exclude");
          this.plugin.settings.excludedFolders.push(returnedFolderObj.name);
          await this.plugin.saveSettings();
          this.display(); // Update settings display
        })
      );

    // Update existing fields toggle
    new Setting(containerEl)
      .setName('Only update existing fields')
      .setDesc('If you turn this on, it will only update a frontmatter field *if that field already exists*.')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.onlyUpdateExisting)
          .onChange(async value => {
            this.plugin.settings.onlyUpdateExisting = value
            await this.plugin.saveSettings()
          })
      })

    // Use typing events toggle
    new Setting(containerEl)
      .setName('Use typing events instead of Obsidian events')
      .setDesc(`If you make changes to a file using an external editor and Obsidian is currently open, Obsidian
will register this as a modification and update the frontmatter. If you don't want this to happen, and only
want the frontmatter when you are making changes inside Obsidian, you can try this mode. It watches for typing 
events, and then updates the frontmatter only when you type. This means that some events like updating your note 
or properties using your mouse will not cause the modified field to update.`)
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.useKeyupEvents)
          .onChange(async value => {
            this.plugin.settings.useKeyupEvents = value
            await this.plugin.saveSettings()
          })
      })

    // Typing timeout
    new Setting(containerEl)
      .setName('Timeout (seconds)')
      .setDesc('How many seconds to wait after the last edit before updating the modified field. You can increase this value if you are experiencing too many "Merging changes" popups.')
      .addText(text => text
        .setPlaceholder('10')
        .setValue(this.plugin.settings.timeout.toString())
        .onChange(async value => {
          this.plugin.settings.timeout = parseInt(value, 10) || DEFAULT_SETTINGS.timeout
          await this.plugin.saveSettings()
        }))
  }
}
