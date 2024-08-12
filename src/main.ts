import { Plugin, TFile, moment } from 'obsidian'
import { DEFAULT_SETTINGS, FrontmatterModifiedSettings, FrontmatterModifiedSettingTab } from './settings'

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
      this.registerEvent(this.app.workspace.on('editor-change', (_editor, info) => {
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
      this.registerDomEvent(document, 'keyup', ev => {
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
      const cache = this.app.metadataCache.getFileCache(file)
      if (this.settings.onlyUpdateExisting && !cache?.frontmatter?.hasOwnProperty(this.settings.frontmatterProperty)) {
        // The user has chosen to only update the frontmatter property IF it already exists

      } else if (cache?.frontmatter?.[this.settings.excludeField]) {
        // This file has been excluded by YAML field

      } else if (this.settings.excludedFolders.some(folder => file.path.startsWith(folder + '/'))) {
        // This folder is in the exclusion list

      } else {
        this.app.fileManager.processFrontMatter(file, frontmatter => {
          // Update the frontmatter field
          //
          // We will only update if it's been more than 30 seconds since the last recorded time. We do this
          // as a preventative measure against a race condition where two devices have the same note open
          // and are both syncing and updating each other.
          const now = moment()
          // Are we appending to an array of entries?
          const isAppendArray = this.settings.storeHistoryLog || frontmatter[this.settings.appendField] === true
          const desc = this.settings.historyNewestFirst
          let secondsSinceLastUpdate = Infinity
          let previousEntryMoment
          if (frontmatter[this.settings.frontmatterProperty]) {
            let previousEntry = frontmatter[this.settings.frontmatterProperty]
            if (isAppendArray && Array.isArray(previousEntry)) {
              // If we are using an array of updates, get the last item in the list
              previousEntry = previousEntry[desc ? 0 : previousEntry.length - 1]
            }
            // Get the length of time since the last update. Use a strict moment
            previousEntryMoment = moment(previousEntry, this.settings.momentFormat, true)
            if (previousEntryMoment.isValid()) {
              secondsSinceLastUpdate = now.diff(previousEntryMoment, 'seconds')
            }
          }
          if (secondsSinceLastUpdate > 30) {
            let newEntry: string | string[] = now.format(this.settings.momentFormat)
            if (isAppendArray) {
              let entries = frontmatter[this.settings.frontmatterProperty] || []
              if (!Array.isArray(entries)) entries = [entries] // In the case where the single previous entry was a string
              // We are using an array of entries. We need to check whether we want to replace the last array
              // entry (e.g. it is within the same timeframe unit), or we want to append a new entry
              if (entries.length) {
                if (previousEntryMoment && now.isSame(previousEntryMoment, this.settings.appendMaximumFrequency)) {
                  // Same timeframe as the previous entry - replace it
                  entries[desc ? 0 : entries.length - 1] = newEntry
                } else {
                  desc ? entries.unshift(newEntry) : entries.push(newEntry)
                }
                // Trim the array if needed
                if (this.settings.historyMaxItems && entries.length > this.settings.historyMaxItems) {
                  entries = desc ? entries.slice(0, this.settings.historyMaxItems) : entries.slice(-this.settings.historyMaxItems)
                }
              } else {
                entries.push(newEntry)
              }
              newEntry = entries
            }
            frontmatter[this.settings.frontmatterProperty] = newEntry
          }
        })
      }
    }, this.settings.timeout * 1000)
  }
}
