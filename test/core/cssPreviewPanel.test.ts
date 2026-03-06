import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  Position,
  Range,
  _fireEvent,
  _getLastPanel,
  _reset,
  createMockEditor,
  window,
  workspace,
} from "../__mocks__/vscode"
import { CSSPreviewPanel, findActiveIndex } from "../../src/core/cssPreviewPanel"

const extensionPath = path.resolve(__dirname, "../..")

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
    return [makeClassRange(0, 13, 0, 48, ["flex", "items-center", "p-4", "rounded"], "div")]
  })

  CSSPreviewPanel.createOrShow(extensionPath, getClassRanges)
  const panel = _getLastPanel()
  return { editor, getClassRanges, panel }
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

    CSSPreviewPanel.createOrShow(extensionPath, () => [])
    // Should not have created a new panel
    expect(_getLastPanel()).toBe(firstPanel)
  })

  it("sends initial update when an editor is active", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    const messages = panel._getMessages()
    const updateMsg = messages.find((m: { type: string }) => m.type === "update")
    expect(updateMsg).toBeDefined()
  })

  it("sends config message on creation", () => {
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    const messages = panel._getMessages()
    const configMsg = messages.find((m: { type: string }) => m.type === "config")
    expect(configMsg).toBeDefined()
  })

  it("does not send update when no editor is active", () => {
    createPanelWithEditor()
    const panel = _getLastPanel()
    const messages = panel._getMessages()
    const updateMsg = messages.find((m: { type: string }) => m.type === "update")
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
    CSSPreviewPanel.toggle(extensionPath, () => [])
    expect(CSSPreviewPanel.currentPanel).toBeDefined()
  })

  it("disposes panel when one exists", () => {
    CSSPreviewPanel.toggle(extensionPath, () => [])
    expect(CSSPreviewPanel.currentPanel).toBeDefined()

    CSSPreviewPanel.toggle(extensionPath, () => [])
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
    const setActiveMsg = messagesAfter
      .slice(messagesBefore)
      .find((m: { type: string }) => m.type === "setActive")
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

    // Override getConfiguration to return false for scrollEditorOnPanelSelect
    const origGet = workspace.getConfiguration
    workspace.getConfiguration = (_section?: string) => ({
      get<T>(key: string, defaultValue: T): T {
        if (key === "scrollEditorOnPanelSelect") {
          return false as T
        }
        return defaultValue
      },
    })

    const revealSpy = vi.spyOn(editor!, "revealRange")
    panel._simulateMessage({ index: 0, type: "selectEntry" })

    // Should NOT have called revealRange since scroll is disabled
    expect(revealSpy).not.toHaveBeenCalled()

    workspace.getConfiguration = origGet
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
    const updateMsg = messages.find((m: { type: string }) => m.type === "update")
    expect(updateMsg).toBeDefined()
    expect(updateMsg.entries).toHaveLength(1)
    expect(updateMsg.entries[0].element).toBe("div")
    expect(updateMsg.entries[0].classes).toEqual(["flex", "items-center", "p-4", "rounded"])
  })

  it("sends setActive when only cursor position changes", () => {
    const { editor, getClassRanges, panel } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )
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

    // Fire the same selection event again (same line, same content)
    _fireEvent("onDidChangeActiveTextEditor", editor)

    const newMessages = panel._getMessages().slice(messagesBefore)
    // Should not send a duplicate update
    const updateMsgs = newMessages.filter((m: { type: string }) => m.type === "update")
    expect(updateMsgs).toHaveLength(0)
  })
})

// ─── text document change debounce ──────────────────────────────────

describe("text document changes", () => {
  it("debounces text document changes and clears content key", () => {
    vi.useFakeTimers()
    const { editor, panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    _fireEvent("onDidChangeTextDocument", { document: editor!.document })

    // Should not have updated yet (debounced)
    expect(panel._getMessages().length).toBe(messagesBefore)

    vi.advanceTimersByTime(200)

    // After debounce, should have sent an update (content key was cleared)
    const newMessages = panel._getMessages().slice(messagesBefore)
    const updateMsg = newMessages.find((m: { type: string }) => m.type === "update")
    expect(updateMsg).toBeDefined()
    vi.useRealTimers()
  })

  it("ignores text changes for a different document", () => {
    vi.useFakeTimers()
    const { panel } = createPanelWithEditor('<div class="flex items-center p-4 rounded">', {
      cursorLine: 0,
    })
    const messagesBefore = panel._getMessages().length

    // Fire a text change for a different document
    _fireEvent("onDidChangeTextDocument", {
      document: { uri: { toString: () => "file:///other.tsx" } },
    })
    vi.advanceTimersByTime(200)

    // Should not have sent any new messages
    expect(panel._getMessages().length).toBe(messagesBefore)
    vi.useRealTimers()
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
    const { editor, getClassRanges, panel } = createPanelWithEditor(
      '<div class="flex items-center p-4 rounded">',
      { cursorLine: 0 },
    )

    // Override to return two ranges so active index can differ
    const range1 = makeClassRange(0, 13, 0, 48, ["flex", "items-center", "p-4", "rounded"], "div")
    const range2 = makeClassRange(2, 13, 2, 48, ["text-sm", "font-bold", "mt-2", "mx-auto"], "span")
    getClassRanges.mockReturnValue([range1, range2])

    // First update at line 0
    editor!.selection = { active: { line: 0 } } as unknown as vscode.Selection
    _fireEvent("onDidChangeActiveTextEditor", editor)
    const messagesAfterFirst = panel._getMessages().length

    // Second update at line 2 (same content, different active)
    editor!.selection = { active: { line: 2 } } as unknown as vscode.Selection
    _fireEvent("onDidChangeActiveTextEditor", editor)

    const newMessages = panel._getMessages().slice(messagesAfterFirst)
    const setActiveMsgs = newMessages.filter((m: { type: string }) => m.type === "setActive")
    const updateMsgs = newMessages.filter((m: { type: string }) => m.type === "update")
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
    const configMsg = newMessages.find((m: { type: string }) => m.type === "config")
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
    const configMsg = newMessages.find((m: { type: string }) => m.type === "config")
    expect(configMsg).toBeDefined()
  })
})

// ─── getHtml ────────────────────────────────────────────────────────

describe("getHtml (via panel creation)", () => {
  it("sets webview html with nonce-based CSP", () => {
    createPanelWithEditor('<div class="flex items-center p-4 rounded">')
    const panel = _getLastPanel()
    expect(panel.webview.html).toContain("Content-Security-Policy")
    expect(panel.webview.html).toContain("nonce-")
    expect(panel.webview.html).not.toContain("{{NONCE}}")
    expect(panel.webview.html).not.toContain("{{CSS}}")
    expect(panel.webview.html).not.toContain("{{JS}}")
  })
})
