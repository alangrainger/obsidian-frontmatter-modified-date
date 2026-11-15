import { moment } from 'obsidian'

const en = {
  modifiedDateProperty: 'Modified date property',
  modifiedDatePropertyDesc: 'The name of the YAML/frontmatter property to update when your note is modified',
  modified: 'Modified',
  createdDateProperty: 'Created date property (optional)',
  createdDatePropertyDesc: 'Optional. Add a created property name, and the plugin will also update the note creation date.',
  created: 'Created',
  dateFormat: 'Date format',
  dateFormatDesc: 'This is in momentjs format. Leave blank for the default atom format.',
  atomFormat: 'Atom format',
  dateLocale: 'Date locale',
  dateLocaleDesc: 'Specify a locale format for momentjs to use. Available locales are here: ',
  momentjsLocales: 'Momentjs locales',
  storeHistory: 'Store history of all updates',
  updateFrequency: 'Frequency of updates',
  updateFrequencyDesc: 'The plugin will store a maximum of 1 history entry per minute, hour, day, etc. If there are multiple edits in the specified period, the last edit entry will be updated instead.',
  historyOrder: 'Order to store the history items',
  newestFirst: 'Newest item at start of list',
  oldestFirst: 'Oldest item at start of list',
  maxHistory: 'Maximum number of history items',
  maxHistoryDesc: 'Leave blank or zero for unlimited history items.',
  unlimited: 'Unlimited',
  excludeFolders: 'Exclude folders',
  excludeFoldersDesc: 'Add a list of folders to exclude, one folder per line. All subfolders will be also excluded.',
  onlyExisting: 'Only update existing fields',
  onlyExistingDesc: 'If you turn this on, it will only update a frontmatter field *if that field already exists*.',
  typingEvents: 'Use typing events instead of Obsidian events',
  typingEventsDesc: `If you make changes to a file using an external editor and Obsidian is currently open, Obsidian
will register this as a modification and update the frontmatter. If you don't want this to happen, and only
want the frontmatter when you are making changes inside Obsidian, you can try this mode. It watches for typing
events, and then updates the frontmatter only when you type. This means that some events like updating your note
or properties using your mouse will not cause the modified field to update.`,
  timeout: 'Timeout (seconds)',
  timeoutDesc: 'How many seconds to wait after the last edit before updating the modified field. You can increase this value if you are experiencing too many "merging changes" popups.',
  storeHistoryDesc: (property: string) => `Instead of storing only the last modified time, this will turn your "${property}" frontmatter property into a list of all of the dates/times you've edited this note.`
}

const zh = {
  ...en,
  modifiedDateProperty: '修改日期属性',
  modifiedDatePropertyDesc: '笔记被修改时要更新的 YAML/frontmatter 属性名称',
  modified: '修改日期',
  createdDateProperty: '创建日期属性（可选）',
  createdDatePropertyDesc: '可选。添加一个创建日期属性名称，插件也会更新笔记的创建日期。',
  created: '创建日期',
  dateFormat: '日期格式',
  dateFormatDesc: '使用 momentjs 格式。留空则使用默认的 Atom 格式。',
  atomFormat: 'Atom 格式',
  dateLocale: '日期语言',
  dateLocaleDesc: '指定 momentjs 使用的语言格式。可用语言见：',
  momentjsLocales: 'Momentjs 语言列表',
  storeHistory: '保存所有更新历史',
  updateFrequency: '更新频率',
  updateFrequencyDesc: '插件每分钟、每小时、每天等最多保存一条历史记录。如果指定时间段内有多次编辑，将更新最后一条记录。',
  historyOrder: '历史记录排序',
  newestFirst: '最新记录在列表开头',
  oldestFirst: '最早记录在列表开头',
  maxHistory: '历史记录数量上限',
  maxHistoryDesc: '留空或填 0 表示不限制历史记录数量。',
  unlimited: '不限制',
  excludeFolders: '排除文件夹',
  excludeFoldersDesc: '每行添加一个要排除的文件夹。其中的所有子文件夹也会被排除。',
  onlyExisting: '仅更新已有字段',
  onlyExistingDesc: '开启后，仅在 frontmatter 字段*已经存在*时才更新该字段。',
  typingEvents: '使用输入事件代替 Obsidian 事件',
  typingEventsDesc: `如果使用外部编辑器修改文件且 Obsidian 当前处于打开状态，Obsidian 会将其记录为修改并更新 frontmatter。如果不希望这样，而只想在 Obsidian 内编辑时更新 frontmatter，可以尝试此模式。它会监听输入事件，只在输入时更新 frontmatter。因此，使用鼠标更新笔记或属性等操作不会触发修改字段更新。`,
  timeout: '超时（秒）',
  timeoutDesc: '最后一次编辑后等待多少秒再更新修改日期字段。如果经常出现“合并更改”弹窗，可以增大此值。',
  storeHistoryDesc: (property: string) => `不只保存最后一次修改时间，而是将 "${property}" frontmatter 属性保存为此笔记所有编辑日期/时间的列表。`
}

type TranslationKey = keyof typeof en

function normalizedLanguage (): 'en' | 'zh' {
  const locale = (moment.locale() || 'en').toLowerCase().replace('_', '-')
  return locale === 'zh' || locale.startsWith('zh-') ? 'zh' : 'en'
}

export function t (key: TranslationKey): string {
  return (normalizedLanguage() === 'zh' ? zh : en)[key] as string
}

export function storeHistoryDesc (property: string): string {
  return (normalizedLanguage() === 'zh' ? zh.storeHistoryDesc(property) : en.storeHistoryDesc(property))
}

const unitLabels = {
  en: {
    minute: 'minute',
    hour: 'hour',
    day: 'day',
    week: 'week',
    month: 'month',
    quarter: 'quarter',
    year: 'year'
  },
  zh: {
    minute: '分钟',
    hour: '小时',
    day: '天',
    week: '周',
    month: '月',
    quarter: '季度',
    year: '年'
  }
}

export type StartOfUnit = keyof typeof unitLabels.en

export function unitLabel (unit: string): string {
  const labels = normalizedLanguage() === 'zh' ? unitLabels.zh : unitLabels.en
  return labels[unit as StartOfUnit] ?? unit
}
