import { App, Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian'

interface FrontmatterModifiedSettings {
  frontmatterProperty: string;
  momentFormat: string;
  excludedFolders: string[];
  useKeyupEvents: boolean;
  onlyUpdateExisting: boolean;
  timeout: number;
}

const DEFAULT_SETTINGS: FrontmatterModifiedSettings = {
  frontmatterProperty: 'modified',
  momentFormat: '',
  excludedFolders: [],
  useKeyupEvents: false,
  onlyUpdateExisting: false,
  timeout: 10
}

export default class FrontmatterModified extends Plugin {
  settings: FrontmatterModifiedSettings
  timer: { [key: string]: number } = {}

  async onload () {
    await this.loadSettings()

    if (!this.settings.useKeyupEvents) {
      /*
       * This is the default mode, where we watch for a change in the editor and then
       * update the frontmatter.
       *
       * For users who experience issues due to external programs modifying their files,
       * they can use the special 'useKeyupEvents' mode below.
       */
      this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => {
        if (info.file instanceof TFile) {
          this.updateFrontmatter(info.file)
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
       * here, please let me know! It works just fine but perhaps there's a better way.
       */
      this.registerDomEvent(document, 'keyup', (ev) => {
        // Check to see if the inputted key is a single, visible Unicode character.
        // This is to prevent matching arrow keys, etc. Using Unicode is necessary
        // to match on emoji and other 2-byte characters.
        if (!ev.ctrlKey && !ev.altKey && !ev.metaKey && /^.$/u.test(ev.key)) {
          try {
            // Check to see if the typing event was in the editor DOM element
            // @ts-ignore
            if (ev.target.closest('.markdown-source-view .cm-editor')) {
              // Find the active TFile inside the editor view
              // @ts-ignore
              this.updateFrontmatter(ev.view.app.workspace.activeEditor.file)
            }
          } catch (e) { }
        }
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
    clearTimeout(this.timer[file.path])
    this.timer[file.path] = window.setTimeout(() => {
      this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (this.settings.onlyUpdateExisting && !frontmatter[this.settings.frontmatterProperty]) {
          // The user has chosen to only update the frontmatter property IF it already exists
          return
        } else if (this.settings.excludedFolders.some(folder => file.path.startsWith(folder + '/'))) {
          // This folder is in the exclusion list
          return
        } else {
          // Update the frontmatter field
          //
          // We will only update if it's been more than 30 seconds since the last recorded time. We do this
          // as a preventative measure against a race condition where two devices have the same note open
          // and are both syncing and updating each other.
          const now = moment()
          let secondsSinceLastUpdate = Infinity
          if (frontmatter[this.settings.frontmatterProperty]) {
            // Get the length of time since the last update. Use a strict moment
            const lastUpdate = moment(frontmatter[this.settings.frontmatterProperty], this.settings.momentFormat, true)
            if (lastUpdate.isValid()) {
              secondsSinceLastUpdate = now.diff(lastUpdate, 'seconds')
            }
          }
          if (secondsSinceLastUpdate > 30) {
            frontmatter[this.settings.frontmatterProperty] = now.format(this.settings.momentFormat)
          }
        }
      })
    }, this.settings.timeout * 1000)
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

    // Update existing fields toggle
    new Setting(containerEl)
      .setName('Only update existing fields')
      .setDesc('If you turn this on, it will only update a frontmatter field *if that field already exists*.')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.onlyUpdateExisting)
          .onChange(async (value) => {
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
	  or properties using your mouse will not cause the modified field to update. You will need to restart Obsidian 
	  after this change.`)
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
