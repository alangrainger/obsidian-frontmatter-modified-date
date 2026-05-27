# Contributing

Issues and pull requests are welcome.

## Reporting bugs

Please include:

- Your Obsidian version and operating system
- The plugin version
- Steps to reproduce, and what you expected vs what happened
- Any relevant frontmatter examples (redact private content)

## Pull requests

- Open a Discussion issue first to discuss non-trivial changes. The plugin is essentially feature-complete as it is.

## Development setup

```bash
npm install
npm run dev      # watch mode
npm run build    # production build
npm run lint     # check code style
```

To test changes in a real vault, symlink this directory into a vault's `.obsidian/plugins/` folder.
