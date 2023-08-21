![](https://img.shields.io/github/license/alangrainger/obsidian-frontmatter-modified-date) ![](https://img.shields.io/github/v/release/alangrainger/obsidian-frontmatter-modified-date?style=flat-square) ![](https://img.shields.io/github/downloads/alangrainger/obsidian-frontmatter-modified-date/total)

# Update frontmatter modified date

This plugin will automatically update a modified property in your frontmatter/YAML when you edit a note.

This is different from other plugins in that it does not use the filesystem modified time. The frontmatter will only
update when you actually work on a file inside Obsidian.

## Options

- Specify whatever YAML field name you prefer.
- Specify the date format, using [MomentJS format](https://momentjs.com/docs/#/displaying/format/).
- Exclude folders which you don't want to be automatically updated. This is important for anywhere you store your scripts or Templater templates.
