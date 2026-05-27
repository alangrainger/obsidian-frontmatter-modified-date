import obsidianmd from 'eslint-plugin-obsidianmd'
import neostandard from 'neostandard'

const codeFiles = ['**/*.{js,jsx,ts,tsx,mjs,cjs}']

export default [
  {
    ignores: [
      'main.js',
      'node_modules/**',
      'esbuild.config.mjs',
      'version-bump.mjs',
      'eslint.config.mjs',
      'data.json',
      'manifest.json',
      'package-lock.json',
      'tsconfig.json',
      'versions.json',
      '.claude/**'
    ]
  },
  ...obsidianmd.configs.recommended,
  ...neostandard({ ts: true, noJsx: true, semi: false }).map(c =>
    c.rules || c.plugins || c.languageOptions ? { ...c, files: c.files ?? codeFiles } : c
  ),
  {
    files: ['**/*.json'],
    rules: {
      'no-irregular-whitespace': 'off',
      'obsidianmd/no-plugin-as-component': 'off',
      'obsidianmd/no-view-references-in-plugin': 'off',
      'obsidianmd/no-unsupported-api': 'off',
      'obsidianmd/prefer-file-manager-trash-file': 'off',
      'obsidianmd/prefer-instanceof': 'off'
    }
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: { project: './tsconfig.json', sourceType: 'module' }
    },
    rules: {
      'no-void': ['error', { allowAsStatement: true }],
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off'
    }
  }
]
