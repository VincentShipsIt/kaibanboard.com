## Task: Convert CSS to SCSS

**ID:** task-convert-css-to-scss
**Label:** Convert CSS to SCSS
**Description:** Convert the extension from plain CSS to SCSS by adding a Sass compiler, updating build scripts, and refactoring the 1,718-line CSS file using SCSS features (variables, nesting, mixins).
**Type:** Enhancement
**Status:** Done
**CompletedAt:** 2026-01-19
**Priority:** Medium
**Created:** 2026-01-13
**Updated:** 2026-01-13
**PRD:** [Link](../PRDS/convert-css-to-scss.md)

---

## Details

### Implementation Steps

1. **Install Sass Compiler**
   - Add `sass` (Dart Sass) as dev dependency: `bun add -d sass`
   - Verify installation: `bun run sass --version`

2. **Add SCSS Build Scripts**
   - Add to `package.json`:
     - `scss:compile`: Compile SCSS to CSS
     - `scss:watch`: Watch mode for SCSS
   - Install `concurrently` if using parallel watch (or use separate terminals)

3. **Rename CSS to SCSS**
   - Rename `media/styles.css` → `media/styles.scss`
   - Verify file is valid SCSS (existing CSS is valid SCSS)

4. **Update Build Scripts**
   - Update `compile` script to include SCSS: `bun run scss:compile && tsc -p ./`
   - Update `watch` script to watch SCSS files (parallel with TypeScript)
   - Update `package` script to ensure SCSS is compiled
   - Verify `vscode:prepublish` includes SCSS

5. **Refactor to SCSS**
   - Extract VS Code theme variables:
     ```scss
     $vscode-font-family: var(--vscode-font-family);
     $vscode-foreground: var(--vscode-foreground);
     // etc.
     ```
   - Use nesting for component organization:
     - `.task-card` with nested `.task-header`, `.task-meta`
     - `.column` with nested styles
     - `.modal` with nested styles
   - Create mixins for repeated patterns:
     - Button styles
     - Flexbox layouts
     - Transitions
   - Add spacing/color variables where beneficial

6. **Test Build Process**
   - Run `bun run compile` - verify SCSS compiles
   - Run `bun run watch` - verify both TS and SCSS watch
   - Test in Extension Development Host - verify styles load correctly
   - Run `bun run package` - verify final build includes CSS

7. **Verify No Breaking Changes**
   - Confirm `kanbanView.ts` still references `styles.css` (no changes needed)
   - Test extension loads correctly
   - Verify all styles work as before

### Acceptance Criteria

- [x] PRD created
- [ ] Sass installed as dev dependency
- [ ] `styles.css` renamed to `styles.scss`
- [ ] SCSS compilation scripts added
- [ ] Build scripts updated to include SCSS
- [ ] SCSS refactored with variables, nesting, mixins
- [ ] Compiled CSS works in extension
- [ ] Build process verified
- [ ] No code changes needed in TypeScript files

### Files to Modify

- `package.json` - Add sass dependency and scripts
- `media/styles.css` → `media/styles.scss` - Convert and refactor
- `.gitignore` (optional) - Consider adding compiled CSS if not keeping it in git

### Files That DON'T Need Changes

- `src/kanbanView.ts` - Still references `styles.css` (compiled output)
- All other source files - No changes needed

### Notes

- Keep compiled `styles.css` in git for now (easiest distribution)
- Can move to `.gitignore` + compile on install later if desired
- SCSS will compile to same location, so webview code doesn't need changes
- Consider adding source maps for debugging (optional)

### Potential Refactoring Opportunities

1. **Variables** (extract from 1,718 lines):
   - VS Code theme variables (many repeated)
   - Spacing values (padding, margin)
   - Border radius values
   - Font sizes

2. **Nesting** (organize components):
   - `.task-card` component
   - `.column` component
   - `.modal` component
   - `.prd-sidebar` component
   - `.header` component

3. **Mixins** (repeated patterns):
   - Button styles (`.action-btn`, `.play-btn`, etc.)
   - Flexbox utilities
   - Transitions/animations
   - Badge styles

4. **Functions** (if calculations needed):
   - Color manipulation
   - Spacing calculations
