# Git Nudge

A lightweight, zero-dependency VS Code and Antigravity extension that watches your local workspace for file changes and nudges you to commit and push updates to GitHub—keeping your workflow human-in-the-loop without manual Git friction.

## Why Git Nudge?
Standard editor Git commands wait passively for you to remember them. **Git Nudge** actively tracks workspace edits, generates a clean commit message from `git status`, and gives you a pinned prompt or one-click status bar trigger to stage, commit, and push in a single action.

## Features
- **Idle Activity Watcher:** Monitors file saves, creations, and deletions (ignoring `.git`, `node_modules`, `venv`, `dist`, and build folders) and prompts after 2 minutes of inactivity.
- **Persistent Status Bar Indicator:** Displays a `Commit (X)` counter in the bottom-left status bar whenever uncommitted changes exist.
- **Deterministic Commit Messages:** Automatically drafts conventional commit messages (`feat: add ...` or `chore: update ...`) based on changed files.
- **Human-in-the-Loop Control:** Pinned notification lets you click **Yes**, **Edit Message**, or **No** before running `git add . && git commit && git push`.
- **Manual Command Trigger:** Run `Git Nudge: Check & Commit Now` anytime via the Command Palette (`Ctrl+Shift+P`).

## Installation (Local `.vsix`)
1. Download or build `git-nudge-0.0.1.vsix`:
   ```bash
   npm install
   npx @vscode/vsce package
----------------------------
2. Install via CLI:
```Bash
   code --install-extension git-nudge-0.0.1.vsix

   Or
-------------------
3.open the Command Palette (Ctrl+Shift+P) → Extensions: Install from VSIX... and select git-nudge-0.0.1.vsix.
