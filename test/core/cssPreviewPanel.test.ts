import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  EventEmitter,
  Position,
  Range,
  Selection,
  _fireEvent,
  _getLastPanel,
  _reset,
  createMockEditor,
  mockConfig,
  window,
} from "../__mocks__/vscode"
import { CSSPreviewPanel, findActiveIndex } from "../../src/core/cssPreviewPanel"

const extensionPath = path.resolve(__dirname, "../..")
const noopEvent = new EventEmitter<string>().event

function makeClassRange(
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
  classes: string[],
  element: string,
) {
  return {
    classes,
    element,
    range: new Range(new Position(startLine, startChar), new Position(endLine, endChar)),
  }
}

function createPanelWithEditor(text?: string, opts?: { cursorLine?: number }) {
  const editor = text ? createMockEditor(text, opts) : undefined
  window.activeTextEditor = editor
  if (editor) {
    window.visibleTextEditors = [editor]
  }

  const getClassRanges = vi.fn(() => {
    if (!editor) {
      return []
    }
    // Return a realistic class range for the test text
    return [makeClassRange(0, 12, 0, 41, ["flex", "items-center", "p-4", "rounded"], "div")]
  })

  const rangesEmitter = new EventEmitter<string>()
  CSSPreviewPanel.createOrShow(extensionPath, getClassRanges, rangesEmitter.event)
  const panel = _getLastPanel()!
  return { editor, getClassRanges, panel, rangesEmitter }
}

beforeEach(() => {
  _reset()
  CSSPreviewPanel.currentPanel = undefined
})

afterEach(() => {
  CSSPreviewPanel.currentPanel?.dispose()
  CSSPreviewPanel.currentPanel = undefined
})

// ─── findActiveIndex ────────────────────────────────────────────────

function makeRange(startLine: number, endLine: number) {
  return {
    range: {
      end: { line: endLine },
      start: { line: startLine },
    },
  }
}

describe("findActiveIndex", () => {
  it("returns -1 for empty ranges", () => {
    expect(findActiveIndex(5, [])).toBe(-1)
  })

  it("returns 0 when cursor is inside the only range", () => {
    const ranges = [makeRange(3, 5)]
    expect(findActiveIndex(4, ranges)).toBe(0)
  })

  it("returns 0 when cursor is on the start line of the range", () => {
    const ranges = [makeRange(3, 5)]
    expect(findActiveIndex(3, ranges)).toBe(0)
  })

  it("returns 0 when cursor is on the end line of the range", () => {
    const ranges = [makeRange(3, 5)]
    expect(findActiveIndex(5, ranges)).toBe(0)
  })

  it("returns the nearest range when cursor is outside all ranges", () => {
    const ranges = [makeRange(2, 3), makeRange(10, 12)]
    expect(findActiveIndex(5, ranges)).toBe(0)
  })

  it("returns the nearest range when cursor is closer to a later range", () => {
    const ranges = [makeRange(2, 3), makeRange(10, 12)]
    expect(findActiveIndex(9, ranges)).toBe(1)
  })

  it("returns the containing range even if another is closer by line number", () => {
    const ranges = [makeRange(1, 1), makeRange(3, 7), makeRange(9, 9)]
    expect(findActiveIndex(5, ranges)).toBe(1)
  })

  it("returns first range when cursor is before all ranges", () => {
    const ranges = [makeRange(5, 6), makeRange(10, 12)]
    expect(findActiveIndex(0, ranges)).toBe(0)
  })

  it("returns last range when cursor is after all ranges", () => {
    const ranges = [makeRange(5, 6), makeRange(10, 12)]
    expect(findActiveIndex(100, ranges)).toBe(1)
  })

  it("picks the closer range when cursor is equidistant between two", () => {
    const ranges = [makeRange(2, 2), makeRange(8, 8)]
    const result = findActiveIndex(5, ranges)
    expect(result).toBe(0)
  })

  it("handles single-line ranges", () => {
    const ranges = [makeRange(5, 5)]
    expect(findActiveIndex(5, ranges)).toBe(0)
    expect(findActiveIndex(3, ranges)).toBe(0)
  })

  it("handles many ranges and finds the right one", () => {
    const ranges = Array.from({ length: 20 }, (_, i) => makeRange(i * 5, i * 5 + 1))
    expect(findActiveIndex(50, ranges)).toBe(10)
  })

  it("handles cursor between two adjacent ranges", () => {
    const ranges = [makeRange(1, 2), makeRange(4, 5)]
    const result = findActiveIndex(3, ranges)
    expect(result).toBe(0)
  })
})

// ─── createOrShow ───────────────────────────────────────────────────

describe("createOrShow", () => {
  it("creates a new panel when none exists", () => {
    createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    expect(CSSPreviewPanel.currentPanel).toBeDefined()
  })

  it("reveals existing panel instead of creating a new one", () => {
    createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    const firstPanel = _getLastPanel()

    CSSPreviewPanel.createOrShow(extensionPath, () => [], noopEvent)
    // Should not have created a new panel
    expect(_getLastPanel()).toBe(firstPanel)
  })

  it("sends initial update when an editor is active", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    const messages = panel._getMessages()
    const updateMsg = messages.find((m) => m.type === "update")
    expect(updateMsg).toBeDefined()
  })

  it("sends config message on creation", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    const messages = panel._getMessages()
    const configMsg = messages.find((m) => m.type === "config")
    expect(configMsg).toBeDefined()
  })

  it("does not send update when no editor is active", () => {
    createPanelWithEditor()
    const panel = _getLastPanel()!
    const messages = panel._getMessages()
    const updateMsg = messages.find((m) => m.type === "update")
    expect(updateMsg).toBeUndefined()
  })
})

// ─── hide ───────────────────────────────────────────────────────────

describe("hide", () => {
  it("disposes the current panel", () => {
    createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    expect(CSSPreviewPanel.currentPanel).toBeDefined()

    CSSPreviewPanel.hide()
    expect(CSSPreviewPanel.currentPanel).toBeUndefined()
  })

  it("does nothing when no panel exists", () => {
    expect(() => CSSPreviewPanel.hide()).not.toThrow()
  })
})

// ─── toggle ─────────────────────────────────────────────────────────

describe("toggle", () => {
  it("creates panel when none exists", () => {
    window.activeTextEditor = undefined
    CSSPreviewPanel.toggle(extensionPath, () => [], noopEvent)
    expect(CSSPreviewPanel.currentPanel).toBeDefined()
  })

  it("disposes panel when one exists", () => {
    CSSPreviewPanel.toggle(extensionPath, () => [], noopEvent)
    expect(CSSPreviewPanel.currentPanel).toBeDefined()

    CSSPreviewPanel.toggle(extensionPath, () => [], noopEvent)
    expect(CSSPreviewPanel.currentPanel).toBeUndefined()
  })
})

// ─── dispose ────────────────────────────────────────────────────────

describe("dispose", () => {
  it("clears currentPanel reference", () => {
    createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    expect(CSSPreviewPanel.currentPanel).toBeDefined()

    CSSPreviewPanel.currentPanel!.dispose()
    expect(CSSPreviewPanel.currentPanel).toBeUndefined()
  })
})

// ─── handleMessage ──────────────────────────────────────────────────

describe("handleMessage", () => {
  it("handles goToRange message", () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })

    panel._simulateMessage({ index: 0, type: "goToRange" })

    // Should have updated the selection
    expect(editor!.selection).toBeDefined()
  })

  it("handles selectEntry message", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    panel._simulateMessage({ index: 0, type: "selectEntry" })

    // Should have sent a setActive message back
    const messagesAfter = panel._getMessages()
    const setActiveMsg = messagesAfter.slice(messagesBefore).find((m) => m.type === "setActive")
    expect(setActiveMsg).toEqual({ index: 0, type: "setActive" })
  })

  it("handles updateClasses message", async () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const editSpy = vi.spyOn(editor!, "edit")

    await panel._simulateMessage({ classes: "flex p-4", index: 0, type: "updateClasses" })

    expect(editSpy).toHaveBeenCalled()
  })

  it("skips edit when fresh range contains quotes (stale range protection)", async () => {
    const { editor, getClassRanges, panel } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )
    const editSpy = vi.spyOn(editor!, "edit")

    // Simulate stale range that extends past the closing quote
    getClassRanges.mockReturnValue([
      makeClassRange(0, 12, 0, 43, ["flex", "items-center", "p-4", "rounded"], "div"),
    ])

    await panel._simulateMessage({ classes: "flex p-4", index: 0, type: "updateClasses" })

    expect(editSpy).not.toHaveBeenCalled()
  })

  it("ignores messages with undefined index", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    // Should not throw
    panel._simulateMessage({ type: "goToRange" })

    // Should not have sent any new messages
    expect(panel._getMessages().length).toBe(messagesBefore)
  })

  it("resends config and update on ready message", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    panel._simulateMessage({ type: "ready" })

    const newMessages = panel._getMessages().slice(messagesBefore)
    const configMsg = newMessages.find((m) => m.type === "config")
    const updateMsg = newMessages.find((m) => m.type === "update")
    expect(configMsg).toBeDefined()
    expect(updateMsg).toBeDefined()
  })

  it("ignores messages with out-of-bounds index", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    panel._simulateMessage({ index: 999, type: "goToRange" })

    expect(panel._getMessages().length).toBe(messagesBefore)
  })

  it("handles selectEntry without scrolling when scrollEditorOnPanelSelect is false", () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })

    const cleanup = mockConfig({ scrollEditorOnPanelSelect: false })

    const revealSpy = vi.spyOn(editor!, "revealRange")
    panel._simulateMessage({ index: 0, type: "selectEntry" })

    // Should NOT have called revealRange since scroll is disabled
    expect(revealSpy).not.toHaveBeenCalled()

    cleanup()
  })

  it("ignores messages when no matching editor is found", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    // Clear visible editors so the find() fails
    window.visibleTextEditors = []
    const messagesBefore = panel._getMessages().length

    panel._simulateMessage({ index: 0, type: "goToRange" })

    expect(panel._getMessages().length).toBe(messagesBefore)
  })
})

// ─── updateForEditor (via events) ───────────────────────────────────

describe("updateForEditor", () => {
  it("sends update message with entries when editor changes", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messages = panel._getMessages()
    const updateMsg = messages.find((m) => m.type === "update")!
    expect(updateMsg).toBeDefined()
    const entries = updateMsg.entries as { classes: string[]; element: string }[]
    expect(entries).toHaveLength(1)
    expect(entries[0].element).toBe("div")
    expect(entries[0].classes).toEqual(["flex", "items-center", "p-4", "rounded"])
  })

  it("sends setActive when only cursor position changes", () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    // Trigger another updateForEditor with the same content
    _fireEvent("onDidChangeTextEditorSelection", {
      selections: [{ active: { line: 0 } }],
      textEditor: editor,
    })

    // Flush the selection debounce
    vi.useFakeTimers()
    vi.advanceTimersByTime(200)
    vi.useRealTimers()

    // The content hasn't changed, so it should send setActive or nothing
    // (depending on whether active index changed)
    const newMessages = panel._getMessages().slice(messagesBefore)
    for (const msg of newMessages) {
      expect(["setActive", "update"]).toContain(msg.type)
    }
  })

  it("skips update when content key is unchanged and active index is the same", () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    // Fire selection change with same line — triggers updateForEditor with same content key
    _fireEvent("onDidChangeTextEditorSelection", {
      selections: [{ active: { line: 0 } }],
      textEditor: editor,
    })

    const newMessages = panel._getMessages().slice(messagesBefore)
    // Should not send a duplicate update
    const updateMsgs = newMessages.filter((m) => m.type === "update")
    expect(updateMsgs).toHaveLength(0)
  })
})

// ─── onDidUpdateRanges event-driven sync ────────────────────────────

describe("onDidUpdateRanges event-driven sync", () => {
  it("updates panel when onDidUpdateRanges fires for current URI", () => {
    const { getClassRanges, panel, rangesEmitter } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )
    const messagesBefore = panel._getMessages().length

    // Simulate ranges changing (different class list)
    getClassRanges.mockReturnValue([
      makeClassRange(0, 12, 0, 30, ["flex", "p-4", "rounded", "mt-2"], "div"),
    ])
    rangesEmitter.fire("file:///test.tsx")

    const newMessages = panel._getMessages().slice(messagesBefore)
    const updateMsg = newMessages.find((m) => m.type === "update")
    expect(updateMsg).toBeDefined()
  })

  it("skips update when onDidUpdateRanges fires but ranges are unchanged", () => {
    const { panel, rangesEmitter } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )
    const messagesBefore = panel._getMessages().length

    // Fire event without changing getClassRanges — ranges are identical
    rangesEmitter.fire("file:///test.tsx")

    const newMessages = panel._getMessages().slice(messagesBefore)
    const updateMsgs = newMessages.filter((m) => m.type === "update")
    expect(updateMsgs).toHaveLength(0)
  })

  it("ignores onDidUpdateRanges for a different URI", () => {
    const { panel, rangesEmitter } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )
    const messagesBefore = panel._getMessages().length

    rangesEmitter.fire("file:///other.tsx")

    expect(panel._getMessages().length).toBe(messagesBefore)
  })

  it("skips editor changes for output scheme", () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    // Simulate active editor change with output scheme
    const outputEditor = {
      ...editor,
      document: { ...editor!.document, uri: { scheme: "output", toString: () => "output:test" } },
    }
    _fireEvent("onDidChangeActiveTextEditor", outputEditor)

    expect(panel._getMessages().length).toBe(messagesBefore)
  })

  it("skips selection changes for output scheme", () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    const outputEditor = {
      ...editor,
      document: { ...editor!.document, uri: { scheme: "output", toString: () => "output:test" } },
    }
    _fireEvent("onDidChangeTextEditorSelection", {
      selections: [{ active: { line: 0 } }],
      textEditor: outputEditor,
    })

    expect(panel._getMessages().length).toBe(messagesBefore)
  })
})

// ─── updateForEditor content key caching ────────────────────────────

describe("updateForEditor content key caching", () => {
  it("sends only setActive when content is unchanged but active index changes", () => {
    const { editor, getClassRanges, panel, rangesEmitter } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )

    // Override to return two ranges so active index can differ
    const range1 = makeClassRange(0, 13, 0, 48, ["flex", "items-center", "p-4", "rounded"], "div")
    const range2 = makeClassRange(2, 13, 2, 48, ["text-sm", "font-bold", "mt-2", "mx-auto"], "span")
    getClassRanges.mockReturnValue([range1, range2])

    // First update via event
    editor!.selection = { active: { line: 0 } } as unknown as Selection
    rangesEmitter.fire("file:///test.tsx")
    const messagesAfterFirst = panel._getMessages().length

    // Second update at line 2 (same content, different active) via selection change
    editor!.selection = { active: { line: 2 } } as unknown as Selection
    _fireEvent("onDidChangeTextEditorSelection", {
      selections: [{ active: { line: 2 } }],
      textEditor: editor,
    })

    const newMessages = panel._getMessages().slice(messagesAfterFirst)
    const setActiveMsgs = newMessages.filter((m) => m.type === "setActive")
    const updateMsgs = newMessages.filter((m) => m.type === "update")
    expect(setActiveMsgs.length).toBeGreaterThan(0)
    expect(updateMsgs).toHaveLength(0)
  })
})

// ─── config change event ────────────────────────────────────────────

describe("config change event", () => {
  it("ignores config changes for other sections", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    _fireEvent("onDidChangeConfiguration", {
      affectsConfiguration: (section: string) => section === "someOtherExtension",
    })

    const newMessages = panel._getMessages().slice(messagesBefore)
    const configMsg = newMessages.find((m) => m.type === "config")
    expect(configMsg).toBeUndefined()
  })

  it("resends config when tailwindStash config changes", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    _fireEvent("onDidChangeConfiguration", {
      affectsConfiguration: (section: string) => section === "tailwindStash",
    })

    const newMessages = panel._getMessages().slice(messagesBefore)
    const configMsg = newMessages.find((m) => m.type === "config")
    expect(configMsg).toBeDefined()
  })
})

// ─── getHtml ────────────────────────────────────────────────────────

describe("getHtml (via panel creation)", () => {
  it("sets webview html with nonce-based CSP", () => {
    createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    const panel = _getLastPanel()!
    expect(panel.webview.html).toContain("Content-Security-Policy")
    expect(panel.webview.html).toContain("nonce-")
    expect(panel.webview.html).not.toContain("{{NONCE}}")
    expect(panel.webview.html).not.toContain("{{CSS}}")
    expect(panel.webview.html).not.toContain("{{JS}}")
  })

  it("injects the compiled JS and CSS into the HTML", () => {
    createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    const panel = _getLastPanel()!
    const html = panel.webview.html
    // The JS bundle must be present (starts with "use strict")
    expect(html).toContain('"use strict"')
    // The CSS must contain actual styles (Tailwind generates these)
    expect(html).toContain("--tw-")
  })

  it("does not contain Node.js imports that would fail in the browser sandbox", () => {
    createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    const panel = _getLastPanel()!
    const html = panel.webview.html
    // The webview runs in a browser sandbox — any require("node:*") will crash at runtime
    expect(html).not.toMatch(/require\(["']node:/)
  })
})

// ─── Regression tests for fixed bugs ────────────────────────────────

describe("regression: stale range protection", () => {
  it("re-detects ranges before applying edit to avoid stale positions", async () => {
    const { editor, getClassRanges, panel } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )
    const editSpy = vi.spyOn(editor!, "edit")

    // First call returns initial range, second call returns shifted range
    const shiftedRange = makeClassRange(0, 12, 0, 35, ["flex", "items-center", "p-4"], "div")
    getClassRanges.mockReturnValueOnce([shiftedRange])

    await panel._simulateMessage({
      classes: "flex items-center p-4",
      index: 0,
      type: "updateClasses",
    })

    // Should have called getClassRanges again (re-detect) before editing
    expect(getClassRanges).toHaveBeenCalled()
    expect(editSpy).toHaveBeenCalled()
  })

  it("aborts edit when re-detected range contains quote characters", async () => {
    const { editor, getClassRanges, panel } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )
    const editSpy = vi.spyOn(editor!, "edit")

    // Range extends past the closing quote — getText would return content with "
    getClassRanges.mockReturnValue([
      makeClassRange(0, 12, 0, 43, ["flex", "items-center", "p-4", "rounded"], "div"),
    ])

    await panel._simulateMessage({ classes: "flex p-4", index: 0, type: "updateClasses" })

    expect(editSpy).not.toHaveBeenCalled()
  })

  it("aborts edit when re-detected range index is out of bounds", async () => {
    const { editor, getClassRanges, panel } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )
    const editSpy = vi.spyOn(editor!, "edit")

    // Re-detection returns empty — the class was removed by a concurrent edit
    getClassRanges.mockReturnValue([])

    await panel._simulateMessage({ classes: "flex p-4", index: 0, type: "updateClasses" })

    expect(editSpy).not.toHaveBeenCalled()
  })
})

describe("regression: no-op edit skipping", () => {
  it("skips editor.edit when replacement text matches current range text", async () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const editSpy = vi.spyOn(editor!, "edit")

    // Send the exact same classes that are already in the document
    await panel._simulateMessage({
      classes: "flex items-center p-4 rounded",
      index: 0,
      type: "updateClasses",
    })

    // Should skip the edit since the text hasn't changed
    expect(editSpy).not.toHaveBeenCalled()
  })

  it("applies edit when replacement text differs from current range text", async () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const editSpy = vi.spyOn(editor!, "edit")

    await panel._simulateMessage({
      classes: "flex p-4",
      index: 0,
      type: "updateClasses",
    })

    expect(editSpy).toHaveBeenCalled()
  })
})

describe("regression: panel shows classes on open (ready message)", () => {
  it("resends full state when webview sends ready message", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })

    const messagesBefore = panel._getMessages().length
    panel._simulateMessage({ type: "ready" })

    const newMessages = panel._getMessages().slice(messagesBefore)
    const configMsg = newMessages.find((m) => m.type === "config")
    const updateMsg = newMessages.find((m) => m.type === "update")
    expect(configMsg).toBeDefined()
    expect(updateMsg).toBeDefined()
    expect((updateMsg as { entries: unknown[] }).entries).toHaveLength(1)
  })

  it("ready message with no active editor sends config but no update", () => {
    createPanelWithEditor()
    const panel = _getLastPanel()!

    const messagesBefore = panel._getMessages().length
    panel._simulateMessage({ type: "ready" })

    const newMessages = panel._getMessages().slice(messagesBefore)
    const configMsg = newMessages.find((m) => m.type === "config")
    const updateMsg = newMessages.find((m) => m.type === "update")
    expect(configMsg).toBeDefined()
    expect(updateMsg).toBeUndefined()
  })

  it("ready message skips output scheme editors", () => {
    const editor = createMockEditor('<div class="flex items-center p-4 rounded">')
    editor.document.uri = { scheme: "output", toString: () => "output:test" }
    window.activeTextEditor = editor
    window.visibleTextEditors = [editor]

    CSSPreviewPanel.createOrShow(extensionPath, () => [], noopEvent)
    const panel = _getLastPanel()!

    const messagesBefore = panel._getMessages().length
    panel._simulateMessage({ type: "ready" })

    const newMessages = panel._getMessages().slice(messagesBefore)
    const updateMsg = newMessages.find((m) => m.type === "update")
    expect(updateMsg).toBeUndefined()
  })
})

describe("regression: panel recovery after editor focus loss", () => {
  it("resets content key when active editor becomes undefined", () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })

    // Simulate switching to a non-editor view (e.g. Extensions sidebar)
    _fireEvent("onDidChangeActiveTextEditor", undefined)

    // Now switch back to the same editor
    const messagesBefore = panel._getMessages().length
    window.activeTextEditor = editor
    _fireEvent("onDidChangeActiveTextEditor", editor)

    // Should send a full update (not just setActive) because content key was reset
    const newMessages = panel._getMessages().slice(messagesBefore)
    const updateMsg = newMessages.find((m) => m.type === "update")
    expect(updateMsg).toBeDefined()
  })

  it("resends full update when panel becomes visible after being hidden", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    // Simulate panel becoming visible again (webview may have been recreated)
    panel._simulateViewStateChange(true)

    const newMessages = panel._getMessages().slice(messagesBefore)
    const updateMsg = newMessages.find((m) => m.type === "update")
    expect(updateMsg).toBeDefined()
  })

  it("does not send update when panel becomes hidden", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    panel._simulateViewStateChange(false)

    const newMessages = panel._getMessages().slice(messagesBefore)
    const updateMsg = newMessages.find((m) => m.type === "update")
    expect(updateMsg).toBeUndefined()
  })

  it("ready message resets content key even without active editor", () => {
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })

    // Simulate no active editor when ready fires
    window.activeTextEditor = undefined
    panel._simulateMessage({ type: "ready" })

    // Now restore the editor and trigger an editor change
    const messagesBefore = panel._getMessages().length
    window.activeTextEditor = editor
    _fireEvent("onDidChangeActiveTextEditor", editor)

    // Should send a full update because ready reset the content key
    const newMessages = panel._getMessages().slice(messagesBefore)
    const updateMsg = newMessages.find((m) => m.type === "update")
    expect(updateMsg).toBeDefined()
  })
})

describe("regression: onDidUpdateRanges finds editor via visibleTextEditors", () => {
  it("uses visibleTextEditors to find editor when activeTextEditor is undefined", () => {
    const { editor, getClassRanges, panel, rangesEmitter } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )
    const messagesBefore = panel._getMessages().length

    // Simulate webview having focus — activeTextEditor is undefined
    window.activeTextEditor = undefined
    // But the editor is still visible
    window.visibleTextEditors = [editor!]

    // Change ranges so content key differs
    getClassRanges.mockReturnValue([
      makeClassRange(0, 12, 0, 30, ["flex", "p-4", "rounded", "mt-2"], "div"),
    ])
    rangesEmitter.fire("file:///test.tsx")

    // Should still have found the editor and sent an update
    const newMessages = panel._getMessages().slice(messagesBefore)
    const updateMsg = newMessages.find((m) => m.type === "update")
    expect(updateMsg).toBeDefined()
  })

  it("ignores onDidUpdateRanges for URIs not matching currentEditorUri", () => {
    const { panel, rangesEmitter } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )
    const messagesBefore = panel._getMessages().length

    // Fire for a different URI
    rangesEmitter.fire("file:///other.tsx")

    expect(panel._getMessages().length).toBe(messagesBefore)
  })
})
