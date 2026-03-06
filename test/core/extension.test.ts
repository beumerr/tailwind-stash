import path from "node:path"
import { describe, it, expect, beforeEach } from "vitest"

import { _reset, _getCommandHandler, window } from "../__mocks__/vscode"
import { activate, deactivate } from "../../src/extension"

const projectRoot = path.resolve(__dirname, "../..")

function makeContext() {
  const subscriptions: { dispose: () => void }[] = []
  return { extensionPath: projectRoot, subscriptions } as unknown as Parameters<typeof activate>[0]
}

beforeEach(() => {
  _reset()
  window.activeTextEditor = undefined
})

// ─── activate ───────────────────────────────────────────────────────

describe("activate", () => {
  it("registers the collapseAll command", () => {
    activate(makeContext())
    expect(_getCommandHandler("tailwindStash.collapseAll")).toBeDefined()
  })

  it("registers the expandAll command", () => {
    activate(makeContext())
    expect(_getCommandHandler("tailwindStash.expandAll")).toBeDefined()
  })

  it("registers the toggleCollapse command", () => {
    activate(makeContext())
    expect(_getCommandHandler("tailwindStash.toggleCollapse")).toBeDefined()
  })

  it("registers the showCssPreview command", () => {
    activate(makeContext())
    expect(_getCommandHandler("tailwindStash.showCssPreview")).toBeDefined()
  })

  it("registers the hideCssPreview command", () => {
    activate(makeContext())
    expect(_getCommandHandler("tailwindStash.hideCssPreview")).toBeDefined()
  })

  it("registers the toggleCssPreview command", () => {
    activate(makeContext())
    expect(_getCommandHandler("tailwindStash.toggleCssPreview")).toBeDefined()
  })

  it("registers all 6 commands", () => {
    const ctx = makeContext()
    activate(ctx)
    const commands = [
      "tailwindStash.collapseAll",
      "tailwindStash.expandAll",
      "tailwindStash.toggleCollapse",
      "tailwindStash.showCssPreview",
      "tailwindStash.hideCssPreview",
      "tailwindStash.toggleCssPreview",
    ]
    for (const cmd of commands) {
      expect(_getCommandHandler(cmd)).toBeDefined()
    }
  })

  it("pushes subscriptions onto the context", () => {
    const ctx = makeContext()
    activate(ctx)
    // 6 commands + 1 foldingManager
    expect(ctx.subscriptions.length).toBeGreaterThanOrEqual(7)
  })
})

// ─── command handlers ───────────────────────────────────────────────

describe("command handlers", () => {
  it("collapseAll does not throw", () => {
    activate(makeContext())
    expect(() => _getCommandHandler("tailwindStash.collapseAll")!()).not.toThrow()
  })

  it("expandAll does not throw", () => {
    activate(makeContext())
    expect(() => _getCommandHandler("tailwindStash.expandAll")!()).not.toThrow()
  })

  it("toggleCollapse does not throw", () => {
    activate(makeContext())
    expect(() => _getCommandHandler("tailwindStash.toggleCollapse")!()).not.toThrow()
  })

  it("showCssPreview does not throw", () => {
    activate(makeContext())
    expect(() => _getCommandHandler("tailwindStash.showCssPreview")!()).not.toThrow()
  })

  it("hideCssPreview does not throw", () => {
    activate(makeContext())
    expect(() => _getCommandHandler("tailwindStash.hideCssPreview")!()).not.toThrow()
  })

  it("toggleCssPreview does not throw", () => {
    activate(makeContext())
    expect(() => _getCommandHandler("tailwindStash.toggleCssPreview")!()).not.toThrow()
  })
})

// ─── deactivate ─────────────────────────────────────────────────────

describe("deactivate", () => {
  it("does not throw", () => {
    expect(() => deactivate()).not.toThrow()
  })

  it("returns undefined", () => {
    expect(deactivate()).toBeUndefined()
  })
})
