![](https://img.shields.io/github/license/alangrainger/obsidian-frontmatter-modified-date) ![](https://img.shields.io/github/v/release/alangrainger/obsidian-frontmatter-modified-date?style=flat-square) ![](https://img.shields.io/github/downloads/alangrainger/obsidian-frontmatter-modified-date/total)

# Update modified field on edit

This plugin will automatically update a modified property in your frontmatter/YAML when you edit a note.

This is different from other plugins in that it does not use the filesystem modified time. The frontmatter will only update when you actually work on a file inside Obsidian.

## Options

- Specify whatever YAML field name you prefer.
- Specify the date format, using [MomentJS format](https://momentjs.com/docs/#/displaying/format/).
- Exclude folders which you don't want to be automatically updated. This is important for anywhere you store your scripts or Templater templates.

## Excluding files

You can exclude a folder and all its subfolders in the Settings page.

If you want to exclude a single file, you can add a property called `exclude_modified_update` and give it a value. Setting it to `true` or using the Checkbox property type would be the most sensible option.

## Append date to history

You can also append the date to an history by adding a property called `append_modified_update` and giving it `true` as a value. This is useful if you want to keep track of every time you edit a note.

> [!WARNING] Removing the `append_modified_update` property from the frontmatter will remove all saved modification dates.

## "Merging changes" popup

It's possible when using this plugin that you will see a message like this, however it should be a rare occurance rather than the norm:

![9kcmzhtlu0l81](https://github.com/alangrainger/obsidian-frontmatter-modified-date/assets/16197738/841e085a-b681-4d5e-ae15-8657b77b048b)

This is due to the way Obsidian itself handles the frontmatter update. If you are typing into a note at the same time that Obsidian updates the frontmatter field, it will show that message. There is no "external" process modifying the file, it is Obsidian itself.

My plugin works by waiting for 10 seconds after you stop typing before updating the frontmatter. By doing it this way it reduces the chance of that message popping up. However, if you start typing again the exact instant Obsidian is updating the frontmatter field, you'll see that message. It won't affect anything, it's just annoying. Hopefully they resolve this at some point.

Please note that you do not need to have the file open for the frontmatter to update. The updates go into a queue and the file will update even after you close it.
