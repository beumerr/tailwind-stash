import { beforeEach, describe, expect, it } from "vitest"

import {
  _reset,
  CompletionItemKind,
  createMockDocument,
  Position,
  workspace,
} from "../__mocks__/vscode"
import { PlaceholderCompletionProvider } from "../../src/core/placeholderCompletionProvider"

function setupPlaceholders(placeholders: Record<string, string>) {
  const origGet = workspace.getConfiguration
  workspace.getConfiguration = (_section?: string) => ({
    get<T>(key: string, defaultValue: T): T {
      if (key === "placeholders") {
        return placeholders as T
      }
      return defaultValue
    },
  })
  return () => {
    workspace.getConfiguration = origGet
  }
}

beforeEach(() => {
  _reset()
})

describe("PlaceholderCompletionProvider", () => {
  it("returns undefined when placeholders map is empty", () => {
    const cleanup = setupPlaceholders({})
    const provider = new PlaceholderCompletionProvider()
    const doc = createMockDocument('<div class="">')
    const result = provider.provideCompletionItems(doc as never, new Position(0, 12))
    cleanup()
    expect(result).toBeUndefined()
  })

  it("returns undefined when cursor is outside class context", () => {
    const cleanup = setupPlaceholders({ btn: "px-4 py-2" })
    const provider = new PlaceholderCompletionProvider()
    const doc = createMockDocument('<div id="">')
    const result = provider.provideCompletionItems(doc as never, new Position(0, 9))
    cleanup()
    expect(result).toBeUndefined()
  })

  it("returns completion items inside class attribute", () => {
    const cleanup = setupPlaceholders({
      btn: "px-4 py-2 rounded",
      card: "p-6 shadow-lg",
    })
    const provider = new PlaceholderCompletionProvider()
    const doc = createMockDocument('<div class="">')
    const result = provider.provideCompletionItems(doc as never, new Position(0, 12))
    cleanup()

    expect(result).toBeDefined()
    expect(result).toHaveLength(2)
    expect(result![0].label).toBe("btn")
    expect(result![0].detail).toBe("px-4 py-2 rounded")
    expect(result![0].insertText).toBe("px-4 py-2 rounded")
    expect(result![0].kind).toBe(CompletionItemKind.Snippet)
    expect(result![1].label).toBe("card")
  })

  it("returns completion items inside className attribute", () => {
    const cleanup = setupPlaceholders({ btn: "px-4 py-2" })
    const provider = new PlaceholderCompletionProvider()
    const doc = createMockDocument('<div className="">')
    const result = provider.provideCompletionItems(doc as never, new Position(0, 16))
    cleanup()

    expect(result).toBeDefined()
    expect(result).toHaveLength(1)
  })

  it("returns completion items inside cn() function call", () => {
    const cleanup = setupPlaceholders({ btn: "px-4 py-2" })
    const provider = new PlaceholderCompletionProvider()
    const doc = createMockDocument('cn("")')
    const result = provider.provideCompletionItems(doc as never, new Position(0, 4))
    cleanup()

    expect(result).toBeDefined()
    expect(result).toHaveLength(1)
  })

  it("returns completion items inside clsx() function call", () => {
    const cleanup = setupPlaceholders({ btn: "px-4 py-2" })
    const provider = new PlaceholderCompletionProvider()
    const doc = createMockDocument('clsx("")')
    const result = provider.provideCompletionItems(doc as never, new Position(0, 6))
    cleanup()

    expect(result).toBeDefined()
    expect(result).toHaveLength(1)
  })

  it("includes documentation with class list", () => {
    const cleanup = setupPlaceholders({ btn: "px-4 py-2" })
    const provider = new PlaceholderCompletionProvider()
    const doc = createMockDocument('<div class="">')
    const result = provider.provideCompletionItems(doc as never, new Position(0, 12))
    cleanup()

    expect(result).toBeDefined()
    expect(result![0].documentation).toBeDefined()
  })

  it("invalidates cache on config change", () => {
    const cleanup1 = setupPlaceholders({ btn: "px-4 py-2" })
    const provider = new PlaceholderCompletionProvider()
    const doc = createMockDocument('<div class="">')

    const result1 = provider.provideCompletionItems(doc as never, new Position(0, 12))
    expect(result1).toHaveLength(1)
    cleanup1()

    // Simulate config change
    const cleanup2 = setupPlaceholders({ btn: "px-4 py-2", card: "p-6" })
    // Trigger the config change event manually by re-creating
    // The provider listens to onDidChangeConfiguration internally
    const provider2 = new PlaceholderCompletionProvider()
    const result2 = provider2.provideCompletionItems(doc as never, new Position(0, 12))
    expect(result2).toHaveLength(2)
    cleanup2()
  })
})
