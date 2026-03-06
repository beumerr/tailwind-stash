// @vitest-environment happy-dom
import { render, cleanup } from "@testing-library/preact"
import { describe, it, expect, vi, afterEach } from "vitest"

import type { ClassEntry } from "../../src/webview/types"

import { EntryCard } from "../../src/webview/components/entry-card/entry-card"

const entry: ClassEntry = {
  classes: ["flex", "items-center", "gap-2", "p-4"],
  element: "div",
  line: 10,
}

afterEach(cleanup)

describe("EntryCard", () => {
  it("renders element name, line number, and class count", () => {
    const { container } = render(
      <EntryCard
        autoScroll={true}
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    expect(container.querySelector(".element")!.textContent).toBe("div")
    expect(container.querySelector(".line")!.textContent).toBe("L10")
    expect(container.querySelector(".count")!.textContent).toBe("4 classes")
  })

  it("applies active class when isActive is true", () => {
    const { container } = render(
      <EntryCard
        autoScroll={true}
        entry={entry}
        isActive={true}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    expect(container.querySelector(".entry-card")!.classList.contains("active")).toBe(true)
  })

  it("does not apply active class when isActive is false", () => {
    const { container } = render(
      <EntryCard
        autoScroll={true}
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    expect(container.querySelector(".entry-card")!.classList.contains("active")).toBe(false)
  })

  it("calls onGoToRange when header is clicked", () => {
    const onGoToRange = vi.fn()
    const { container } = render(
      <EntryCard
        entry={entry}
        isActive={false}
        onGoToRange={onGoToRange}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    container.querySelector(".header")!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(onGoToRange).toHaveBeenCalledOnce()
  })

  it("calls onSelect when textarea is focused", () => {
    const onSelect = vi.fn()
    const { container } = render(
      <EntryCard
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={onSelect}
        onUpdateClasses={() => {}}
      />,
    )
    container.querySelector("textarea")!.dispatchEvent(new FocusEvent("focus", { bubbles: true }))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it("scrolls into view when becoming active", () => {
    const scrollIntoView = vi.fn()
    const { container } = render(
      <EntryCard
        autoScroll={true}
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    const card = container.querySelector(".entry-card")!
    card.scrollIntoView = scrollIntoView

    // Re-render with isActive=true
    render(
      <EntryCard
        autoScroll={true}
        entry={entry}
        isActive={true}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
      { container },
    )

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })
  })

  it("does not scroll into view when autoScroll is false", () => {
    const scrollIntoView = vi.fn()
    const { container } = render(
      <EntryCard
        autoScroll={false}
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    const card = container.querySelector(".entry-card")!
    card.scrollIntoView = scrollIntoView

    render(
      <EntryCard
        autoScroll={false}
        entry={entry}
        isActive={true}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
      { container },
    )

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it("renders a ClassEditor with the entry classes", () => {
    const { container } = render(
      <EntryCard
        autoScroll={true}
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    const textarea = container.querySelector("textarea")!
    expect(textarea.value).toBe("flex\nitems-center\ngap-2\np-4")
  })
})
