/**
 * Integration tests for the activation flow:
 * extension.ts → FoldingManager → classDetector → decorations
 *
 * Verifies that commands actually produce decorations on real document text,
 * not just "does not throw".
 */
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  _fireEvent,
  _getCommandHandler,
  _getLastPanel,
  _reset,
  createMockEditor,
  window,
} from "../__mocks__/vscode"
import { CSSPreviewPanel } from "../../src/core/cssPreviewPanel"
import { activate } from "../../src/extension"

const projectRoot = path.resolve(__dirname, "../..")

function makeContext() {
  const subscriptions: { dispose: () => void }[] = []
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  return { extensionPath: projectRoot, subscriptions } as any
}

const HTML_WITH_CLASSES = `<div>
  <button class="flex items-center gap-2 p-4 rounded hover:bg-blue-500">Click</button>
  <span class="text-sm font-bold text-red-500 mt-2">Label</span>
</div>`

beforeEach(() => {
  _reset()
  CSSPreviewPanel.currentPanel = undefined
})

afterEach(() => {
  CSSPreviewPanel.currentPanel?.dispose()
  CSSPreviewPanel.currentPanel = undefined
  vi.useRealTimers()
})

// ─── Commands produce real decorations ──────────────────────────────

describe("collapseAll produces decorations on an active editor", () => {
  it("applies fold decorations after collapseAll command", () => {
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    activate(makeContext())

    // The FoldingManager runs on construction, but let's explicitly collapse
    editor._decorationCalls.splice(0)
    _getCommandHandler("tailwindStash.collapseAll")!()

    const hasPlaceholders = editor._decorationCalls.some(
      (c) => c.decorations.length > 0 && (c.decorations[0] as Record<string, unknown>).renderOptions,
    )
    expect(hasPlaceholders).toBe(true)
  })

  it("clears all decorations after expandAll command", () => {
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    activate(makeContext())

    editor._decorationCalls.splice(0)
    _getCommandHandler("tailwindStash.expandAll")!()

    // Every setDecorations call should have empty arrays
    expect(editor._decorationCalls.length).toBeGreaterThan(0)
    expect(editor._decorationCalls.every((c) => c.decorations.length === 0)).toBe(true)
  })

  it("toggleCollapse flips between folded and expanded", () => {
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    activate(makeContext())

    // Should start enabled (foldByDefault = true) — toggle to disabled
    editor._decorationCalls.splice(0)
    _getCommandHandler("tailwindStash.toggleCollapse")!()
    expect(editor._decorationCalls.every((c) => c.decorations.length === 0)).toBe(true)

    // Toggle back to enabled
    editor._decorationCalls.splice(0)
    _getCommandHandler("tailwindStash.toggleCollapse")!()
    const hasPlaceholders = editor._decorationCalls.some((c) => c.decorations.length > 0)
    expect(hasPlaceholders).toBe(true)
  })
})

// ─── Decoration content matches detected classes ────────────────────

describe("decoration content matches classDetector output", () => {
  it("placeholder count matches number of classes in the attribute", () => {
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    activate(makeContext())

    const placeholderCalls = editor._decorationCalls.filter(
      (c) => c.decorations.length > 0 && (c.decorations[0] as Record<string, unknown>).renderOptions,
    )
    // Should have decorations for the two class attributes (both ≥ 4 classes)
    expect(placeholderCalls.length).toBeGreaterThanOrEqual(1)

    for (const call of placeholderCalls) {
      for (const dec of call.decorations) {
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any
        const d = dec as any
        const count = Number.parseInt(d.renderOptions.before.contentText, 10)
        expect(count).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it("hover message contains class names from the document", () => {
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    activate(makeContext())

    const placeholderCalls = editor._decorationCalls.filter(
      (c) => c.decorations.length > 0 && (c.decorations[0] as Record<string, unknown>).hoverMessage,
    )

    // At least one decoration should mention classes from the document
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    const allHoverText = placeholderCalls.flatMap((c) => c.decorations.map((d: any) => d.hoverMessage.value))
    const combinedHover = allHoverText.join(" ")
    expect(combinedHover).toContain("flex")
    expect(combinedHover).toContain("items-center")
  })
})

// ─── showCssPreview wires FoldingManager data into the panel ────────

describe("showCssPreview uses FoldingManager class ranges", () => {
  it("panel receives entries from the folding manager's detected ranges", () => {
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    window.visibleTextEditors = [editor]
    activate(makeContext())

    _getCommandHandler("tailwindStash.showCssPreview")!()
    const panel = _getLastPanel()

    const messages = panel._getMessages()
    const updateMsg = messages.find((m: { type: string }) => m.type === "update")
    expect(updateMsg).toBeDefined()
    expect(updateMsg.entries.length).toBeGreaterThanOrEqual(1)

    // Entries should have element, classes, and line from real detection
    const firstEntry = updateMsg.entries[0]
    expect(firstEntry.element).toBe("button")
    expect(firstEntry.classes).toContain("flex")
    expect(firstEntry.classes).toContain("items-center")
    expect(firstEntry.line).toBeGreaterThanOrEqual(1)
  })

  it("panel entries use 1-indexed line numbers", () => {
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    window.visibleTextEditors = [editor]
    activate(makeContext())

    _getCommandHandler("tailwindStash.showCssPreview")!()
    const panel = _getLastPanel()

    const messages = panel._getMessages()
    const updateMsg = messages.find((m: { type: string }) => m.type === "update")

    // classDetector returns 0-indexed lines, panel maps to 1-indexed
    for (const entry of updateMsg.entries) {
      expect(entry.line).toBeGreaterThanOrEqual(1)
    }
  })
})

// ─── Both systems react to editor switching ─────────────────────────

describe("editor switch updates both folding and panel", () => {
  it("switching editors updates decorations and panel entries", () => {
    const editor1 = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor1
    window.visibleTextEditors = [editor1]
    activate(makeContext())

    _getCommandHandler("tailwindStash.showCssPreview")!()
    const panel = _getLastPanel()
    const messagesAfterPanel = panel._getMessages().length

    // Switch to a new editor with different content
    const editor2 = createMockEditor(
      '<section class="grid gap-4 p-6 bg-white rounded-lg shadow">Content</section>',
      { cursorLine: 1, uri: "file:///other.tsx" },
    )
    window.activeTextEditor = editor2
    window.visibleTextEditors = [editor1, editor2]

    _fireEvent("onDidChangeActiveTextEditor", editor2)

    // FoldingManager should have applied decorations to editor2
    const hasDecorations = editor2._decorationCalls.some((c) => c.decorations.length > 0)
    expect(hasDecorations).toBe(true)

    // Panel should have received a new update
    const newMessages = panel._getMessages().slice(messagesAfterPanel)
    const updateMsg = newMessages.find((m: { type: string }) => m.type === "update")
    expect(updateMsg).toBeDefined()
    expect(updateMsg.entries[0].element).toBe("section")
  })
})

// ─── Text changes trigger both systems ──────────────────────────────

describe("text change triggers both folding and panel refresh", () => {
  it("document change debounces and updates both decorations and panel", () => {
    vi.useFakeTimers()
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    window.visibleTextEditors = [editor]
    activate(makeContext())

    _getCommandHandler("tailwindStash.showCssPreview")!()
    const panel = _getLastPanel()

    editor._decorationCalls.splice(0)
    const messagesAfterPanel = panel._getMessages().length

    // Simulate a text document change
    _fireEvent("onDidChangeTextDocument", { document: editor.document })

    // Before debounce, nothing should have updated
    expect(editor._decorationCalls).toHaveLength(0)

    // Advance past both debounce timers (FoldingManager: 150ms, CSSPreviewPanel: 150ms)
    vi.advanceTimersByTime(200)

    // FoldingManager should have re-applied decorations
    expect(editor._decorationCalls.length).toBeGreaterThan(0)

    // CSSPreviewPanel should have sent a new update
    const newMessages = panel._getMessages().slice(messagesAfterPanel)
    const updateMsg = newMessages.find((m: { type: string }) => m.type === "update")
    expect(updateMsg).toBeDefined()
  })
})

// ─── Cursor movement excludes current line from folding ─────────────

describe("cursor movement integration", () => {
  it("moving cursor to a class line unfolds it while keeping other lines folded", () => {
    vi.useFakeTimers()
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    activate(makeContext())

    // Move cursor to line 1 (the button with classes)
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    ;(editor as any).selection = { active: { line: 1 } }
    editor._decorationCalls.splice(0)

    _fireEvent("onDidChangeTextEditorSelection", {
      selections: [{ active: { line: 1 } }],
      textEditor: editor,
    })
    vi.advanceTimersByTime(200)

    // The fold decorations should exclude line 1 — the button line
    const placeholderCalls = editor._decorationCalls.filter(
      (c) => c.decorations.length > 0 && (c.decorations[0] as Record<string, unknown>).renderOptions,
    )
    // With cursor on line 1 (button class), that range should be excluded
    // We expect fewer decorations than the 2 detected class ranges
    expect(placeholderCalls.length).toBeGreaterThan(0)
    const totalDecorations = placeholderCalls.reduce((sum, c) => sum + c.decorations.length, 0)
    // Only the span on line 2 should be folded (button on line 1 is excluded)
    expect(totalDecorations).toBeLessThan(2)
  })

  it("panel active index updates when cursor moves to a different class range", () => {
    vi.useFakeTimers()
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    window.visibleTextEditors = [editor]
    activate(makeContext())

    _getCommandHandler("tailwindStash.showCssPreview")!()
    const panel = _getLastPanel()
    const messagesAfterPanel = panel._getMessages().length

    // Update the editor's selection to line 2 (the span — second class range)
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    ;(editor as any).selection = { active: { line: 2 } }
    _fireEvent("onDidChangeTextEditorSelection", {
      selections: [{ active: { line: 2 } }],
      textEditor: editor,
    })

    // The panel's selection handler fires synchronously (not debounced)
    const newMessages = panel._getMessages().slice(messagesAfterPanel)
    const activeMsg = newMessages.find(
      (m: { type: string }) => m.type === "setActive" || m.type === "update",
    )
    expect(activeMsg).toBeDefined()
  })
})

// ─── Panel dispose cleans up properly ───────────────────────────────

describe("panel lifecycle through commands", () => {
  it("hideCssPreview disposes the panel created by showCssPreview", () => {
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    activate(makeContext())

    _getCommandHandler("tailwindStash.showCssPreview")!()
    expect(CSSPreviewPanel.currentPanel).toBeDefined()

    _getCommandHandler("tailwindStash.hideCssPreview")!()
    expect(CSSPreviewPanel.currentPanel).toBeUndefined()
  })

  it("toggleCssPreview creates then destroys the panel", () => {
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    activate(makeContext())

    _getCommandHandler("tailwindStash.toggleCssPreview")!()
    expect(CSSPreviewPanel.currentPanel).toBeDefined()

    _getCommandHandler("tailwindStash.toggleCssPreview")!()
    expect(CSSPreviewPanel.currentPanel).toBeUndefined()
  })

  it("showCssPreview reveals existing panel instead of creating a new one", () => {
    const editor = createMockEditor(HTML_WITH_CLASSES, { cursorLine: 0 })
    window.activeTextEditor = editor
    activate(makeContext())

    _getCommandHandler("tailwindStash.showCssPreview")!()
    const firstPanel = _getLastPanel()

    _getCommandHandler("tailwindStash.showCssPreview")!()
    // Should reuse, not create a new panel
    expect(_getLastPanel()).toBe(firstPanel)
  })
})
