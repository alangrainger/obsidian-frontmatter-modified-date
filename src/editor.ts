import { EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { editorInfoField, TFile } from 'obsidian';
import FrontmatterModified from 'main';

/**
 * `UserChangeListener` wrapper, should be registered through `plugin.registerEditorExtension()`
 */
export const userChangeListenerExtension = (plugin: FrontmatterModified) => ViewPlugin.define(view => {
  return new UserChangeListener(plugin, view)
})

/**
 * Watch for any explicit user change and update the timestamp when found.
 * 
 * Therefore, any external change and the change that happens without explicit user interaction,
 * e.g multiple editors holding the same note while some of them have a change made by another editor,
 * will be ignored.
 * 
 * Only works if `useKeyupEvents` is set to `true`.
 */
class UserChangeListener implements PluginValue {
  plugin: FrontmatterModified
  file: TFile | null

  constructor (plugin: FrontmatterModified, view: EditorView) {
    this.plugin = plugin
    this.file = view.state.field(editorInfoField).file
  }

  update (update: ViewUpdate) {
    if (!this.file || !this.plugin.settings.useKeyupEvents) {
      return
    }

    if (isUserChange(update)) {
      this.plugin.updateFrontmatter(this.file)
    }
  }
}

/**
 * Check whether the given update is resulted by user event(s)
 */
function isUserChange (update: ViewUpdate) {
  // No change happens, or the change that happens because of opening another note in the same editor
  if (!update.docChanged || update.transactions.some(tr => tr.isUserEvent('set'))) {
    return false
  }
  return update.transactions.some(tr => {
    // See https://codemirror.net/docs/ref/#state.Transaction^userEvent
    return tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('move')
  })
}