import { describe, it, expect, beforeEach } from "vitest"

import { _reset, createMockEditor, window } from "../__mocks__/vscode"
import { FoldingManager } from "../../src/core/foldingProvider"

function makeContext() {
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  return { subscriptions: [] } as any
}

function createManager(editorText?: string, opts?: { cursorLine?: number }) {
  const editor = editorText ? createMockEditor(editorText, opts) : undefined
  window.activeTextEditor = editor
  const manager = new FoldingManager(makeContext())
  return { editor, manager }
}

beforeEach(() => {
  _reset()
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
    const { editor, manager } = createManager('<div class="flex items-center p-4 rounded">')
    // Should have applied decorations since it's enabled by default
    expect(editor!._decorationCalls.length).toBeGreaterThan(0)
  })
})

// ─── toggle ─────────────────────────────────────────────────────────

describe("toggle", () => {
  it("disables when toggled from default enabled state", () => {
    const { editor, manager } = createManager('<div class="flex items-center p-4 rounded">')
    editor!._decorationCalls.length = 0 // clear initial calls

    manager.toggle() // enabled -> disabled

    // When disabled, decorations should be cleared (empty arrays)
    const lastCalls = editor!._decorationCalls
    expect(lastCalls.length).toBeGreaterThan(0)
    expect(lastCalls.every((c) => c.decorations.length === 0)).toBe(true)
  })

  it("re-enables when toggled twice", () => {
    const text = `<div>
<span class="flex items-center p-4 rounded">`
    const { editor, manager } = createManager(text, { cursorLine: 0 })

    manager.toggle() // disable
    editor!._decorationCalls.length = 0
    manager.toggle() // re-enable

    // Should have applied decorations again
    const hasDecorations = editor!._decorationCalls.some((c) => c.decorations.length > 0)
    expect(hasDecorations).toBe(true)
  })
})

// ─── setEnabled ─────────────────────────────────────────────────────

describe("setEnabled", () => {
  it("clears decorations when disabled", () => {
    const { editor, manager } = createManager('<div class="flex items-center p-4 rounded">')
    editor!._decorationCalls.length = 0

    manager.setEnabled(false)

    expect(editor!._decorationCalls.every((c) => c.decorations.length === 0)).toBe(true)
  })

  it("applies decorations when enabled", () => {
    const text = `<div>
<span class="flex items-center p-4 rounded">`
    const { editor, manager } = createManager(text, { cursorLine: 0 })
    manager.setEnabled(false)
    editor!._decorationCalls.length = 0

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
    // Cursor on line 0 where the class attribute is
    const { editor } = createManager(text, { cursorLine: 0 })

    // The hide decorations (second call per update) should be empty
    // because the cursor is on the same line as the class
    const hideCalls = editor!._decorationCalls.filter((c) => c.decorations.length === 0)
    expect(hideCalls.length).toBeGreaterThan(0)
  })

  it("includes ranges not on the cursor line", () => {
    const text = `<div class="flex items-center p-4 rounded">
<span>spacer</span>
<p class="text-sm font-bold text-red-500 mt-2">`
    // Cursor on line 1 (spacer), so both class lines should be decorated
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

    // Should have at least 2 setDecorations calls (placeholder + hide)
    expect(editor!._decorationCalls.length).toBeGreaterThanOrEqual(2)
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
})
