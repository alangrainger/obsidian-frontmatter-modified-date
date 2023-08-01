import { App, Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian'

interface FrontmatterModifiedSettings {
  frontmatterProperty: string;
  momentFormat: string;
}

const DEFAULT_SETTINGS: FrontmatterModifiedSettings = {
  frontmatterProperty: 'modified',
  momentFormat: ''
}

export default class FrontmatterModified extends Plugin {
  settings: FrontmatterModifiedSettings
  timer: NodeJS.Timeout

  async onload () {
    await this.loadSettings()

    this.registerEvent(this.app.vault.on('modify', (file) => {
      /*
      Use a timeout to update the metadata only once the user has stopped typing.
      If the user keeps typing, then it will reset the timeout and start again from zero.

      Obsidian doesn't appear to correctly handle this situation otherwise, and pops an
      error to say "<File> has been modified externally, merging changes automatically."
       */
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        if (file instanceof TFile) {
          this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            frontmatter[this.settings.frontmatterProperty] = moment().format(this.settings.momentFormat)
          })
        }
      }, 15 * 1000)
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

    // Frontmatter property setting
    new Setting(containerEl)
      .setName('Frontmatter property')
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
      .setDesc('This is in MomentJS format')
      .addText(text => text
        .setPlaceholder('Leave blank for default ATOM format')
        .setValue(this.plugin.settings.momentFormat)
        .onChange(async (value) => {
          this.plugin.settings.momentFormat = value
          await this.plugin.saveSettings()
        }))
  }
}