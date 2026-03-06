import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { _fireEvent, _reset, createMockEditor, window, workspace } from "../__mocks__/vscode"
import { FoldingManager } from "../../src/core/foldingProvider"

function createManager(editorText?: string, opts?: { cursorLine?: number }) {
  const editor = editorText ? createMockEditor(editorText, opts) : undefined
  window.activeTextEditor = editor
  const manager = new FoldingManager()
  return { editor, manager }
}

beforeEach(() => {
  _reset()
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── Construction ───────────────────────────────────────────────────

describe("construction", () => {
  it("creates without throwing when no active editor", () => {
    expect(() => createManager()).not.toThrow()
  })

  it("creates without throwing with an active editor", () => {
    expect(() => createManager('<div class="flex items-center p-4 rounded">')).not.toThrow()
  })

  it("defaults to enabled (foldByDefault is true)", () => {
    const { editor } = createManager('<div class="flex items-center p-4 rounded">')
    expect(editor!._decorationCalls.length).toBeGreaterThan(0)
  })
})

// ─── toggle ─────────────────────────────────────────────────────────

describe("toggle", () => {
  it("disables when toggled from default enabled state", () => {
    const { editor, manager } = createManager('<div class="flex items-center p-4 rounded">')
    editor!._decorationCalls.splice(0)

    manager.toggle()

    const lastCalls = editor!._decorationCalls
    expect(lastCalls.length).toBeGreaterThan(0)
    expect(lastCalls.every((c) => c.decorations.length === 0)).toBe(true)
  })

  it("re-enables when toggled twice", () => {
    const text = `<div>
<span class="flex items-center p-4 rounded">`
    const { editor, manager } = createManager(text, { cursorLine: 0 })

    manager.toggle()
    editor!._decorationCalls.splice(0)
    manager.toggle()

    const hasDecorations = editor!._decorationCalls.some((c) => c.decorations.length > 0)
    expect(hasDecorations).toBe(true)
  })
})

// ─── setEnabled ─────────────────────────────────────────────────────

describe("setEnabled", () => {
  it("clears decorations when disabled", () => {
    const { editor, manager } = createManager('<div class="flex items-center p-4 rounded">')
    editor!._decorationCalls.splice(0)

    manager.setEnabled(false)

    expect(editor!._decorationCalls.every((c) => c.decorations.length === 0)).toBe(true)
  })

  it("applies decorations when enabled", () => {
    const text = `<div>
<span class="flex items-center p-4 rounded">`
    const { editor, manager } = createManager(text, { cursorLine: 0 })
    manager.setEnabled(false)
    editor!._decorationCalls.splice(0)

    manager.setEnabled(true)

    const hasDecorations = editor!._decorationCalls.some((c) => c.decorations.length > 0)
    expect(hasDecorations).toBe(true)
  })

  it("does not throw when no active editor", () => {
    const { manager } = createManager()
    expect(() => manager.setEnabled(true)).not.toThrow()
    expect(() => manager.setEnabled(false)).not.toThrow()
  })
})

// ─── getClassRanges ─────────────────────────────────────────────────

describe("getClassRanges", () => {
  it("returns empty array for unknown URI", () => {
    const { manager } = createManager()
    expect(manager.getClassRanges("file:///unknown.tsx")).toEqual([])
  })

  it("returns detected ranges for a processed file", () => {
    const { manager } = createManager('<div class="flex items-center p-4 rounded">')
    const ranges = manager.getClassRanges("file:///test.tsx")
    expect(ranges).toHaveLength(1)
    expect(ranges[0].classes).toEqual(["flex", "items-center", "p-4", "rounded"])
  })

  it("returns ranges for multiple class attributes", () => {
    const text = `<div class="flex items-center p-4 rounded">
<span class="text-sm font-bold text-red-500 mt-2">`
    const { manager } = createManager(text)
    const ranges = manager.getClassRanges("file:///test.tsx")
    expect(ranges).toHaveLength(2)
  })
})

// ─── Cursor line exclusion ──────────────────────────────────────────

describe("cursor line exclusion", () => {
  it("excludes range on the cursor line from decorations", () => {
    const text = '<div class="flex items-center p-4 rounded">'
    const { editor } = createManager(text, { cursorLine: 0 })

    const hideCalls = editor!._decorationCalls.filter((c) => c.decorations.length === 0)
    expect(hideCalls.length).toBeGreaterThan(0)
  })

  it("includes ranges not on the cursor line", () => {
    const text = `<div class="flex items-center p-4 rounded">
<span>spacer</span>
<p class="text-sm font-bold text-red-500 mt-2">`
    const { editor } = createManager(text, { cursorLine: 1 })

    const hasDecorations = editor!._decorationCalls.some((c) => c.decorations.length > 0)
    expect(hasDecorations).toBe(true)
  })
})

// ─── updateDecorations ──────────────────────────────────────────────

describe("updateDecorations", () => {
  it("does not throw on a document with no classes", () => {
    expect(() => createManager("<div>hello</div>")).not.toThrow()
  })

  it("applies both placeholder and hide decoration types", () => {
    const text = `<div>
<span class="flex items-center p-4 rounded">`
    const { editor } = createManager(text, { cursorLine: 0 })

    expect(editor!._decorationCalls.length).toBeGreaterThanOrEqual(2)
  })

  it("generates placeholder with class count by default", () => {
    const text = `<div>
<span class="flex items-center p-4 rounded">`
    const { editor } = createManager(text, { cursorLine: 0 })

    const placeholderCall = editor!._decorationCalls.find(
      (c) => c.decorations.length > 0 && (c.decorations[0] as Record<string, unknown>).renderOptions,
    )
    expect(placeholderCall).toBeDefined()
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    const decoration = placeholderCall!.decorations[0] as any
    expect(decoration.renderOptions.before.contentText).toBe("4")
  })

  it("generates 'count-long' placeholder with label", () => {
    const origGet = workspace.getConfiguration
    workspace.getConfiguration = (_section?: string) => ({
      get<T>(key: string, defaultValue: T): T {
        if (key === "placeholderStyle") { return "count-long" as T }
        return defaultValue
      },
    })

    const text = `<div>
<span class="flex items-center p-4 rounded">`
    const { editor } = createManager(text, { cursorLine: 0 })

    const placeholderCall = editor!._decorationCalls.find(
      (c) => c.decorations.length > 0 && (c.decorations[0] as Record<string, unknown>).renderOptions,
    )
    expect(placeholderCall).toBeDefined()
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    const decoration = placeholderCall!.decorations[0] as any
    expect(decoration.renderOptions.before.contentText).toBe("4 classes")

    workspace.getConfiguration = origGet
  })

  it("generates 'empty' placeholder with ellipsis", () => {
    const origGet = workspace.getConfiguration
    workspace.getConfiguration = (_section?: string) => ({
      get<T>(key: string, defaultValue: T): T {
        if (key === "placeholderStyle") { return "empty" as T }
        return defaultValue
      },
    })

    const text = `<div>
<span class="flex items-center p-4 rounded">`
    const { editor } = createManager(text, { cursorLine: 0 })

    const placeholderCall = editor!._decorationCalls.find(
      (c) => c.decorations.length > 0 && (c.decorations[0] as Record<string, unknown>).renderOptions,
    )
    expect(placeholderCall).toBeDefined()
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    const decoration = placeholderCall!.decorations[0] as any
    expect(decoration.renderOptions.before.contentText).toBe("…")

    workspace.getConfiguration = origGet
  })

  it("falls back to count for unknown placeholder style", () => {
    const origGet = workspace.getConfiguration
    workspace.getConfiguration = (_section?: string) => ({
      get<T>(key: string, defaultValue: T): T {
        if (key === "placeholderStyle") { return "unknown-style" as T }
        return defaultValue
      },
    })

    const text = `<div>
<span class="flex items-center p-4 rounded">`
    const { editor } = createManager(text, { cursorLine: 0 })

    const placeholderCall = editor!._decorationCalls.find(
      (c) => c.decorations.length > 0 && (c.decorations[0] as Record<string, unknown>).renderOptions,
    )
    expect(placeholderCall).toBeDefined()
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    const decoration = placeholderCall!.decorations[0] as any
    expect(decoration.renderOptions.before.contentText).toBe("4")

    workspace.getConfiguration = origGet
  })

  it("generates 'count-long' singular for 1 class", () => {
    const origGet = workspace.getConfiguration
    workspace.getConfiguration = (_section?: string) => ({
      get<T>(key: string, defaultValue: T): T {
        if (key === "placeholderStyle") { return "count-long" as T }
        if (key === "minClassCount") { return 1 as T }
        return defaultValue
      },
    })

    const text = `<div>
<span class="flex">`
    const { editor } = createManager(text, { cursorLine: 0 })

    const placeholderCall = editor!._decorationCalls.find(
      (c) => c.decorations.length > 0 && (c.decorations[0] as Record<string, unknown>).renderOptions,
    )
    expect(placeholderCall).toBeDefined()
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    const decoration = placeholderCall!.decorations[0] as any
    expect(decoration.renderOptions.before.contentText).toBe("1 class")

    workspace.getConfiguration = origGet
  })

  it("includes hover message with class list", () => {
    const text = `<div>
<span class="flex items-center p-4 rounded">`
    const { editor } = createManager(text, { cursorLine: 0 })

    const placeholderCall = editor!._decorationCalls.find(
      (c) => c.decorations.length > 0 && (c.decorations[0] as Record<string, unknown>).hoverMessage,
    )
    expect(placeholderCall).toBeDefined()
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    const decoration = placeholderCall!.decorations[0] as any
    expect(decoration.hoverMessage.value).toContain("flex")
    expect(decoration.hoverMessage.value).toContain("rounded")
  })
})

// ─── Event handlers ─────────────────────────────────────────────────

describe("event handlers", () => {
  it("updates decorations when active editor changes", () => {
    const { manager } = createManager()
    const newEditor = createMockEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 1 },
    )
    window.activeTextEditor = newEditor

    _fireEvent("onDidChangeActiveTextEditor", newEditor)

    const hasDecorations = newEditor._decorationCalls.some((c) => c.decorations.length > 0)
    expect(hasDecorations).toBe(true)
  })

  it("debounces text document changes", () => {
    vi.useFakeTimers()
    const { editor } = createManager('<div class="flex items-center p-4 rounded">')
    editor!._decorationCalls.splice(0)

    _fireEvent("onDidChangeTextDocument", { document: editor!.document })
    // Should not have updated yet
    expect(editor!._decorationCalls).toHaveLength(0)

    vi.advanceTimersByTime(200)
    // Should have updated after debounce
    expect(editor!._decorationCalls.length).toBeGreaterThan(0)
  })

  it("debounces selection changes", () => {
    vi.useFakeTimers()
    const { editor } = createManager('<div class="flex items-center p-4 rounded">')
    editor!._decorationCalls.splice(0)

    _fireEvent("onDidChangeTextEditorSelection", {
      selections: [{ active: { line: 5 } }],
      textEditor: editor,
    })
    // Should not have updated yet
    expect(editor!._decorationCalls).toHaveLength(0)

    vi.advanceTimersByTime(200)
    expect(editor!._decorationCalls.length).toBeGreaterThan(0)
  })

  it("skips selection update when cursor stays on the same line", () => {
    vi.useFakeTimers()
    const { editor } = createManager('<div class="flex items-center p-4 rounded">')

    // Fire first selection change
    _fireEvent("onDidChangeTextEditorSelection", {
      selections: [{ active: { line: 5 } }],
      textEditor: editor,
    })
    vi.advanceTimersByTime(200)
    editor!._decorationCalls.splice(0)

    // Fire same line again
    _fireEvent("onDidChangeTextEditorSelection", {
      selections: [{ active: { line: 5 } }],
      textEditor: editor,
    })
    vi.advanceTimersByTime(200)

    // Should not have re-rendered
    expect(editor!._decorationCalls).toHaveLength(0)
  })

  it("updates when config changes", () => {
    const { editor } = createManager('<div class="flex items-center p-4 rounded">')
    editor!._decorationCalls.splice(0)

    _fireEvent("onDidChangeConfiguration", {
      affectsConfiguration: (section: string) => section === "tailwindStash",
    })

    expect(editor!._decorationCalls.length).toBeGreaterThan(0)
  })

  it("ignores config changes for other sections", () => {
    const { editor } = createManager('<div class="flex items-center p-4 rounded">')
    editor!._decorationCalls.splice(0)

    _fireEvent("onDidChangeConfiguration", {
      affectsConfiguration: (section: string) => section === "someOtherExtension",
    })

    expect(editor!._decorationCalls).toHaveLength(0)
  })
})

// ─── dispose ────────────────────────────────────────────────────────

describe("dispose", () => {
  it("does not throw", () => {
    const { manager } = createManager('<div class="flex items-center p-4 rounded">')
    expect(() => manager.dispose()).not.toThrow()
  })

  it("can be called when no editor was active", () => {
    const { manager } = createManager()
    expect(() => manager.dispose()).not.toThrow()
  })

  it("clears pending debounce timers", () => {
    vi.useFakeTimers()
    const { editor, manager } = createManager('<div class="flex items-center p-4 rounded">')

    // Trigger a debounced event
    _fireEvent("onDidChangeTextDocument", { document: editor!.document })

    // Dispose before the debounce fires
    manager.dispose()

    // Advance past debounce — should not throw
    expect(() => vi.advanceTimersByTime(200)).not.toThrow()
  })
})
