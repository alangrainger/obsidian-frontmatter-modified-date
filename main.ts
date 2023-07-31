import { Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian'

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

  async onload () {
    await this.loadSettings()

    this.registerEvent(this.app.vault.on('modify', (file) => {
      if (file instanceof TFile) {
        this.app.fileManager.processFrontMatter(file, (frontmatter) => {
          frontmatter[this.settings.frontmatterProperty] = moment().format(this.settings.momentFormat)
        })
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

    containerEl.empty();

    [{
      name: 'Frontmatter property',
      description: '',
      placeholder: 'modified',
      field: 'frontmatterProperty'
    },
      {
        name: 'Date format',
        description: 'This is in MomentJS format',
        placeholder: 'Leave blank for default ATOM format',
        field: 'momentFormat'
      }]
      .forEach(setting => {
        new Setting(containerEl)
          .setName(setting.name)
          .setDesc(setting.description)
          .addText(text => text
            .setPlaceholder(setting.placeholder)
            .setValue(this.plugin.settings[setting.field])
            .onChange(async (value) => {
              this.plugin.settings[setting.field] = value
              await this.plugin.saveSettings()
            }))
      })
  }
}