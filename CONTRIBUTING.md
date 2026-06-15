# Contributing to Kaiban Board

Thank you for your interest in contributing to Kaiban Board! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/kaibanboard.com.git
   cd kaibanboard.com
   ```
3. **Install dependencies**:
   ```bash
   bun install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development

### Project Structure

- `src/` - Source code
- `.agent/` - AI agent documentation (internal)
- `out/` - Compiled JavaScript (generated)

### Building

```bash
# Compile TypeScript
bun run compile

# Watch mode for development
bun run watch
```

### Testing

```bash
# Run tests
bun run test

# Run tests with coverage
bun run test:coverage

# Watch mode
bun run test:watch
```

### Linting and Formatting

We use Biome for linting and formatting:

```bash
# Check for issues
bun run check

# Auto-fix issues
bun run check:fix

# Format code
bun run format

# Lint only
bun run lint
```

All code must pass linting before submission.

## Code Style

- Follow the existing code style
- Use TypeScript strict mode
- Avoid `any` types - use proper types
- Write clear, descriptive variable and function names
- Add comments for complex logic
- Include error handling for async operations

## Testing in VS Code

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test your changes in the new window
4. Use `Cmd+Shift+B` to recompile during development

## Pull Request Process

1. **Ensure your code passes all checks**:
   - All tests pass
   - Linting passes (`bun run check`)
   - Code is properly formatted
   - No TypeScript errors

2. **Write clear commit messages**:
   - Use conventional commits format
   - Describe what and why, not how
   - Reference issues when applicable

3. **Update documentation** if needed:
   - Update README.md for user-facing changes
   - Update code comments for complex changes

4. **Create your Pull Request**:
   - Provide a clear description
   - Reference related issues
   - Add screenshots for UI changes

5. **Respond to feedback** promptly

## Reporting Issues

When reporting bugs or suggesting features:

- Use the GitHub issue tracker
- Provide clear steps to reproduce bugs
- Include environment information (VS Code version, OS, etc.)
- For feature requests, explain the use case

## Code of Conduct

Be respectful and inclusive. We welcome contributors from all backgrounds and experience levels.

## Publishing (Maintainers Only)

The extension is automatically published via GitHub Actions when a release is created.

### One-Time Setup

1. **Create Open VSX Namespace**:
   ```bash
   # Create an account at https://open-vsx.org
   # Go to Settings → Access Tokens → Generate New Token
   npx ovsx create-namespace VincentShipsIt -p YOUR_TOKEN
   ```

2. **Add GitHub Secrets**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add these secrets:
     - `NPM_TOKEN`: npm token for publishing `@kaibanboard/cli`
     - `OVSX_PAT`: Your Open VSX personal access token (required for Cursor/Open VSX)
     - `VSCE_PAT`: VS Code Marketplace token (optional, for VS Code marketplace)

3. **To get VS Code Marketplace token** (optional):
   - Go to https://dev.azure.com
   - Create a Personal Access Token with "Marketplace (Manage)" scope
   - Create publisher at https://marketplace.visualstudio.com/manage

### Publishing Process

**Automatic (Recommended)**:
1. Update version in `package.json`:
   ```bash
   bun run version:patch  # or version:minor, version:major
   ```
2. Commit the version change
3. Create a GitHub release with tag matching the version (e.g., `v0.2.1`)
4. The workflow automatically publishes to Open VSX (and VS Code if configured)

**Manual**:
- Go to Actions → "Publish Extension" → "Run workflow"

The old `shipshitdev.kaibanboardcom` Open VSX path receives one final
compatibility update for version `0.4.0`:

> This project has moved to VincentShipsIt/kaibanboard.com. This compatibility path will be removed on July 15, 2026.

### Verification

After publishing, verify the extension appears:
- **Cursor**: Search "Kaiban Board" in Extensions (may take a few hours to sync)
- **Open VSX**: https://open-vsx.org/extension/VincentShipsIt/kaibanboardcom
- **VS Code**: Configure `VSCE_PAT` and a personal Marketplace publisher before enabling Marketplace distribution

## Questions?

Feel free to open an issue for discussion or questions about contributing.

---

Thank you for contributing to Kaiban Board! 🎉
