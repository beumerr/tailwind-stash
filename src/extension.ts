import * as vscode from 'vscode';
import { FoldingManager } from './foldingProvider';
import { CSSPreviewPanel } from './cssPreviewPanel';

export function activate(context: vscode.ExtensionContext) {
  const foldingManager = new FoldingManager(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('tailwindStash.collapseAll', () => {
      foldingManager.setEnabled(true);
    }),
    vscode.commands.registerCommand('tailwindStash.expandAll', () => {
      foldingManager.setEnabled(false);
    }),
    vscode.commands.registerCommand('tailwindStash.toggleCollapse', () => {
      foldingManager.toggle();
    }),
    vscode.commands.registerCommand('tailwindStash.showCssPreview', () => {
      CSSPreviewPanel.createOrShow((uri) => foldingManager.getClassRanges(uri));
    })
  );

  context.subscriptions.push(foldingManager);
}

export function deactivate() {}
