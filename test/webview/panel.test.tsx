// @vitest-environment happy-dom
import "../../src/webview/global.d.ts"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/preact"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { ClassEntry } from "../../src/utils/types"

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

const sampleEntries: ClassEntry[] = [
  { classes: ["flex", "items-center", "p-4"], element: "div", line: 5 },
  { classes: ["bg-blue-500", "text-white", "rounded"], element: "button", line: 12 },
]

afterEach(cleanup)

describe("Panel", () => {
  it("shows empty state when no entries", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)
    expect(screen.getByText("No Tailwind classes detected in the current file.")).toBeTruthy()
  })

  it("renders entry cards after receiving update message", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })

    expect(screen.getAllByRole("article")).toHaveLength(2)
  })

  it("displays element name and line number", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: -1, entries: sampleEntries, type: "update" })

    expect(screen.getByText("div")).toBeTruthy()
    expect(screen.getByText("5")).toBeTruthy()
    expect(screen.getByText("button")).toBeTruthy()
    expect(screen.getByText("12")).toBeTruthy()
  })

  it("marks the active entry card", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 1, entries: sampleEntries, type: "update" })

    const cards = screen.getAllByRole("article")
    expect(cards[0].hasAttribute("data-active")).toBe(false)
    expect(cards[1].hasAttribute("data-active")).toBe(true)
  })

  it("updates active index on setActive message", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })
    postWindowMessage({ index: 1, type: "setActive" })

    const cards = screen.getAllByRole("article")
    expect(cards[0].hasAttribute("data-active")).toBe(false)
    expect(cards[1].hasAttribute("data-active")).toBe(true)
  })

  it("switches active card when textarea is focused", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })

    const textareas = screen.getAllByRole("textbox")
    act(() => {
      textareas[1].dispatchEvent(new FocusEvent("focus", { bubbles: true }))
    })

    const cards = screen.getAllByRole("article")
    expect(cards[0].hasAttribute("data-active")).toBe(false)
    expect(cards[1].hasAttribute("data-active")).toBe(true)
  })

  it("ignores setActive messages while panel has focus", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })

    act(() => {
      document.dispatchEvent(new FocusEvent("focusin"))
    })

    const textareas = screen.getAllByRole("textbox")
    act(() => {
      textareas[1].dispatchEvent(new FocusEvent("focus", { bubbles: true }))
    })
    postWindowMessage({ index: 0, type: "setActive" })

    const cards = screen.getAllByRole("article")
    expect(cards[1].hasAttribute("data-active")).toBe(true)
  })

  it("sends goToRange message when header is clicked", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: -1, entries: sampleEntries, type: "update" })

    fireEvent.click(screen.getByText("div"))

    expect(vscode.postMessage).toHaveBeenCalledWith({ index: 0, type: "goToRange" })
  })

  it("displays class count for each entry", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: -1, entries: sampleEntries, type: "update" })

    expect(screen.getAllByText("3 classes")).toHaveLength(2)
  })

  it("returns to empty state when entries are cleared", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })
    expect(screen.getAllByRole("article")).toHaveLength(2)

    postWindowMessage({ activeIndex: -1, entries: [], type: "update" })
    expect(screen.queryByRole("article")).toBeNull()
    expect(screen.getByText("No Tailwind classes detected in the current file.")).toBeTruthy()
  })

  it("sends ready message on mount", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    expect(vscode.postMessage).toHaveBeenCalledWith({ type: "ready" })
  })

  it("sends selectEntry message when textarea is focused", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })

    const textareas = screen.getAllByRole("textbox")
    act(() => {
      textareas[0].dispatchEvent(new FocusEvent("focus", { bubbles: true }))
    })

    expect(vscode.postMessage).toHaveBeenCalledWith({ index: 0, type: "selectEntry" })
  })

  it("sends updateClasses message when textarea content changes", () => {
    vi.useFakeTimers()
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })

    const textareas = screen.getAllByRole("textbox")
    fireEvent.input(textareas[0], { target: { value: "flex p-4" } })

    vi.advanceTimersByTime(600)

    expect(vscode.postMessage).toHaveBeenCalledWith({
      classes: "flex p-4",
      index: 0,
      type: "updateClasses",
    })
    vi.useRealTimers()
  })

  it("handles config message and sets CSS custom properties", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({
      activeBorderColor: "#ff0000",
      elementTextColor: "#00ff00",
      scrollPanelOnEditorSelect: false,
      textareaFocusBackground: "rgba(0,0,0,0.1)",
      type: "config",
    })

    const root = document.documentElement
    expect(root.style.getPropertyValue("--ts-active-border-color")).toBe("#ff0000")
    expect(root.style.getPropertyValue("--ts-element-color")).toBe("#00ff00")
    expect(root.style.getPropertyValue("--ts-textarea-focus-bg")).toBe("rgba(0,0,0,0.1)")
  })

  it("removes CSS custom properties when config values are empty", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    // First set some values
    postWindowMessage({
      activeBorderColor: "#ff0000",
      elementTextColor: "#00ff00",
      scrollPanelOnEditorSelect: true,
      textareaFocusBackground: "rgba(0,0,0,0.1)",
      type: "config",
    })

    // Then clear them
    postWindowMessage({
      activeBorderColor: "",
      elementTextColor: "",
      scrollPanelOnEditorSelect: true,
      textareaFocusBackground: "",
      type: "config",
    })

    const root = document.documentElement
    expect(root.style.getPropertyValue("--ts-active-border-color")).toBe("")
    expect(root.style.getPropertyValue("--ts-element-color")).toBe("")
    expect(root.style.getPropertyValue("--ts-textarea-focus-bg")).toBe("")
  })

  it("resets focus tracking on focusout", () => {
    const vscode = createVscodeApi()
    render(<Panel vscode={vscode} />)

    postWindowMessage({ activeIndex: 0, entries: sampleEntries, type: "update" })

    // Focus in
    act(() => {
      document.dispatchEvent(new FocusEvent("focusin"))
    })
    // Focus out
    act(() => {
      document.dispatchEvent(new FocusEvent("focusout"))
    })

    // Now setActive should work again
    postWindowMessage({ index: 1, type: "setActive" })

    const cards = screen.getAllByRole("article")
    expect(cards[1].hasAttribute("data-active")).toBe(true)
  })
})
