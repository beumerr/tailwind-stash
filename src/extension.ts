// eslint-disable-next-line import/no-namespace -- vscode SDK requires namespace import
import * as vscode from "vscode"

import { CSSPreviewPanel } from "./core/cssPreviewPanel"
import { expandPlaceholderAtCursor } from "./core/expandPlaceholder"
import { FoldingManager } from "./core/foldingProvider"
import { PlaceholderCompletionProvider } from "./core/placeholderCompletionProvider"

export function activate(context: vscode.ExtensionContext) {
  const foldingManager = new FoldingManager()

  context.subscriptions.push(
    vscode.commands.registerCommand("tailwindStash.collapseAll", () => {
      foldingManager.setEnabled(true)
    }),
    vscode.commands.registerCommand("tailwindStash.expandAll", () => {
      foldingManager.setEnabled(false)
    }),
    vscode.commands.registerCommand("tailwindStash.toggleCollapse", () => {
      foldingManager.toggle()
    }),
    vscode.commands.registerCommand("tailwindStash.showCssPreview", () => {
      CSSPreviewPanel.createOrShow(context.extensionPath, (uri) =>
        foldingManager.getClassRanges(uri),
      )
    }),
    vscode.commands.registerCommand("tailwindStash.hideCssPreview", () => {
      CSSPreviewPanel.hide()
    }),
    vscode.commands.registerCommand("tailwindStash.toggleCssPreview", () => {
      CSSPreviewPanel.toggle(context.extensionPath, (uri) => foldingManager.getClassRanges(uri))
    }),
    vscode.commands.registerCommand("tailwindStash.expandPlaceholder", () => {
      expandPlaceholderAtCursor()
    }),
    vscode.languages.registerCompletionItemProvider(
      ["html", "javascriptreact", "typescriptreact", "vue", "svelte", "astro", "php"],
      new PlaceholderCompletionProvider(),
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j",
      "k",
      "l",
      "m",
      "n",
      "o",
      "p",
      "q",
      "r",
      "s",
      "t",
      "u",
      "v",
      "w",
      "x",
      "y",
      "z",
      "-",
      " ",
      '"',
      "'",
      "`",
    ),
  )

  context.subscriptions.push(foldingManager)
}

export function deactivate() {}
