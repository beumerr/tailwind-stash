// eslint-disable-next-line import/no-namespace -- vscode SDK requires namespace import
import * as vscode from "vscode"

import { DEFAULT_SUPPORTED_FUNCTIONS, isInsideClassContext } from "./classContext"

/** Provides autocomplete suggestions for placeholder keys inside class attributes */
export class PlaceholderCompletionProvider implements vscode.CompletionItemProvider {
  private cachedConfig: {
    placeholders: Record<string, string>
    supportedFunctions: string[]
  } | null = null

  constructor() {
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("tailwindStash")) {
        this.cachedConfig = null
      }
    })
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): undefined | vscode.CompletionItem[] {
    const { placeholders, supportedFunctions } = this.getConfig()

    if (!isInsideClassContext(document, position, supportedFunctions)) {
      return undefined
    }

    const entries = Object.entries(placeholders)
    if (entries.length === 0) {
      return undefined
    }

    return entries.map(([key, value]) => {
      const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Snippet)
      item.detail = value
      item.documentation = new vscode.MarkdownString(
        `**Tailwind Stash placeholder**\n\`\`\`\n${value.split(/\s+/).join("\n")}\n\`\`\``,
      )
      item.insertText = value
      return item
    })
  }

  private getConfig() {
    if (!this.cachedConfig) {
      const config = vscode.workspace.getConfiguration("tailwindStash")
      this.cachedConfig = {
        placeholders: config.get<Record<string, string>>("placeholders", {}),
        supportedFunctions: config.get<string[]>("supportedFunctions", DEFAULT_SUPPORTED_FUNCTIONS),
      }
    }
    return this.cachedConfig
  }
}
