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
      this.registerDomEvent(document, 'input', (event: InputEvent) => {
        // Check to see if the inputted key is a single, visible Unicode character.
        // This is to prevent matching arrow keys, etc. Using Unicode is necessary
        // to match on emoji and other 2-byte characters.
        try {
          if ((event?.target as HTMLElement)?.closest('.markdown-source-view > .cm-editor')) {
            // Check to see if the inputted key is a single, visible Unicode character.
            // This is to prevent matching arrow keys, etc. Using Unicode is necessary
            // to match on emoji and other 2-byte characters.
            if (/^.$/u.test(event.data || '')) {
              const file = this.app.workspace.getActiveFile()
              if (file instanceof TFile) {
                this.updateFrontmatter(file).then()
              }
            }
          }
        } catch (e) {}
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
        // Update the modified date field
        //
        // We will only update if it's been at least 30 seconds since the last recorded time. We do this
        // as a preventative measure against a race condition where two devices have the same note open
        // and are both syncing and updating each other.
        // Are we appending to an array of entries?
        const now = moment()
        const isAppendArray = this.settings.storeHistoryLog || cache?.frontmatter?.[this.settings.appendField] === true
        const desc = this.settings.historyNewestFirst
        let secondsSinceLastUpdate = Infinity
        let previousEntryMoment
        if (cache?.frontmatter?.[this.settings.frontmatterProperty]) {
          let previousEntry = cache?.frontmatter?.[this.settings.frontmatterProperty]
          if (isAppendArray && Array.isArray(previousEntry)) {
            // If we are using an array of updates, get the last item in the list
            previousEntry = previousEntry[desc ? 0 : previousEntry.length - 1]
          }
          // Get the length of time since the last update. Use a strict moment
          previousEntryMoment = moment(previousEntry, this.settings.momentFormat)
          if (previousEntryMoment.isValid()) {
            secondsSinceLastUpdate = now.diff(previousEntryMoment, 'seconds')
          }
        }

        if (secondsSinceLastUpdate > 30) {
          type StringOrInteger = string | number
          let newEntry: StringOrInteger | StringOrInteger[] = this.formatFrontmatterDate(now)

          if (isAppendArray) {
            let entries = cache?.frontmatter?.[this.settings.frontmatterProperty] || []
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

          // Update the frontmatter
          this.app.fileManager.processFrontMatter(file, frontmatter => {
            // Update the modified date field
            frontmatter[this.settings.frontmatterProperty] = newEntry

            // Create a created date field if requested
            if (!this.settings.onlyUpdateExisting && this.settings.createdDateProperty && !frontmatter[this.settings.createdDateProperty]) {
              frontmatter[this.settings.createdDateProperty] = this.formatFrontmatterDate(moment(file.stat.ctime))
            }
          })
        }
      }
    }, this.settings.timeout * 1000)
  }

  /**
   * Outputs the date in the user's specified MomentJS format.
   * If that format evalutes to an integer it will return an integer,
   * otherwise a string.
   */
  formatFrontmatterDate (date: moment.Moment): string | number {
    const output = date.format(this.settings.momentFormat)
    if (output.match(/^\d+$/)) {
      // The date is numeric/integer format
      return parseInt(output, 10)
    } else {
      return output
    }
  }
}
