import * as vscode from 'vscode';
import { ClassRange } from './classDetector';

export class CSSPreviewPanel {
  public static currentPanel: CSSPreviewPanel | undefined;
  private static readonly viewType = 'tailwindStash.classEditor';

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private getClassRanges: (uri: string) => ClassRange[];
  private currentRanges: ClassRange[] = [];
  private currentEditorUri: string = '';
  private lastContentKey: string = '';
  private lastActiveIndex: number = -1;
  private updating: boolean = false;

  private constructor(
    panel: vscode.WebviewPanel,
    getClassRanges: (uri: string) => ClassRange[]
  ) {
    this.panel = panel;
    this.getClassRanges = getClassRanges;

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

  static createOrShow(getClassRanges: (uri: string) => ClassRange[]) {
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

    CSSPreviewPanel.currentPanel = new CSSPreviewPanel(panel, getClassRanges);
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
    if (this.updating) return;

    const uri = editor.document.uri.toString();
    this.currentEditorUri = uri;
    const ranges = this.getClassRanges(uri);
    this.currentRanges = ranges;

    if (ranges.length === 0) {
      this.lastContentKey = '';
      this.lastActiveIndex = -1;
      this.panel.webview.html = this.getEmptyHtml();
      return;
    }

    const activeIndex = this.findActiveIndex(editor, ranges);

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

    const items = ranges.map((cr, i) => {
      const isActive = i === activeIndex;
      return `
      <div class="entry ${isActive ? 'active' : ''}" data-index="${i}">
        <div class="header">
          <span class="element">${escapeHtml(cr.element)}</span>
          <span class="line-num">L${cr.range.start.line + 1}</span>
          <span class="count">${cr.classes.length} classes</span>
        </div>
        <textarea
          class="class-editor"
          data-index="${i}"
          spellcheck="false"
        >${escapeHtml(cr.classes.join('\n'))}</textarea>
      </div>`;
    }).join('\n');

    this.updating = true;
    this.panel.webview.html = this.getHtml(items);
    setTimeout(() => { this.updating = false; }, 200);
  }

  private findActiveIndex(editor: vscode.TextEditor, ranges: ClassRange[]): number {
    const cursor = editor.selection.active;
    let activeIndex = -1;
    let nearestDist = Infinity;

    for (let i = 0; i < ranges.length; i++) {
      const cr = ranges[i];
      if (cr.range.contains(cursor)) return i;
      const dist = Math.min(
        Math.abs(cr.range.start.line - cursor.line),
        Math.abs(cr.range.end.line - cursor.line)
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        activeIndex = i;
      }
    }
    return activeIndex;
  }

  private getHtml(content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-editor-font-family, 'Consolas', monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      padding: 12px;
      margin: 0;
    }
    h2 {
      font-size: 14px;
      color: var(--vscode-descriptionForeground);
      margin: 0 0 12px 0;
      font-weight: 500;
    }
    .entry {
      margin: 6px 0;
      border: 1px solid var(--vscode-textBlockQuote-border);
      border-radius: 4px;
      overflow: hidden;
      opacity: 0.6;
      transition: opacity 0.15s, border-color 0.15s;
    }
    .entry.active {
      opacity: 1;
      border-color: var(--vscode-focusBorder);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background-color: var(--vscode-textBlockQuote-background);
      border-bottom: 1px solid var(--vscode-textBlockQuote-border);
      cursor: pointer;
    }
    .element {
      font-weight: 600;
      color: var(--vscode-symbolIcon-classForeground, #ee9d28);
      margin-right: 6px;
    }
    .line-num {
      font-weight: 400;
      color: var(--vscode-descriptionForeground);
    }
    .count {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .class-editor {
      width: 100%;
      border: none;
      outline: none;
      resize: vertical;
      padding: 8px 10px;
      font-family: inherit;
      font-size: inherit;
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      line-height: 1.6;
      min-height: 40px;
    }
    .class-editor:focus {
      background-color: var(--vscode-editor-selectionBackground);
    }
  </style>
</head>
<body>
  <h2>Tailwind Classes</h2>
  ${content}
  <script>
    const vscode = acquireVsCodeApi();
    let debounceTimers = {};

    document.querySelectorAll('.class-editor').forEach(textarea => {
      function autoResize() {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
      autoResize();

      textarea.addEventListener('input', () => {
        autoResize();
        const index = parseInt(textarea.dataset.index);
        clearTimeout(debounceTimers[index]);
        debounceTimers[index] = setTimeout(() => {
          const classes = textarea.value.split(/\\n/).map(s => s.trim()).filter(Boolean).join(' ');
          vscode.postMessage({ type: 'updateClasses', index, classes });
        }, 500);
      });
    });

    document.querySelectorAll('.header').forEach(header => {
      header.addEventListener('click', () => {
        const index = parseInt(header.parentElement.dataset.index);
        vscode.postMessage({ type: 'goToRange', index });
      });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'setActive') {
        document.querySelectorAll('.entry.active').forEach(el => {
          el.classList.remove('active');
        });
        const target = document.querySelector('.entry[data-index="' + msg.index + '"]');
        if (target) {
          target.classList.add('active');
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });

    const initialActive = document.querySelector('.entry.active');
    if (initialActive) {
      initialActive.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  </script>
</body>
</html>`;
  }

  private getEmptyHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-editor-font-family);
      color: var(--vscode-descriptionForeground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 80vh;
    }
  </style>
</head>
<body>
  <p>No Tailwind classes detected in the current file.</p>
</body>
</html>`;
  }

  dispose() {
    CSSPreviewPanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
