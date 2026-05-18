import { randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
// eslint-disable-next-line import/no-namespace -- vscode SDK requires namespace import
import * as vscode from "vscode"

import { ClassRange } from "./classDetector"

export class CSSPreviewPanel {
  public static currentPanel: CSSPreviewPanel | undefined
  private static readonly viewType = "tailwindStash.classEditor"

  private readonly panel: vscode.WebviewPanel
  private readonly extensionPath: string
  private disposables: vscode.Disposable[] = []
  private getClassRanges: (uri: string) => ClassRange[]
  private currentRanges: ClassRange[] = []
  private currentEditorUri: string = ""
  private lastContentKey: string = ""
  private lastActiveIndex: number = -1

  private constructor(
    panel: vscode.WebviewPanel,
    extensionPath: string,
    getClassRanges: (uri: string) => ClassRange[],
    onDidUpdateRanges: vscode.Event<string>,
  ) {
    this.panel = panel
    this.extensionPath = extensionPath
    this.getClassRanges = getClassRanges

    this.panel.webview.html = this.getHtml()
    this.sendConfig()

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables)

    this.panel.onDidChangeViewState(
      (e) => {
        if (e.webviewPanel.visible) {
          this.lastContentKey = ""
          const ed = vscode.window.activeTextEditor
          if (ed && ed.document.uri.scheme !== "output") {
            this.updateForEditor(ed)
          }
        }
      },
      null,
      this.disposables,
    )

    this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg), null, this.disposables)

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("tailwindStash")) {
          this.sendConfig()
        }
      }),
      vscode.window.onDidChangeTextEditorSelection((e) => {
        if (e.textEditor.document.uri.scheme !== "output") {
          this.updateForEditor(e.textEditor)
        }
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.uri.scheme !== "output") {
          this.updateForEditor(editor)
        } else if (!editor) {
          this.lastContentKey = ""
        }
      }),
      onDidUpdateRanges((uri) => {
        if (uri === this.currentEditorUri) {
          const editor = vscode.window.visibleTextEditors.find(
            (ed) => ed.document.uri.toString() === uri,
          )
          if (editor) {
            this.updateForEditor(editor)
          }
        }
      }),
    )

    const editor = vscode.window.activeTextEditor
    if (editor) {
      this.updateForEditor(editor)
    }
  }

  static hide() {
    if (CSSPreviewPanel.currentPanel) {
      CSSPreviewPanel.currentPanel.dispose()
    }
  }

  static toggle(
    extensionPath: string,
    getClassRanges: (uri: string) => ClassRange[],
    onDidUpdateRanges: vscode.Event<string>,
  ) {
    if (CSSPreviewPanel.currentPanel) {
      CSSPreviewPanel.currentPanel.dispose()
    } else {
      CSSPreviewPanel.createOrShow(extensionPath, getClassRanges, onDidUpdateRanges)
    }
  }

  static createOrShow(
    extensionPath: string,
    getClassRanges: (uri: string) => ClassRange[],
    onDidUpdateRanges: vscode.Event<string>,
  ) {
    const column = vscode.ViewColumn.Beside

    if (CSSPreviewPanel.currentPanel) {
      CSSPreviewPanel.currentPanel.panel.reveal(column)
      return
    }

    const panel = vscode.window.createWebviewPanel(
      CSSPreviewPanel.viewType,
      "Tailwind Classes",
      column,
      {
        enableScripts: true,
        localResourceRoots: [],
      },
    )

    CSSPreviewPanel.currentPanel = new CSSPreviewPanel(
      panel,
      extensionPath,
      getClassRanges,
      onDidUpdateRanges,
    )
  }

  private async handleMessage(msg: { classes?: string; index?: number; type: string }) {
    if (msg.type === "ready") {
      this.sendConfig()
      this.lastContentKey = ""
      const editor = vscode.window.activeTextEditor
      if (editor && editor.document.uri.scheme !== "output") {
        this.updateForEditor(editor)
      }
      return
    }

    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === this.currentEditorUri,
    )
    if (!editor || msg.index === undefined) {
      return
    }

    const cr = this.currentRanges[msg.index]
    if (!cr) {
      return
    }

    if (msg.type === "updateClasses" && msg.classes !== undefined) {
      // Re-detect ranges to avoid stale positions after concurrent edits
      const freshRanges = this.getClassRanges(this.currentEditorUri)
      const freshCr = freshRanges[msg.index]
      if (!freshCr) {
        return
      }
      const rangeText = editor.document.getText(freshCr.range)
      // Safety: verify range hasn't gone stale (shouldn't contain quotes)
      if (/["'`]/.test(rangeText)) {
        return
      }
      const newText = msg.classes!.trim()
      // Skip no-op edits to avoid unnecessary document change cycles
      if (newText === rangeText) {
        return
      }
      this.currentRanges = freshRanges
      await editor.edit((editBuilder) => {
        editBuilder.replace(freshCr.range, newText)
      })
    } else if (msg.type === "goToRange") {
      editor.selection = new vscode.Selection(cr.range.start, cr.range.start)
      editor.revealRange(cr.range, vscode.TextEditorRevealType.InCenter)
      vscode.window.showTextDocument(editor.document, editor.viewColumn)
    } else if (msg.type === "selectEntry") {
      editor.selection = new vscode.Selection(cr.range.start, cr.range.start)
      const scrollEditor = vscode.workspace
        .getConfiguration("tailwindStash")
        .get<boolean>("scrollEditorOnPanelSelect", true)
      if (scrollEditor) {
        editor.revealRange(cr.range, vscode.TextEditorRevealType.InCenter)
      }
      this.lastActiveIndex = msg.index
      this.panel.webview.postMessage({ index: msg.index, type: "setActive" })
    }
  }

  private sendConfig() {
    const config = vscode.workspace.getConfiguration("tailwindStash")
    this.panel.webview.postMessage({
      activeBorderColor: config.get<string>("activeBorderColor", ""),
      elementTextColor: config.get<string>("elementTextColor", ""),
      scrollPanelOnEditorSelect: config.get<boolean>("scrollPanelOnEditorSelect", true),
      textareaFocusBackground: config.get<string>("textareaFocusBackground", ""),
      type: "config",
    })
  }

  private updateForEditor(editor: vscode.TextEditor) {
    const uri = editor.document.uri.toString()
    this.currentEditorUri = uri
    const ranges = this.getClassRanges(uri)
    this.currentRanges = ranges

    const activeIndex = findActiveIndex(editor.selection.active.line, ranges)

    const entries = ranges.map((cr) => ({
      classes: cr.classes,
      element: cr.element,
      line: cr.range.start.line + 1,
    }))

    const contentKey =
      uri + ":" + ranges.map((cr) => `${cr.range.start.line}:${cr.classes.join(",")}`).join("|")

    if (contentKey === this.lastContentKey) {
      if (activeIndex !== this.lastActiveIndex) {
        this.lastActiveIndex = activeIndex
        this.panel.webview.postMessage({ index: activeIndex, type: "setActive" })
      }
      return
    }

    this.lastContentKey = contentKey
    this.lastActiveIndex = activeIndex
    this.panel.webview.postMessage({ activeIndex, entries, type: "update" })
  }

  private getHtml(): string {
    const htmlPath = join(this.extensionPath, "out", "webview.html")
    const jsPath = join(this.extensionPath, "out", "webview.js")
    const cssPath = join(this.extensionPath, "out", "webview.css")

    const html = readFileSync(htmlPath, "utf8")
    const js = readFileSync(jsPath, "utf8")
    const css = readFileSync(cssPath, "utf8")
    const nonce = generateNonce()

    return html.replaceAll("{{NONCE}}", nonce).replace("{{CSS}}", css).replace("{{JS}}", js)
  }

  dispose() {
    CSSPreviewPanel.currentPanel = undefined
    this.panel.dispose()
    this.disposables.forEach((d) => d.dispose())
  }
}

function generateNonce(): string {
  return randomBytes(16).toString("base64")
}

export function findActiveIndex(
  cursorLine: number,
  ranges: { range: { end: { line: number }; start: { line: number } } }[],
): number {
  let activeIndex = -1
  let nearestDist = Infinity

  for (let i = 0; i < ranges.length; i++) {
    const cr = ranges[i]
    if (cursorLine >= cr.range.start.line && cursorLine <= cr.range.end.line) {
      return i
    }
    const dist = Math.min(
      Math.abs(cr.range.start.line - cursorLine),
      Math.abs(cr.range.end.line - cursorLine),
    )
    if (dist < nearestDist) {
      nearestDist = dist
      activeIndex = i
    }
  }
  return activeIndex
}
