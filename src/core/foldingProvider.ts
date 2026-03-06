// eslint-disable-next-line import/no-namespace -- vscode SDK requires namespace import
import * as vscode from "vscode"

import { ClassRange, detectClassRanges } from "./classDetector"

/** Manages horizontal collapse decorations */
export class FoldingManager {
  private enabled: boolean
  private disposables: Array<vscode.Disposable> = []
  private classRanges: Map<string, Array<ClassRange>> = new Map()
  private placeholderType: vscode.TextEditorDecorationType
  private hideType: vscode.TextEditorDecorationType
  private selectionDebounce: NodeJS.Timeout | null = null
  private lastCursorLine: number = -1

  constructor(private context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration("tailwindStash")
    this.enabled = config.get<boolean>("foldByDefault", true)

    // Create decoration types once — reuse them
    this.placeholderType = vscode.window.createTextEditorDecorationType({})
    this.hideType = vscode.window.createTextEditorDecorationType({
      letterSpacing: "-9999px",
      opacity: "0",
    })

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.lastCursorLine = -1
          this.updateDecorations(editor)
        }
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        const editor = vscode.window.activeTextEditor
        if (editor && e.document === editor.document) {
          this.updateDecorations(editor)
        }
      }),
      vscode.window.onDidChangeTextEditorSelection((e) => {
        const newLine = e.selections[0]?.active.line ?? -1
        // Only re-render if cursor moved to a different line
        if (newLine === this.lastCursorLine) {
          return
        }
        this.lastCursorLine = newLine
        if (this.selectionDebounce) {
          clearTimeout(this.selectionDebounce)
        }
        this.selectionDebounce = setTimeout(() => {
          this.updateDecorations(e.textEditor)
        }, 150)
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("tailwindStash")) {
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
    this.enabled = !this.enabled
    const editor = vscode.window.activeTextEditor
    if (editor) {
      this.updateDecorations(editor)
    }
    vscode.window.showInformationMessage(
      `Tailwind Stash: ${this.enabled ? "Collapsed" : "Expanded"}`,
    )
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

  getClassRanges(uri: string): Array<ClassRange> {
    return this.classRanges.get(uri) ?? []
  }

  updateDecorations(editor: vscode.TextEditor) {
    if (!this.enabled) {
      editor.setDecorations(this.placeholderType, [])
      editor.setDecorations(this.hideType, [])
      return
    }

    const config = vscode.workspace.getConfiguration("tailwindStash")
    const supportedFunctions = config.get<Array<string>>("supportedFunctions", [
      "cn",
      "clsx",
      "cva",
      "cx",
      "twMerge",
      "twJoin",
      "classNames",
      "classnames",
    ])
    const placeholderStyle = config.get<string>("placeholderStyle", "count")
    const foldedTextColor = config.get<string>("foldedTextColor", "")
    const minClassCount = config.get<number>("minClassCount", 4)

    const ranges = detectClassRanges(editor.document, supportedFunctions, minClassCount)
    this.classRanges.set(editor.document.uri.toString(), ranges)

    // Skip collapsing any range the cursor is currently on
    const cursorLine = editor.selection.active.line
    const visibleRanges = ranges.filter(
      (cr) => cursorLine < cr.range.start.line || cursorLine > cr.range.end.line,
    )

    const decorations: Array<vscode.DecorationOptions> = visibleRanges.map((cr) => {
      let placeholder: string
      switch (placeholderStyle) {
        case "count":
          placeholder = `${cr.classes.length}`
          break
        case "count-long":
          placeholder = `${cr.classes.length} classes`
          break
        case "empty":
          placeholder = "…"
          break
        default:
          placeholder = `${cr.classes.length}`
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
    if (this.selectionDebounce) {
      clearTimeout(this.selectionDebounce)
    }
    this.disposables.forEach((d) => d.dispose())
  }
}
