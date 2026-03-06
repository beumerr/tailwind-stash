export class Position {
  constructor(
    public line: number,
    public character: number,
  ) {}

  isBefore(other: Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character < other.character)
  }

  isBeforeOrEqual(other: Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character <= other.character)
  }

  isAfter(other: Position): boolean {
    return this.line > other.line || (this.line === other.line && this.character > other.character)
  }

  isAfterOrEqual(other: Position): boolean {
    return this.line > other.line || (this.line === other.line && this.character >= other.character)
  }

  isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character
  }

  compareTo(other: Position): number {
    if (this.line < other.line) { return -1 }
    if (this.line > other.line) { return 1 }
    if (this.character < other.character) { return -1 }
    if (this.character > other.character) { return 1 }
    return 0
  }

  translate(lineDeltaOrChange?: { characterDelta?: number; lineDelta?: number } | number, characterDelta?: number): Position {
    if (typeof lineDeltaOrChange === "object") {
      return new Position(this.line + (lineDeltaOrChange.lineDelta ?? 0), this.character + (lineDeltaOrChange.characterDelta ?? 0))
    }
    return new Position(this.line + (lineDeltaOrChange ?? 0), this.character + (characterDelta ?? 0))
  }

  with(lineOrChange?: { character?: number; line?: number } | number, character?: number): Position {
    if (typeof lineOrChange === "object") {
      return new Position(lineOrChange.line ?? this.line, lineOrChange.character ?? this.character)
    }
    return new Position(lineOrChange ?? this.line, character ?? this.character)
  }
}

export class Range {
  constructor(
    public start: Position,
    public end: Position,
  ) {}

  get isEmpty(): boolean {
    return this.start.line === this.end.line && this.start.character === this.end.character
  }

  get isSingleLine(): boolean {
    return this.start.line === this.end.line
  }

  contains(pos: Position): boolean {
    if (pos.line < this.start.line || pos.line > this.end.line) {
      return false
    }
    if (pos.line === this.start.line && pos.character < this.start.character) {
      return false
    }
    if (pos.line === this.end.line && pos.character > this.end.character) {
      return false
    }
    return true
  }

  isEqual(other: Range): boolean {
    return (
      this.start.line === other.start.line &&
      this.start.character === other.start.character &&
      this.end.line === other.end.line &&
      this.end.character === other.end.character
    )
  }

  intersection(other: Range): Range | undefined {
    const start = this.start.line > other.start.line || (this.start.line === other.start.line && this.start.character > other.start.character) ? this.start : other.start
    const end = this.end.line < other.end.line || (this.end.line === other.end.line && this.end.character < other.end.character) ? this.end : other.end
    if (start.line > end.line || (start.line === end.line && start.character > end.character)) {
      return undefined
    }
    return new Range(start, end)
  }

  union(other: Range): Range {
    const start = this.start.line < other.start.line || (this.start.line === other.start.line && this.start.character < other.start.character) ? this.start : other.start
    const end = this.end.line > other.end.line || (this.end.line === other.end.line && this.end.character > other.end.character) ? this.end : other.end
    return new Range(start, end)
  }

  with(startOrChange?: { end?: Position; start?: Position } | Position, end?: Position): Range {
    if (startOrChange instanceof Position || startOrChange === undefined) {
      return new Range(startOrChange ?? this.start, end ?? this.end)
    }
    return new Range(startOrChange.start ?? this.start, startOrChange.end ?? this.end)
  }
}

export class Selection {
  active: Position
  constructor(
    public anchor: Position,
    active?: Position,
  ) {
    this.active = active ?? anchor
  }
}

export class ThemeColor {
  constructor(public id: string) {}
}

export class MarkdownString {
  constructor(public value: string = "") {}
}

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockDocument(text: string): any {
  const lines = text.split("\n")
  return {
    getText: () => text,
    positionAt(offset: number): Position {
      let line = 0
      let remaining = offset
      for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length + 1 // +1 for newline
        if (remaining < lineLen) {
          return new Position(i, remaining)
        }
        remaining -= lineLen
        line = i + 1
      }
      return new Position(line, remaining)
    },
  }
}

// ─── Mock registries for testing ────────────────────────────────────

const commandHandlers = new Map<string, (...args: unknown[]) => unknown>()
const eventListeners = {
  onDidChangeActiveTextEditor: [] as ((...args: unknown[]) => void)[],
  onDidChangeConfiguration: [] as ((...args: unknown[]) => void)[],
  onDidChangeTextDocument: [] as ((...args: unknown[]) => void)[],
  onDidChangeTextEditorSelection: [] as ((...args: unknown[]) => void)[],
}

export function _reset() {
  commandHandlers.clear()
  for (const key of Object.keys(eventListeners)) {
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    ;(eventListeners as any)[key] = []
  }
  window.activeTextEditor = undefined
  window.visibleTextEditors = []
  lastCreatedPanel = undefined
}

export function _getCommandHandler(id: string) {
  return commandHandlers.get(id)
}

export function _fireEvent(event: keyof typeof eventListeners, ...args: unknown[]) {
  for (const listener of eventListeners[event]) {
    listener(...args)
  }
}

export function createMockEditor(text: string, opts?: { cursorLine?: number; uri?: string }) {
  const doc = createMockDocument(text)
  const uri = opts?.uri ?? "file:///test.tsx"
  doc.uri = { scheme: "file", toString: () => uri }
  const cursorLine = opts?.cursorLine ?? 0
  const decorationCalls: { decorations: unknown[]; type: unknown }[] = []
  const editor = {
    _decorationCalls: decorationCalls,
    document: doc,
    edit: async (callback: (editBuilder: { replace: (range: unknown, text: string) => void }) => void) => {
      callback({ replace() {} })
      return true
    },
    revealRange() {},
    selection: new Selection(new Position(cursorLine, 0)),
    setDecorations(type: unknown, decorations: unknown[]) {
      decorationCalls.push({ decorations, type })
    },
    viewColumn: 1,
  }
  return editor
}

export const commands = {
  executeCommand(id: string, ...args: unknown[]) {
    const handler = commandHandlers.get(id)
    if (handler) {
      return handler(...args)
    }
  },
  registerCommand(id: string, handler: (...args: unknown[]) => unknown) {
    commandHandlers.set(id, handler)
    return {
      dispose() {
        commandHandlers.delete(id)
      },
    }
  },
}

function makeEventEmitter(key: keyof typeof eventListeners) {
  return (listener: (...args: unknown[]) => void) => {
    eventListeners[key].push(listener)
    return { dispose() {} }
  }
}

export function createMockWebviewPanel() {
  let disposeCallback: (() => void) | undefined
  let messageCallback: ((msg: unknown) => void) | undefined
  let disposed = false
  const messages: unknown[] = []
  const panel = {
    _getMessages: () => messages,
    _simulateDispose: () => disposeCallback?.(),
    _simulateMessage: (msg: unknown) => messageCallback?.(msg),
    dispose() {
      if (!disposed) {
        disposed = true
        disposeCallback?.()
      }
    },
    onDidDispose(cb: () => void) {
      disposeCallback = cb
      return { dispose() {} }
    },
    reveal() {},
    webview: {
      html: "",
      onDidReceiveMessage(cb: (msg: unknown) => void) {
        messageCallback = cb
        return { dispose() {} }
      },
      postMessage(msg: unknown) {
        messages.push(msg)
      },
    },
  }
  return panel
}

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
let lastCreatedPanel: any = undefined
export function _getLastPanel() {
  return lastCreatedPanel
}

export const window = {
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  activeTextEditor: undefined as any,
  createTextEditorDecorationType(_opts: unknown) {
    return { dispose() {} }
  },
  createWebviewPanel() {
    lastCreatedPanel = createMockWebviewPanel()
    return lastCreatedPanel
  },
  onDidChangeActiveTextEditor: makeEventEmitter("onDidChangeActiveTextEditor"),
  onDidChangeTextEditorSelection: makeEventEmitter("onDidChangeTextEditorSelection"),
  showInformationMessage(_msg: string) {},
  showTextDocument() {},
  visibleTextEditors: [] as unknown[],
}

export const workspace = {
  getConfiguration(_section?: string) {
    return {
      get<T>(key: string, defaultValue: T): T {
        return defaultValue
      },
    }
  },
  onDidChangeConfiguration: makeEventEmitter("onDidChangeConfiguration"),
  onDidChangeTextDocument: makeEventEmitter("onDidChangeTextDocument"),
}

export const ViewColumn = {
  Beside: 2,
}

export enum TextEditorRevealType {
  InCenter = 2,
}
