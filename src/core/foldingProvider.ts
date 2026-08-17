// eslint-disable-next-line import/no-namespace -- vscode SDK requires namespace import
import * as vscode from "vscode"

import { debounce } from "../utils/utils"
import { DEFAULT_SUPPORTED_FUNCTIONS } from "./classContext"
import { ClassRange, detectClassRanges } from "./classDetector"
import { formatPlaceholder, matchPlaceholders } from "./placeholderMatcher"

/**
 * When a collapsed class string expands again.
 *
 * - `line`  — the caret is anywhere on a line the class string spans.
 * - `range` — the selection actually reaches the class string itself.
 */
export type UnfoldBehavior = "line" | "range"

/** Minimal positional shape, so mock selections from tests work too */
interface PositionLike {
  character: number
  line: number
}

interface SelectionLike {
  active: PositionLike
  anchor?: PositionLike
}

function isBefore(a: PositionLike, b: PositionLike): boolean {
  return a.line < b.line || (a.line === b.line && a.character < b.character)
}

/**
 * Whether a collapsed class range should expand for the current selection.
 *
 * In `range` mode the zone is the class string plus the quote on either side.
 * `range.end` already sits on the closing quote, so the opening quote is added
 * back to keep the two edges symmetric. That matters for clicking: a collapsed
 * string renders at near-zero width, so a click on the placeholder can land on
 * either quote, and click-to-expand has to keep working.
 *
 * Compares line/character directly rather than using `Range.contains`, so a
 * selection spanning the class string expands it as well.
 */
export function shouldExpandForSelection(
  classRange: vscode.Range,
  selection: SelectionLike,
  behavior: UnfoldBehavior,
): boolean {
  const active = selection.active
  if (behavior === "line") {
    return active.line >= classRange.start.line && active.line <= classRange.end.line
  }

  const anchor = selection.anchor ?? active
  const selStart = isBefore(anchor, active) ? anchor : active
  const selEnd = isBefore(anchor, active) ? active : anchor
  const zoneStart = {
    character: Math.max(0, classRange.start.character - 1),
    line: classRange.start.line,
  }
  return !isBefore(selEnd, zoneStart) && !isBefore(classRange.end, selStart)
}

/** Manages horizontal collapse decorations */
export class FoldingManager {
  private readonly _onDidUpdateRanges = new vscode.EventEmitter<string>()
  readonly onDidUpdateRanges: vscode.Event<string> = this._onDidUpdateRanges.event
  private enabled: boolean
  private disposables: vscode.Disposable[] = []
  private classRanges: Map<string, ClassRange[]> = new Map()
  private placeholderType: vscode.TextEditorDecorationType
  private hideType: vscode.TextEditorDecorationType
  private selectionDebounce: { cancel: () => void; fn: (editor: vscode.TextEditor) => void }
  private textChangeDebounce: { cancel: () => void; fn: (editor: vscode.TextEditor) => void }
  private lastCursorKey: string = ""
  private lastRangeKeys: Map<string, string> = new Map()
  private unfoldBehavior: UnfoldBehavior
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
    this.unfoldBehavior = config.get<UnfoldBehavior>("unfoldBehavior", "line")

    // Create decoration types once — reuse them
    this.placeholderType = vscode.window.createTextEditorDecorationType({})
    this.hideType = vscode.window.createTextEditorDecorationType({
      letterSpacing: "-9999px",
      opacity: "0",
      textDecoration: "none; font-size: 0;",
    })
    this.textChangeDebounce = debounce((editor: vscode.TextEditor) => {
      this.updateDecorations(editor)
    }, 150)
    this.selectionDebounce = debounce((editor: vscode.TextEditor) => {
      this.updateDecorations(editor)
    }, 150)

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.lastCursorKey = ""
        this.updateAllVisibleEditors()
      }),
      vscode.window.onDidChangeVisibleTextEditors(() => {
        this.updateAllVisibleEditors()
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
        const selection = e.selections[0]
        const newLine = selection?.active.line ?? -1
        // In range mode the column matters too: moving horizontally into or out
        // of a class string changes what should be expanded without ever
        // leaving the line.
        const newCursorKey =
          this.unfoldBehavior === "range"
            ? `${newLine}:${selection?.active.character ?? -1}`
            : `${newLine}`
        // Only re-render if the cursor actually moved somewhere that matters
        if (newCursorKey === this.lastCursorKey) {
          return
        }
        this.lastCursorKey = newCursorKey
        // Skip debounce if the cursor landed on a collapsed class range —
        // the user clicked a folded string and expects instant expansion.
        const uri = e.textEditor.document.uri.toString()
        const ranges = this.classRanges.get(uri)
        const hitsCollapsed =
          ranges &&
          selection &&
          ranges.some((cr) => shouldExpandForSelection(cr.range, selection, this.unfoldBehavior))
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
          this.unfoldBehavior = updatedConfig.get<UnfoldBehavior>("unfoldBehavior", "line")
          this.cachedConfig = null
          this.updateAllVisibleEditors()
        }
      }),
    )

    this.updateAllVisibleEditors()
  }

  toggle() {
    this.setEnabled(!this.enabled)
  }

  setEnabled(value: boolean) {
    this.enabled = value
    this.updateAllVisibleEditors()
    vscode.window.showInformationMessage(
      `Tailwind Stash: ${this.enabled ? "Collapsed" : "Expanded"}`,
    )
  }

  getClassRanges(uri: string): ClassRange[] {
    return this.classRanges.get(uri) ?? []
  }

  updateAllVisibleEditors() {
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateDecorations(editor)
    }
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
    const uri = editor.document.uri.toString()
    this.classRanges.set(uri, ranges)

    const rangeKey = ranges
      .map(
        (cr) =>
          `${cr.range.start.line}:${cr.range.start.character}-${cr.range.end.line}:${cr.range.end.character}:${cr.classes.join(",")}`,
      )
      .join("|")
    const rangesChanged = this.lastRangeKeys.get(uri) !== rangeKey
    this.lastRangeKeys.set(uri, rangeKey)

    // Skip collapsing any range the selection currently reaches
    const selection = editor.selection
    const visibleRanges = ranges.filter(
      (cr) => !shouldExpandForSelection(cr.range, selection, this.unfoldBehavior),
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
    if (rangesChanged) {
      this._onDidUpdateRanges.fire(uri)
    }
  }

  dispose() {
    this._onDidUpdateRanges.dispose()
    this.placeholderType.dispose()
    this.hideType.dispose()
    this.selectionDebounce.cancel()
    this.textChangeDebounce.cancel()
    this.disposables.forEach((d) => d.dispose())
  }
}
