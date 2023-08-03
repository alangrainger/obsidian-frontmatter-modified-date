import { App, Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian'

interface FrontmatterModifiedSettings {
  frontmatterProperty: string;
  momentFormat: string;
  excludedFolders: string[];
}

const DEFAULT_SETTINGS: FrontmatterModifiedSettings = {
  frontmatterProperty: 'modified',
  momentFormat: '',
  excludedFolders: []
}

export default class FrontmatterModified extends Plugin {
  settings: FrontmatterModifiedSettings
  timer: { [key: string]: NodeJS.Timeout } = {}

  async onload () {
    await this.loadSettings()

    this.registerEvent(this.app.vault.on('modify', (file) => {
      /*
      Use a timeout to update the metadata only once the user has stopped typing.
      If the user keeps typing, then it will reset the timeout and start again from zero.

      Obsidian doesn't appear to correctly handle this situation otherwise, and pops an
      error to say "<File> has been modified externally, merging changes automatically."
      */
      if (file instanceof TFile && this.settings.excludedFolders.every(folder => !file.path.startsWith(folder + '/')) ) {
        clearTimeout(this.timer[file.path])
        this.timer[file.path] = setTimeout(() => {
          this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            frontmatter[this.settings.frontmatterProperty] = moment().format(this.settings.momentFormat)
          })
        }, 12 * 1000)
      }
    }))

    this.addSettingTab(new FrontmatterModifiedSettingTab(this.app, this))
  }

  async loadSettings () {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings () {
    await this.saveData(this.settings)
  }
}

class FrontmatterModifiedSettingTab extends PluginSettingTab {
  plugin: FrontmatterModified

  constructor (app: App, plugin: FrontmatterModified) {
    super(app, plugin)
    this.plugin = plugin
  }

  display (): void {
    const { containerEl } = this

    containerEl.empty()
    containerEl.createEl('h2', { text: 'Update modified date settings' })

    // Frontmatter property setting
    new Setting(containerEl)
      .setName('Frontmatter property')
      .setDesc('The name of the YAML/frontmatter property to update')
      .addText(text => text
        .setPlaceholder('modified')
        .setValue(this.plugin.settings.frontmatterProperty)
        .onChange(async (value) => {
          this.plugin.settings.frontmatterProperty = value
          await this.plugin.saveSettings()
        }))

    // Date format setting
    new Setting(containerEl)
      .setName('Date format')
      .setDesc('This is in MomentJS format. Leave blank for the default ATOM format.')
      .addText(text => text
        .setPlaceholder('ATOM format')
        .setValue(this.plugin.settings.momentFormat)
        .onChange(async (value) => {
          this.plugin.settings.momentFormat = value
          await this.plugin.saveSettings()
        }))

    // Exclude folders
    new Setting(containerEl)
      .setName('Exclude folders')
      .setDesc('Add a list of folders to exclude, one folder per line. All subfolders will be also excluded.')
      .addTextArea(text => text
        .setValue(this.plugin.settings.excludedFolders.join('\n'))
        .onChange(async (value) => {
          this.plugin.settings.excludedFolders = value.split('\n').map(x => x.trim()).filter(x => !!x)
          await this.plugin.saveSettings()
        }))
  }
}