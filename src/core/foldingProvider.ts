// eslint-disable-next-line import/no-namespace -- vscode SDK requires namespace import
import * as vscode from "vscode"

import { debounce } from "../utils/utils"
import { DEFAULT_SUPPORTED_FUNCTIONS } from "./classContext"
import { ClassRange, detectClassRanges } from "./classDetector"
import { formatPlaceholder, matchPlaceholders } from "./placeholderMatcher"

/** Manages horizontal collapse decorations */
export class FoldingManager {
  private enabled: boolean
  private disposables: vscode.Disposable[] = []
  private classRanges: Map<string, ClassRange[]> = new Map()
  private placeholderType: vscode.TextEditorDecorationType
  private hideType: vscode.TextEditorDecorationType
  private selectionDebounce: { cancel: () => void; fn: (editor: vscode.TextEditor) => void }
  private textChangeDebounce: { cancel: () => void; fn: (editor: vscode.TextEditor) => void }
  private lastCursorLine: number = -1
  private cachedConfig: {
    foldedTextColor: string
    minClassCount: number
    placeholderFormat: string
    placeholders: Record<string, string>
    placeholderStyle: string
    supportedFunctions: string[]
  } | null = null

  constructor() {
    const config = vscode.workspace.getConfiguration("tailwindStash")
    this.enabled = config.get<boolean>("foldByDefault", true)

    // Create decoration types once — reuse them
    this.placeholderType = vscode.window.createTextEditorDecorationType({})
    this.hideType = vscode.window.createTextEditorDecorationType({
      letterSpacing: "-9999px",
      opacity: "0",
    })
    this.textChangeDebounce = debounce((editor: vscode.TextEditor) => {
      this.updateDecorations(editor)
    }, 150)
    this.selectionDebounce = debounce((editor: vscode.TextEditor) => {
      this.updateDecorations(editor)
    }, 150)

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.lastCursorLine = -1
          this.updateDecorations(editor)
        }
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        const editor =
          vscode.window.activeTextEditor?.document === e.document
            ? vscode.window.activeTextEditor
            : vscode.window.visibleTextEditors.find((ed) => ed.document === e.document)
        if (editor) {
          this.textChangeDebounce.fn(editor)
        }
      }),
      vscode.window.onDidChangeTextEditorSelection((e) => {
        const newLine = e.selections[0]?.active.line ?? -1
        // Only re-render if cursor moved to a different line
        if (newLine === this.lastCursorLine) {
          return
        }
        this.lastCursorLine = newLine
        // Skip debounce if the cursor landed on a collapsed class line —
        // the user clicked a folded string and expects instant expansion.
        const uri = e.textEditor.document.uri.toString()
        const ranges = this.classRanges.get(uri)
        const hitsCollapsed =
          ranges &&
          ranges.some((cr) => newLine >= cr.range.start.line && newLine <= cr.range.end.line)
        if (hitsCollapsed) {
          this.selectionDebounce.cancel()
          this.updateDecorations(e.textEditor)
        } else {
          this.selectionDebounce.fn(e.textEditor)
        }
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("tailwindStash")) {
          const updatedConfig = vscode.workspace.getConfiguration("tailwindStash")
          this.enabled = updatedConfig.get<boolean>("foldByDefault", true)
          this.cachedConfig = null
          const editor = vscode.window.activeTextEditor
          if (editor) {
            this.updateDecorations(editor)
          }
        }
      }),
    )

    const editor = vscode.window.activeTextEditor
    if (editor) {
      this.updateDecorations(editor)
    }
  }

  toggle() {
    this.setEnabled(!this.enabled)
  }

  setEnabled(value: boolean) {
    this.enabled = value
    const editor = vscode.window.activeTextEditor
    if (editor) {
      this.updateDecorations(editor)
    }
    vscode.window.showInformationMessage(
      `Tailwind Stash: ${this.enabled ? "Collapsed" : "Expanded"}`,
    )
  }

  getClassRanges(uri: string): ClassRange[] {
    return this.classRanges.get(uri) ?? []
  }

  updateDecorations(editor: vscode.TextEditor) {
    if (!this.enabled) {
      editor.setDecorations(this.placeholderType, [])
      editor.setDecorations(this.hideType, [])
      return
    }

    if (!this.cachedConfig) {
      const config = vscode.workspace.getConfiguration("tailwindStash")
      this.cachedConfig = {
        foldedTextColor: config.get<string>("foldedTextColor", ""),
        minClassCount: config.get<number>("minClassCount", 4),
        placeholderFormat: config.get<string>("placeholderFormat", "{keys} +{rest}"),
        placeholders: config.get<Record<string, string>>("placeholders", {}),
        placeholderStyle: config.get<string>("placeholderStyle", "count"),
        supportedFunctions: config.get<string[]>("supportedFunctions", DEFAULT_SUPPORTED_FUNCTIONS),
      }
    }
    const {
      foldedTextColor,
      minClassCount,
      placeholderFormat,
      placeholders,
      placeholderStyle,
      supportedFunctions,
    } = this.cachedConfig

    const ranges = detectClassRanges(editor.document, supportedFunctions, minClassCount)
    this.classRanges.set(editor.document.uri.toString(), ranges)

    // Skip collapsing any range the cursor is currently on
    const cursorLine = editor.selection.active.line
    const visibleRanges = ranges.filter(
      (cr) => cursorLine < cr.range.start.line || cursorLine > cr.range.end.line,
    )

    const hasPlaceholders = Object.keys(placeholders).length > 0

    const decorations: vscode.DecorationOptions[] = visibleRanges.map((cr) => {
      let placeholder: string

      // Try placeholder matching first
      const match = hasPlaceholders ? matchPlaceholders(cr.classes, placeholders) : null

      if (match) {
        placeholder = formatPlaceholder(match, placeholderFormat)
      } else {
        switch (placeholderStyle) {
          case "count":
            placeholder = `${cr.classes.length}`
            break
          case "count-long":
            placeholder = `${cr.classes.length} ${cr.classes.length === 1 ? "class" : "classes"}`
            break
          case "empty":
            placeholder = "…"
            break
          default:
            placeholder = `${cr.classes.length}`
        }
      }
      return {
        hoverMessage: new vscode.MarkdownString(
          "**Tailwind Classes:**\n```\n" + cr.classes.join("\n") + "\n```",
        ),
        range: cr.range,
        renderOptions: {
          before: {
            color: foldedTextColor || new vscode.ThemeColor("editorCodeLens.foreground"),
            contentText: placeholder,
            fontStyle: "italic",
          },
        },
      }
    })

    editor.setDecorations(this.placeholderType, decorations)
    editor.setDecorations(
      this.hideType,
      visibleRanges.map((cr) => ({ range: cr.range })),
    )
  }

  dispose() {
    this.placeholderType.dispose()
    this.hideType.dispose()
    this.selectionDebounce.cancel()
    this.textChangeDebounce.cancel()
    this.disposables.forEach((d) => d.dispose())
  }
}
