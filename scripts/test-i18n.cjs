const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/i18n.ts'), 'utf8')
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText

function load (apiLanguage, storedLanguage, storageThrows = false) {
  let dateLocale = 'en'
  const obsidian = { moment: { locale: value => value ? (dateLocale = value) : dateLocale } }
  if (apiLanguage !== undefined) obsidian.getLanguage = () => apiLanguage
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: name => {
      assert.equal(name, 'obsidian')
      return obsidian
    },
    window: {
      localStorage: {
        getItem: key => {
          assert.equal(key, 'language')
          if (storageThrows) throw new Error('Storage unavailable')
          return storedLanguage
        }
      }
    }
  })
  return { ...module.exports, setDateLocale: value => obsidian.moment.locale(value) }
}

test('UI language takes priority and survives date locale changes', () => {
  for (const language of ['zh', 'zh-CN', 'zh_TW', 'ZH-HK']) {
    const i18n = load(language, 'en')
    for (const locale of ['en', 'zh-cn', 'fr']) {
      i18n.setDateLocale(locale)
      assert.equal(i18n.t('modifiedDateProperty'), '修改日期属性')
      assert.equal(i18n.unitLabel('minute'), '分钟')
      assert.ok(i18n.storeHistoryDesc('folder/修改时间').includes('folder/修改时间'))
      assert.ok(i18n.storeHistoryDesc('modified').includes('不只保存'))
    }
  }
  const english = load('en', 'zh')
  english.setDateLocale('zh-cn')
  assert.equal(english.t('modifiedDateProperty'), 'Modified date property')
  assert.equal(english.unitLabel('minute'), 'minute')
  assert.ok(english.storeHistoryDesc('modified').startsWith('Instead of storing only'))
})

test('older APIs use stored UI language and default to English', () => {
  assert.equal(load(undefined, 'zh_CN').t('modifiedDateProperty'), '修改日期属性')
  for (const language of [null, '', 'en', 'fr', 'de']) {
    const i18n = load(undefined, language)
    i18n.setDateLocale('zh-cn')
    assert.equal(i18n.t('modifiedDateProperty'), 'Modified date property')
    for (const unit of ['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year']) {
      assert.equal(i18n.unitLabel(unit), unit)
    }
    assert.equal(i18n.unitLabel('custom-unit'), 'custom-unit')
  }
  assert.equal(load(undefined, null, true).t('modifiedDateProperty'), 'Modified date property')
  assert.equal(load('', 'zh').t('modifiedDateProperty'), '修改日期属性')
  assert.equal(load('en', null, true).t('modifiedDateProperty'), 'Modified date property')
})
