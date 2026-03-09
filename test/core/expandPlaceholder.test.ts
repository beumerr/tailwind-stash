import { beforeEach, describe, expect, it } from "vitest"

import {
  _reset,
  createMockEditor,
  mockConfig,
  Position,
  Selection,
  window,
} from "../__mocks__/vscode"
import { expandPlaceholderAtCursor } from "../../src/core/expandPlaceholder"

beforeEach(() => {
  _reset()
})

describe("expandPlaceholderAtCursor", () => {
  it("does nothing when no active editor", () => {
    window.activeTextEditor = undefined
    expect(() => expandPlaceholderAtCursor()).not.toThrow()
  })

  it("does nothing when placeholders map is empty", () => {
    const editor = createMockEditor('<div class="btn">')
    window.activeTextEditor = editor as typeof window.activeTextEditor
    const cleanup = mockConfig({ placeholders: {} })
    expandPlaceholderAtCursor()
    cleanup()
  })

  it("does nothing when word is not a placeholder key", () => {
    const text = '<div class="unknown">'
    const editor = createMockEditor(text)
    editor.selection = new Selection(new Position(0, 13))
    window.activeTextEditor = editor as typeof window.activeTextEditor
    const cleanup = mockConfig({ placeholders: { btn: "px-4 py-2" } })

    expandPlaceholderAtCursor()
    cleanup()
  })

  it("expands placeholder key inside class attribute", () => {
    const text = '<div class="btn">'
    const editor = createMockEditor(text)
    editor.selection = new Selection(new Position(0, 13))
    window.activeTextEditor = editor as typeof window.activeTextEditor

    let replacedRange: unknown
    let replacedText: string | undefined
    editor.edit = async (callback) => {
      callback({
        replace(range: unknown, newText: string) {
          replacedRange = range
          replacedText = newText
        },
      })
      return true
    }

    const cleanup = mockConfig({ placeholders: { btn: "px-4 py-2 rounded" } })
    expandPlaceholderAtCursor()
    cleanup()

    expect(replacedText).toBe("px-4 py-2 rounded")
    expect(replacedRange).toBeDefined()
  })

  it("does nothing when cursor is outside class context", () => {
    const text = '<div id="btn">'
    const editor = createMockEditor(text)
    editor.selection = new Selection(new Position(0, 10))
    window.activeTextEditor = editor as typeof window.activeTextEditor

    let called = false
    editor.edit = async (callback) => {
      callback({
        replace() {
          called = true
        },
      })
      return true
    }

    const cleanup = mockConfig({ placeholders: { btn: "px-4 py-2" } })
    expandPlaceholderAtCursor()
    cleanup()

    expect(called).toBe(false)
  })

  it("expands placeholder inside className attribute", () => {
    const text = '<div className="btn">'
    const editor = createMockEditor(text)
    editor.selection = new Selection(new Position(0, 17))
    window.activeTextEditor = editor as typeof window.activeTextEditor

    let replacedText: string | undefined
    editor.edit = async (callback) => {
      callback({
        replace(_range: unknown, newText: string) {
          replacedText = newText
        },
      })
      return true
    }

    const cleanup = mockConfig({ placeholders: { btn: "px-4 py-2" } })
    expandPlaceholderAtCursor()
    cleanup()

    expect(replacedText).toBe("px-4 py-2")
  })

  it("expands placeholder inside cn() function call", () => {
    const text = 'cn("btn")'
    const editor = createMockEditor(text)
    editor.selection = new Selection(new Position(0, 5))
    window.activeTextEditor = editor as typeof window.activeTextEditor

    let replacedText: string | undefined
    editor.edit = async (callback) => {
      callback({
        replace(_range: unknown, newText: string) {
          replacedText = newText
        },
      })
      return true
    }

    const cleanup = mockConfig({ placeholders: { btn: "px-4 py-2" } })
    expandPlaceholderAtCursor()
    cleanup()

    expect(replacedText).toBe("px-4 py-2")
  })
})
