export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(public start: Position, public end: Position) {}

  contains(pos: Position): boolean {
    if (pos.line < this.start.line || pos.line > this.end.line) return false;
    if (pos.line === this.start.line && pos.character < this.start.character) return false;
    if (pos.line === this.end.line && pos.character > this.end.character) return false;
    return true;
  }
}

export class Selection {
  active: Position;
  constructor(public anchor: Position, active?: Position) {
    this.active = active ?? anchor;
  }
}

export class ThemeColor {
  constructor(public id: string) {}
}

export class MarkdownString {
  constructor(public value: string = '') {}
}

export function createMockDocument(text: string): any {
  const lines = text.split('\n');
  return {
    getText: () => text,
    positionAt(offset: number): Position {
      let line = 0;
      let remaining = offset;
      for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length + 1; // +1 for newline
        if (remaining < lineLen) {
          return new Position(i, remaining);
        }
        remaining -= lineLen;
        line = i + 1;
      }
      return new Position(line, remaining);
    },
  };
}

// ─── Mock registries for testing ────────────────────────────────────

const commandHandlers = new Map<string, (...args: any[]) => any>();
const eventListeners = {
  onDidChangeActiveTextEditor: [] as Function[],
  onDidChangeTextDocument: [] as Function[],
  onDidChangeTextEditorSelection: [] as Function[],
  onDidChangeConfiguration: [] as Function[],
};

export function _reset() {
  commandHandlers.clear();
  for (const key of Object.keys(eventListeners)) {
    (eventListeners as any)[key] = [];
  }
  window.activeTextEditor = undefined;
}

export function _getCommandHandler(id: string) {
  return commandHandlers.get(id);
}

export function _fireEvent(event: keyof typeof eventListeners, ...args: any[]) {
  for (const listener of eventListeners[event]) {
    listener(...args);
  }
}

export function createMockEditor(text: string, opts?: { cursorLine?: number; uri?: string }) {
  const doc = createMockDocument(text);
  const uri = opts?.uri ?? 'file:///test.tsx';
  doc.uri = { toString: () => uri, scheme: 'file' };
  const cursorLine = opts?.cursorLine ?? 0;
  const decorationCalls: { type: any; decorations: any[] }[] = [];
  const editor = {
    document: doc,
    selection: new Selection(new Position(cursorLine, 0)),
    setDecorations(type: any, decorations: any[]) {
      decorationCalls.push({ type, decorations });
    },
    viewColumn: 1,
    _decorationCalls: decorationCalls,
  };
  return editor;
}

export const commands = {
  registerCommand(id: string, handler: (...args: any[]) => any) {
    commandHandlers.set(id, handler);
    return { dispose() { commandHandlers.delete(id); } };
  },
  executeCommand(id: string, ...args: any[]) {
    const handler = commandHandlers.get(id);
    if (handler) return handler(...args);
  },
};

function makeEventEmitter(key: keyof typeof eventListeners) {
  return (listener: Function) => {
    eventListeners[key].push(listener);
    return { dispose() {} };
  };
}

export const window = {
  activeTextEditor: undefined as any,
  visibleTextEditors: [] as any[],
  createTextEditorDecorationType(_opts: any) {
    return { dispose() {} };
  },
  onDidChangeActiveTextEditor: makeEventEmitter('onDidChangeActiveTextEditor'),
  onDidChangeTextEditorSelection: makeEventEmitter('onDidChangeTextEditorSelection'),
  showInformationMessage(_msg: string) {},
  createWebviewPanel() {
    return {
      webview: { html: '', onDidReceiveMessage() {}, postMessage() {} },
      onDidDispose() {},
      reveal() {},
      dispose() {},
    };
  },
  showTextDocument() {},
};

export const workspace = {
  getConfiguration(_section?: string) {
    return {
      get<T>(key: string, defaultValue: T): T {
        return defaultValue;
      },
    };
  },
  onDidChangeTextDocument: makeEventEmitter('onDidChangeTextDocument'),
  onDidChangeConfiguration: makeEventEmitter('onDidChangeConfiguration'),
};

export const ViewColumn = {
  Beside: 2,
};

export enum TextEditorRevealType {
  InCenter = 2,
}
