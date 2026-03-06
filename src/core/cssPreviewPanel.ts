import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ClassRange } from './classDetector';

export class CSSPreviewPanel {
  public static currentPanel: CSSPreviewPanel | undefined;
  private static readonly viewType = 'tailwindStash.classEditor';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionPath: string;
  private disposables: vscode.Disposable[] = [];
  private getClassRanges: (uri: string) => ClassRange[];
  private currentRanges: ClassRange[] = [];
  private currentEditorUri: string = '';
  private lastContentKey: string = '';
  private lastActiveIndex: number = -1;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionPath: string,
    getClassRanges: (uri: string) => ClassRange[]
  ) {
    this.panel = panel;
    this.extensionPath = extensionPath;
    this.getClassRanges = getClassRanges;

    this.panel.webview.html = this.getHtml();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.disposables
    );

    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection((e) => {
        if (e.textEditor.document.uri.scheme !== 'output') {
          this.updateForEditor(e.textEditor);
        }
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.uri.scheme !== 'output') {
          this.updateForEditor(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && e.document === editor.document) {
          this.lastContentKey = '';
          setTimeout(() => this.updateForEditor(editor), 150);
        }
      })
    );

    const editor = vscode.window.activeTextEditor;
    if (editor) this.updateForEditor(editor);
  }

  static createOrShow(extensionPath: string, getClassRanges: (uri: string) => ClassRange[]) {
    const column = vscode.ViewColumn.Beside;

    if (CSSPreviewPanel.currentPanel) {
      CSSPreviewPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      CSSPreviewPanel.viewType,
      'Tailwind Classes',
      column,
      { enableScripts: true }
    );

    CSSPreviewPanel.currentPanel = new CSSPreviewPanel(panel, extensionPath, getClassRanges);
  }

  private async handleMessage(msg: { type: string; index?: number; classes?: string }) {
    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === this.currentEditorUri
    );
    if (!editor || msg.index === undefined) return;

    const cr = this.currentRanges[msg.index];
    if (!cr) return;

    if (msg.type === 'updateClasses' && msg.classes !== undefined) {
      await editor.edit((editBuilder) => {
        editBuilder.replace(cr.range, msg.classes!.trim());
      });
    } else if (msg.type === 'goToRange') {
      editor.selection = new vscode.Selection(cr.range.start, cr.range.start);
      editor.revealRange(cr.range, vscode.TextEditorRevealType.InCenter);
      vscode.window.showTextDocument(editor.document, editor.viewColumn);
    }
  }

  private updateForEditor(editor: vscode.TextEditor) {
    const uri = editor.document.uri.toString();
    this.currentEditorUri = uri;
    const ranges = this.getClassRanges(uri);
    this.currentRanges = ranges;

    const activeIndex = findActiveIndex(editor.selection.active.line, ranges);

    const entries = ranges.map((cr) => ({
      element: cr.element,
      line: cr.range.start.line + 1,
      classes: cr.classes,
    }));

    const contentKey = uri + ':' + ranges.map((cr) =>
      `${cr.range.start.line}:${cr.classes.join(',')}`
    ).join('|');

    if (contentKey === this.lastContentKey) {
      if (activeIndex !== this.lastActiveIndex) {
        this.lastActiveIndex = activeIndex;
        this.panel.webview.postMessage({ type: 'setActive', index: activeIndex });
      }
      return;
    }

    this.lastContentKey = contentKey;
    this.lastActiveIndex = activeIndex;
    this.panel.webview.postMessage({ type: 'update', entries, activeIndex });
  }

  private getHtml(): string {
    const htmlPath = path.join(this.extensionPath, 'out', 'webview.html');
    const jsPath = path.join(this.extensionPath, 'out', 'webview.js');
    const cssPath = path.join(this.extensionPath, 'out', 'webview.css');

    const html = fs.readFileSync(htmlPath, 'utf8');
    const js = fs.readFileSync(jsPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');

    return html.replace('{{CSS}}', css).replace('{{JS}}', js);
  }

  dispose() {
    CSSPreviewPanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}

export function findActiveIndex(
  cursorLine: number,
  ranges: { range: { start: { line: number }; end: { line: number } } }[]
): number {
  let activeIndex = -1;
  let nearestDist = Infinity;

  for (let i = 0; i < ranges.length; i++) {
    const cr = ranges[i];
    if (cursorLine >= cr.range.start.line && cursorLine <= cr.range.end.line) return i;
    const dist = Math.min(
      Math.abs(cr.range.start.line - cursorLine),
      Math.abs(cr.range.end.line - cursorLine)
    );
    if (dist < nearestDist) {
      nearestDist = dist;
      activeIndex = i;
    }
  }
  return activeIndex;
}
