# PRD: Convert CSS to SCSS

**Created:** 2026-01-13
**Status:** Draft
**Related Task:** [Link](../TASKS/convert-css-to-scss.md)

---

## Overview

Currently, Kaiban Board uses plain CSS files (1,718 lines in `media/styles.css`). This PRD outlines the conversion to SCSS to improve maintainability, enable variables, nesting, mixins, and better code organization.

## Goals

1. Convert existing CSS to SCSS format
2. Add SCSS compilation to build process
3. Refactor CSS using SCSS features (variables, nesting, mixins)
4. Maintain backward compatibility (compiled output path stays the same)
5. Improve maintainability of styles

## Requirements

### Functional Requirements

#### 1. SCSS Compilation Setup
- **FR1.1**: Install Sass (Dart Sass) as a dev dependency
- **FR1.2**: Add SCSS compilation scripts to `package.json`:
  - `scss:compile` - One-time compilation
  - `scss:watch` - Watch mode for development
- **FR1.3**: Integrate SCSS compilation into existing build workflow
- **FR1.4**: SCSS compiles to same output path (`media/styles.css`) so no code changes needed

#### 2. CSS to SCSS Conversion
- **FR2.1**: Rename `media/styles.css` to `media/styles.scss`
- **FR2.2**: Convert existing CSS (1,718 lines) to valid SCSS
- **FR2.3**: Refactor using SCSS features:
  - Variables for repeated values (colors, spacing, fonts)
  - Nesting for component organization
  - Mixins for repeated patterns
  - Functions for calculations

#### 3. Build Integration
- **FR3.1**: Update `compile` script to compile SCSS before TypeScript
- **FR3.2**: Update `watch` script to watch SCSS files (parallel with TypeScript)
- **FR3.3**: Ensure `package` script includes SCSS compilation
- **FR3.4**: Maintain compatibility with `vscode:prepublish` hook

#### 4. Development Workflow
- **FR4.1**: SCSS watch mode runs alongside TypeScript watch mode
- **FR4.2**: Changes to SCSS automatically compile to CSS
- **FR4.3**: Extension Development Host can reload CSS changes

### Non-Functional Requirements

#### 1. Backward Compatibility
- **NFR1.1**: Webview code in `kanbanView.ts` still references `styles.css` (no changes)
- **NFR1.2**: Compiled output path remains `media/styles.css`
- **NFR1.3**: No runtime changes required

#### 2. Performance
- **NFR2.1**: SCSS compilation should be fast (< 500ms for current file)
- **NFR2.2**: Watch mode should have minimal overhead

#### 3. Maintainability
- **NFR3.1**: Use SCSS variables for VS Code theme variables
- **NFR3.2**: Organize code with nesting (components, states)
- **NFR3.3**: Extract common patterns into mixins

## Technical Notes

### SCSS Compilation

```bash
# One-time compilation
sass media/styles.scss:media/styles.css

# Watch mode
sass --watch media/styles.scss:media/styles.css

# With source maps (optional, for debugging)
sass --source-map media/styles.scss:media/styles.css
```

### Build Script Updates

**Option A: Separate watch processes** (simpler)
```json
{
  "scripts": {
    "scss:compile": "sass media/styles.scss:media/styles.css",
    "scss:watch": "sass --watch media/styles.scss:media/styles.css",
    "compile": "bun run scss:compile && tsc -p ./",
    "watch": "concurrently \"tsc -watch -p ./\" \"bun run scss:watch\"",
    "watch:all": "concurrently \"tsc -watch -p ./\" \"bun run scss:watch\""
  }
}
```

**Option B: Use npm-run-all or similar** (alternative)

### SCSS Refactoring Opportunities

1. **Variables** for VS Code theme variables:
   ```scss
   $vscode-font-family: var(--vscode-font-family);
   $vscode-foreground: var(--vscode-foreground);
   $vscode-background: var(--vscode-editor-background);
   ```

2. **Nesting** for component organization:
   ```scss
   .task-card {
     // styles
     .task-header { }
     .task-meta { }
   }
   ```

3. **Mixins** for repeated patterns:
   ```scss
   @mixin button-base {
     border: none;
     padding: 8px 16px;
     border-radius: 4px;
     cursor: pointer;
   }
   ```

### File Structure

```
media/
├── styles.scss    # SCSS source (new)
└── styles.css     # Compiled CSS (generated, keep in git for now)
```

**Note:** Consider adding `styles.css` to `.gitignore` and compiling on install, but for now keep it committed for easier distribution.

## User Stories

1. **As a developer** working on styles, I want to use SCSS variables so I don't repeat color/spacing values.

2. **As a developer** organizing styles, I want to use nesting so component styles are grouped together.

3. **As a developer** maintaining the codebase, I want mixins for repeated patterns so changes are made in one place.

4. **As a developer** building the extension, I want SCSS to compile automatically so the workflow stays smooth.

## Acceptance Criteria

- [ ] Sass (Dart Sass) installed as dev dependency
- [ ] `media/styles.css` renamed to `media/styles.scss`
- [ ] SCSS compilation scripts added to `package.json`
- [ ] `compile` script includes SCSS compilation
- [ ] `watch` script watches SCSS files
- [ ] SCSS refactored with variables, nesting, and mixins
- [ ] Compiled CSS works correctly in extension
- [ ] Build process produces correct output
- [ ] No code changes needed in `kanbanView.ts`
- [ ] Development workflow remains smooth

## Out of Scope

- CSS module system
- PostCSS processing
- CSS-in-JS solutions
- Moving styles to separate files (could be future enhancement)
- Source maps (can be added later if needed)

## References

- Current CSS: `media/styles.css` (1,718 lines)
- Webview loading: `src/kanbanView.ts` line ~1763
- Build scripts: `package.json`
- Sass documentation: https://sass-lang.com/documentation

---

## Changelog

- 2026-01-13: Initial draft
