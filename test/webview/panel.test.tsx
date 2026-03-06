// @vitest-environment happy-dom
// oxlint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../src/webview/global.d.ts" />
import { render, cleanup, act } from "@testing-library/preact"
import { describe, it, expect, vi, afterEach } from "vitest"

import type { ClassEntry } from "../../src/webview/types"

import { Panel } from "../../src/webview/views/panel/panel"

function createVscodeApi() {
  return {
    getState: vi.fn(),
    postMessage: vi.fn(),
    setState: vi.fn(),
  } as ReturnType<typeof acquireVsCodeApi>
}

function postWindowMessage(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data }))
  })
}

const sampleEntries: Array<ClassEntry> = [
  { classes: ["flex", "items-center", "p-4"], element: "div", line: 5 },
  { classes: ["bg-blue-500", "text-white", "rounded"], element: "button", line: 12 },
]

afterEach(cleanup)

describe("Panel", () => {
  it("shows empty state when no entries", () => {
    const vscode = createVscodeApi()
    const { container } = render(<Panel vscode={vscode} />)
    expect(container.querySelector(".empty-state")).toBeTruthy()
    expect(container.textContent).toContain("No Tailwind classes detected")
  })

  it("renders entry cards after receiving update message", () => {
    const vscode = createVscodeApi()
    const { container } = render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })

    const cards = container.querySelectorAll(".entry-card")
    expect(cards).toHaveLength(2)
  })

  it("displays element name and line number", () => {
    const vscode = createVscodeApi()
    const { container } = render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: -1, entries: sampleEntries, type: "update" })

    expect(container.textContent).toContain("div")
    expect(container.textContent).toContain("L5")
    expect(container.textContent).toContain("button")
    expect(container.textContent).toContain("L12")
  })

  it("marks the active entry card", () => {
    const vscode = createVscodeApi()
    const { container } = render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 1, entries: sampleEntries, type: "update" })

    const cards = container.querySelectorAll(".entry-card")
    expect(cards[0].classList.contains("active")).toBe(false)
    expect(cards[1].classList.contains("active")).toBe(true)
  })

  it("updates active index on setActive message", () => {
    const vscode = createVscodeApi()
    const { container } = render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })
    postWindowMessage({ index: 1, type: "setActive" })

    const cards = container.querySelectorAll(".entry-card")
    expect(cards[0].classList.contains("active")).toBe(false)
    expect(cards[1].classList.contains("active")).toBe(true)
  })

  it("switches active card when textarea is focused", () => {
    const vscode = createVscodeApi()
    const { container } = render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })

    act(() => {
      container
        .querySelectorAll("textarea")[1]
        .dispatchEvent(new FocusEvent("focus", { bubbles: true }))
    })

    const cards = container.querySelectorAll(".entry-card")
    expect(cards[0].classList.contains("active")).toBe(false)
    expect(cards[1].classList.contains("active")).toBe(true)
  })

  it("ignores setActive messages while panel has focus", () => {
    const vscode = createVscodeApi()
    const { container } = render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })

    // Simulate panel gaining focus
    act(() => {
      document.dispatchEvent(new FocusEvent("focusin"))
    })

    // Extension tries to set active to 0, but panel has focus on card 1
    act(() => {
      container
        .querySelectorAll("textarea")[1]
        .dispatchEvent(new FocusEvent("focus", { bubbles: true }))
    })
    postWindowMessage({ index: 0, type: "setActive" })

    const cards = container.querySelectorAll(".entry-card")
    expect(cards[1].classList.contains("active")).toBe(true)
  })

  it("sends goToRange message when header is clicked", () => {
    const vscode = createVscodeApi()
    const { container } = render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: -1, entries: sampleEntries, type: "update" })

    const header = container.querySelector(".header")!
    header.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    expect(vscode.postMessage).toHaveBeenCalledWith({ index: 0, type: "goToRange" })
  })

  it("displays class count for each entry", () => {
    const vscode = createVscodeApi()
    const { container } = render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: -1, entries: sampleEntries, type: "update" })

    const counts = container.querySelectorAll(".count")
    expect(counts[0].textContent).toBe("3 classes")
    expect(counts[1].textContent).toBe("3 classes")
  })

  it("returns to empty state when entries are cleared", () => {
    const vscode = createVscodeApi()
    const { container } = render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })
    expect(container.querySelectorAll(".entry-card")).toHaveLength(2)

    postWindowMessage({ activeIndex: -1, entries: [], type: "update" })
    expect(container.querySelector(".empty-state")).toBeTruthy()
  })
})
