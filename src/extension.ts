import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
let debounceTimer: NodeJS.Timeout | undefined;
let isPromptOpen = false;
let statusBarItem: vscode.StatusBarItem;

// Wait 2 minutes of inactivity after a file save before nudging
const IDLE_DELAY_MS = 2 * 60 * 1000;

export function activate(context: vscode.ExtensionContext) {
    // 1. Create a persistent Status Bar indicator at the bottom-left
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'git-nudge.triggerNow';
    statusBarItem.tooltip = 'Click to commit & push changes with Git Nudge';
    context.subscriptions.push(statusBarItem);

    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    const scheduleNudge = (uri: vscode.Uri) => {
        const ignored = ['.git', 'node_modules', 'venv', '.venv', '__pycache__', 'dist', 'out'];
        if (ignored.some(dir => uri.fsPath.includes(`\\${dir}\\`) || uri.fsPath.includes(`/${dir}/`))) {
            return;
        }

        updateStatusBar();

        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => checkAndPromptCommit(), IDLE_DELAY_MS);
    };

    watcher.onDidChange(scheduleNudge);
    watcher.onDidCreate(scheduleNudge);
    watcher.onDidDelete(scheduleNudge);

    const testCmd = vscode.commands.registerCommand('git-nudge.triggerNow', () => {
        checkAndPromptCommit();
    });

    context.subscriptions.push(watcher, testCmd);
    updateStatusBar();
}

async function updateStatusBar() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        statusBarItem.hide();
        return;
    }

    try {
        const { stdout } = await execAsync('git status --porcelain', { cwd: workspaceFolder.uri.fsPath });
        const count = stdout.trim().split('\n').filter(Boolean).length;
        if (count > 0) {
            statusBarItem.text = `$(git-commit) Commit (${count})`;
            statusBarItem.show();
        } else {
            statusBarItem.hide();
        }
    } catch {
        statusBarItem.hide();
    }
}

async function checkAndPromptCommit() {
    if (isPromptOpen) {
        return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }
    const cwd = workspaceFolder.uri.fsPath;

    try {
        const { stdout: statusOut } = await execAsync('git status --porcelain', { cwd });
        const lines = statusOut.trim().split('\n').filter(Boolean);
        if (lines.length === 0) {
            return;
        }

        const proposedMsg = buildCommitMessage(lines);

        // showWarningMessage stays pinned on screen until you click an option!
        isPromptOpen = true;
        const choice = await vscode.window.showWarningMessage(
            `Git Nudge: Commit & push "${proposedMsg}"? (${lines.length} file${lines.length > 1 ? 's' : ''} changed)`,
            'Yes',
            'Edit Message',
            'No'
        );
        isPromptOpen = false;

        if (!choice || choice === 'No') {
            return;
        }

        let finalMsg = proposedMsg;
        if (choice === 'Edit Message') {
            const edited = await vscode.window.showInputBox({
                prompt: 'Enter your commit message',
                value: proposedMsg
            });
            if (!edited) {
                return;
            }
            finalMsg = edited;
        }

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Pushing to GitHub...' },
            async () => {
                const safeMsg = finalMsg.replace(/"/g, '\\"');
                await execAsync(`git add . && git commit -m "${safeMsg}" && git push`, { cwd });
                vscode.window.showInformationMessage(`Committed & pushed: "${finalMsg}"`);
                updateStatusBar();
            }
        );
    } catch (err: any) {
        isPromptOpen = false;
        vscode.window.showErrorMessage(`Git Nudge failed: ${err.stderr || err.message}`);
    }
}

function buildCommitMessage(statusLines: string[]): string {
    const files = statusLines.map(line => line.slice(3).trim().split('/').pop() || '');
    const isAllNew = statusLines.every(line => line.startsWith('??') || line.startsWith('A'));
    const prefix = isAllNew ? 'feat' : 'chore';

    if (files.length === 1) {
        return `${prefix}: ${isAllNew ? 'add' : 'update'} ${files[0]}`;
    }
    if (files.length <= 3) {
        return `${prefix}: update ${files.join(', ')}`;
    }
    return `${prefix}: update ${files[0]}, ${files[1]} and ${files.length - 2} more files`;
}

export function deactivate() {}