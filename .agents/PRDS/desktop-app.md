# PRD: Desktop App

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/desktop-app.md)

---

## Overview

Create standalone desktop applications for macOS, Windows, and Linux using Electron. This allows users to use Kaiban Board without VS Code/Cursor, providing a dedicated workspace for task management and AI-assisted development.

## Goals

1. Standalone app for all major platforms
2. Feature parity with VS Code extension
3. Native OS integration (notifications, file associations)
4. Auto-updates
5. Minimal resource footprint

## Requirements

### Functional Requirements

#### 1. Core Features
- **FR1.1**: Kanban board with drag-and-drop
- **FR1.2**: Task creation and management
- **FR1.3**: PRD creation and editing
- **FR1.4**: CLI execution in embedded terminal
- **FR1.5**: File watching for task updates

#### 2. Platform Support
- **FR2.1**: macOS (Apple Silicon + Intel)
- **FR2.2**: Windows (x64)
- **FR2.3**: Linux (AppImage, .deb, .rpm)
- **FR2.4**: Consistent UI across platforms

#### 3. Native Integration
- **FR3.1**: System notifications for task completion
- **FR3.2**: Menu bar/system tray icon
- **FR3.3**: File association for .md task files
- **FR3.4**: Deep linking (kaiban://open?task=123)
- **FR3.5**: Native file dialogs

#### 4. Auto-Updates
- **FR4.1**: Check for updates on startup
- **FR4.2**: Background download
- **FR4.3**: User prompt to install
- **FR4.4**: Rollback on failed update

#### 5. Settings & Configuration
- **FR5.1**: Settings UI (not JSON editing)
- **FR5.2**: Workspace/project selection
- **FR5.3**: Theme selection (light/dark/system)
- **FR5.4**: CLI configuration

### Non-Functional Requirements

#### 1. Performance
- **NFR1.1**: App launch < 3 seconds
- **NFR1.2**: Memory usage < 200MB idle
- **NFR1.3**: Smooth animations (60fps)

#### 2. Security
- **NFR2.1**: Code signing for macOS
- **NFR2.2**: Code signing for Windows
- **NFR2.3**: Secure auto-update (signed releases)

#### 3. Distribution
- **NFR3.1**: GitHub Releases for downloads
- **NFR3.2**: Homebrew cask for macOS (optional)
- **NFR3.3**: Winget for Windows (optional)

## Technical Notes

### Technology Stack
- **Framework**: Electron
- **UI**: React (reuse extension webview code)
- **Build**: electron-builder
- **Updates**: electron-updater
- **Terminal**: xterm.js

### Project Structure
```
packages/desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts
│   │   ├── menu.ts
│   │   ├── tray.ts
│   │   ├── updates.ts
│   │   └── ipc.ts
│   ├── preload/        # Preload scripts
│   │   └── index.ts
│   └── renderer/       # React UI (shared with extension)
│       ├── App.tsx
│       ├── components/
│       └── hooks/
├── assets/             # Icons, images
├── electron-builder.yml
└── package.json
```

### Code Sharing with Extension
```typescript
// Shared UI components
import { Board, Column, TaskCard } from '@kaibanboard/ui';

// Platform-specific implementations
interface PlatformAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  watchFiles(pattern: string, callback: (event: string, path: string) => void): void;
  executeCommand(command: string): Promise<void>;
  showNotification(title: string, body: string): void;
}

// VS Code implementation
class VSCodeAdapter implements PlatformAdapter { ... }

// Electron implementation
class ElectronAdapter implements PlatformAdapter { ... }
```

### Build Configuration
```yaml
# electron-builder.yml
appId: com.kaibanboard.app
productName: Kaiban Board
directories:
  output: dist
  buildResources: assets

mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  category: public.app-category.developer-tools
  hardenedRuntime: true
  entitlements: entitlements.mac.plist

win:
  target:
    - target: nsis
      arch: [x64]

linux:
  target:
    - AppImage
    - deb
    - rpm
  category: Development

publish:
  provider: github
```

### Auto-Update Flow
```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.on('update-available', (info) => {
  // Show notification to user
});

autoUpdater.on('update-downloaded', (info) => {
  // Prompt user to restart
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version is ready. Restart to apply?',
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
```

## User Stories

1. **As a developer**, I want a standalone app so I don't need VS Code open.

2. **As a user**, I want native notifications so I know when tasks complete.

3. **As a power user**, I want the app to update automatically.

## Acceptance Criteria

- [ ] macOS app builds and runs (Apple Silicon + Intel)
- [ ] Windows app builds and runs
- [ ] Linux AppImage builds and runs
- [ ] Kanban board feature parity
- [ ] Terminal execution works
- [ ] File watching works
- [ ] System notifications work
- [ ] Auto-update works
- [ ] Code signed for macOS
- [ ] Published to GitHub Releases

## Out of Scope

- Mobile apps (iOS, Android)
- Browser-based web app
- Sync/cloud features
- Collaborative editing

## Dependencies

- Core package (`@kaibanboard/core`) must be extracted first
- UI components should be shareable

---

## Changelog

- 2026-01-15: Initial draft
