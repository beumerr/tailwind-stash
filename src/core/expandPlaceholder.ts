// eslint-disable-next-line import/no-namespace -- vscode SDK requires namespace import
import * as vscode from "vscode"

import { DEFAULT_SUPPORTED_FUNCTIONS, isInsideClassContext } from "./classContext"

/**
 * Expands the placeholder key at the cursor position into its full class string.
 * Only works inside class attributes or supported function calls.
 */
export function expandPlaceholderAtCursor(): void {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  const config = vscode.workspace.getConfiguration("tailwindStash")
  const placeholders = config.get<Record<string, string>>("placeholders", {})
  if (Object.keys(placeholders).length === 0) {
    return
  }

  const position = editor.selection.active
  const wordRange = editor.document.getWordRangeAtPosition(position, /[\w-]+/)
  if (!wordRange) {
    return
  }

  const word = editor.document.getText(wordRange)
  const value = placeholders[word]
  if (!value) {
    return
  }

  const supportedFunctions = config.get<string[]>("supportedFunctions", DEFAULT_SUPPORTED_FUNCTIONS)

  if (!isInsideClassContext(editor.document, wordRange.start, supportedFunctions)) {
    return
  }

  editor.edit((editBuilder) => {
    editBuilder.replace(wordRange, value)
  })
}
