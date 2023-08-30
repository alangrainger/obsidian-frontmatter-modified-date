import { App, Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian'

interface FrontmatterModifiedSettings {
  frontmatterProperty: string;
  momentFormat: string;
  excludedFolders: string[];
  useKeyupEvents: boolean;
}

const DEFAULT_SETTINGS: FrontmatterModifiedSettings = {
  frontmatterProperty: 'modified',
  momentFormat: '',
  excludedFolders: [],
  useKeyupEvents: false
}

export default class FrontmatterModified extends Plugin {
  settings: FrontmatterModifiedSettings
  timer: { [key: string]: number } = {}

  async onload () {
    await this.loadSettings()

    if (!this.settings.useKeyupEvents) {
      /*
       * This is the default mode, where we watch for the Obsidian 'modify' event on a file
       * and then update the frontmatter.
       *
       * For users who experience issues due to external programs modifying their files,
       * they can use the special 'useKeyupEvents' mode below.
       */
      this.registerEvent(this.app.vault.on('modify', (file) => {
        if (file instanceof TFile) {
          this.updateFrontmatter(file)
        }
      }))
    } else if (this.settings.useKeyupEvents) {
      /*
       * This is a special mode for users who can't rely on Obsidian detecting file changes.
       * Both of these built-in events fire when a file is externally modified:
       *
       * app.vault.on('modify')
       * app.workspace.on('editor-change')
       *
       * This apparently causes issues for people with iCloud, as Obsidian is constantly
       * firing these events when files sync.
       *
       * See this comment: https://forum.obsidian.md/t/51776/20
       * And this thread: https://forum.obsidian.md/t/14874
       *
       * The way I am doing this is probably a "bad" way. Anyone who knows the best practice
       * here, please let me know!
       */
      this.registerDomEvent(document, 'keyup', (ev) => {
        try {
          // @ts-ignore
          if (ev.target.closest('.markdown-source-view')) {
            // @ts-ignore
            this.updateFrontmatter(ev.view.app.workspace.activeEditor.file)
          }
        } catch (e) { }
      })
    }

    this.addSettingTab(new FrontmatterModifiedSettingTab(this.app, this))
  }

  async loadSettings () {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings () {
    await this.saveData(this.settings)
  }

  /**
   * Use a timeout to update the metadata only once the user has stopped typing.
   * If the user keeps typing, then it will reset the timeout and start again from zero.
   *
   * Obsidian doesn't appear to correctly handle this situation otherwise, and pops an
   * error to say "<File> has been modified externally, merging changes automatically."
   *
   * @param {TFile} file
   */
  async updateFrontmatter (file: TFile) {
    if (!this.settings.excludedFolders.some(folder => file.path.startsWith(folder + '/'))) {
      if (this.timer[file.path] === -1) {
        // This file has already had the frontmatter updated, and is now experiencing
        // the second duplicate 'modify' event due to using processFrontMatter().
        // We don't need to take any action here to update the frontmatter.
        delete this.timer[file.path]
      } else {
        // This is the normal update function
        clearTimeout(this.timer[file.path])
        this.timer[file.path] = window.setTimeout(() => {
          this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            frontmatter[this.settings.frontmatterProperty] = moment().format(this.settings.momentFormat)
            // When we update the frontmatter with processFrontMatter(), it fires off a second
            // 'modify' event. Adding this de-duplication ensures we process it just once.
            this.timer[file.path] = -1
          })
        }, 10 * 1000)
      }
    }
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

    new Setting(containerEl)
      .setName('Use typing events instead of Obsidian events')
      .setDesc(`EXPERIMENTAL! If you experience issues with external processes modifying your files and causing
      the frontmatter to update, you can try this mode. It watches for typing events, and then updates the 
      frontmatter only when you type. This means that some events like updating your note or properties using
      your mouse may not cause the modified field to update.`)
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.useKeyupEvents)
          .onChange(async (value) => {
            this.plugin.settings.useKeyupEvents = value
            await this.plugin.saveSettings()
          })
      })
  }
}