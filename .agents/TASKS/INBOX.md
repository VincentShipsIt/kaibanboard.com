# Task Inbox

Quick capture for tasks to be triaged.

---

## Human QA (Blocking Production)

### Monorepo Setup - @kaibanboard/cli Release

- [x] Create @kaibanboard npm organization/namespace
- [ ] Run `bun install` at project root to link workspaces
- [ ] Run `bun run build` to verify all packages compile
- [ ] Test CLI locally: `cd packages/cli && node dist/index.js`
- [ ] Test extension locally: `cd packages/vscode && bun run compile` then F5 in Cursor
- [ ] Verify `kai` command works after npm link: `cd packages/cli && npm link && kai`
- [ ] Publish @kaibanboard/core to npm (if making public) or keep internal
- [ ] Publish @kaibanboard/cli to npm: `cd packages/cli && npm publish --access public`
- [ ] Package extension: `cd packages/vscode && bun run package`
- [ ] Publish extension to VS Code marketplace
- [ ] Update README with CLI installation: `npm i -g @kaibanboard/cli`
- [ ] Update README with CLI usage: `kai` or `kai /path/to/project`

---

## New Tasks

- [ ] Add task filtering by priority
- [ ] Add task search functionality
- [ ] Keyboard shortcuts for common actions
- [ ] Task templates feature
- [ ] Export board as image

---

**Last Updated:** 2026-01-15
