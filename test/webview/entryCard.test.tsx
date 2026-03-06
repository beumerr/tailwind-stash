// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/preact"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { ClassEntry } from "../../src/utils/types"

import { EntryCard } from "../../src/webview/components/entry-card/entry-card"
import { EntryCardHeader } from "../../src/webview/components/entry-card/entry-card-header"

const entry: ClassEntry = {
  classes: ["flex", "items-center", "gap-2", "p-4"],
  element: "div",
  line: 10,
}

afterEach(cleanup)

describe("EntryCardHeader", () => {
  it("renders element name, line number, and class count", () => {
    render(<EntryCardHeader count={4} element="div" line={10} onClick={() => {}} />)
    expect(screen.getByText("div")).toBeTruthy()
    expect(screen.getByText("10")).toBeTruthy()
    expect(screen.getByText("4 classes")).toBeTruthy()
  })

  it("calls onClick when clicked", () => {
    const onClick = vi.fn()
    render(<EntryCardHeader count={4} element="div" line={10} onClick={onClick} />)
    fireEvent.click(screen.getByText("div"))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("renders singular 'class' when count is 1", () => {
    render(<EntryCardHeader count={1} element="span" line={5} onClick={() => {}} />)
    expect(screen.getByText("1 class")).toBeTruthy()
  })
})

describe("EntryCard", () => {
  it("renders element name, line number, and class count", () => {
    render(
      <EntryCard
        autoScroll
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    expect(screen.getByText("div")).toBeTruthy()
    expect(screen.getByText("10")).toBeTruthy()
    expect(screen.getByText("4 classes")).toBeTruthy()
  })

  it("applies active state when isActive is true", () => {
    render(
      <EntryCard
        autoScroll
        entry={entry}
        isActive
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    expect(screen.getByRole("article").hasAttribute("data-active")).toBe(true)
  })

  it("does not apply active state when isActive is false", () => {
    render(
      <EntryCard
        autoScroll
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    expect(screen.getByRole("article").hasAttribute("data-active")).toBe(false)
  })

  it("calls onGoToRange when header is clicked", () => {
    const onGoToRange = vi.fn()
    render(
      <EntryCard
        autoScroll={false}
        entry={entry}
        isActive={false}
        onGoToRange={onGoToRange}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    fireEvent.click(screen.getByText("div"))
    expect(onGoToRange).toHaveBeenCalledOnce()
  })

  it("calls onSelect when textarea is focused", () => {
    const onSelect = vi.fn()
    render(
      <EntryCard
        autoScroll={false}
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={onSelect}
        onUpdateClasses={() => {}}
      />,
    )
    fireEvent.focus(screen.getByRole("textbox"))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it("scrolls into view when becoming active", () => {
    const scrollIntoView = vi.fn()
    const { container } = render(
      <EntryCard
        autoScroll
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    const card = screen.getByRole("article")
    card.scrollIntoView = scrollIntoView

    render(
      <EntryCard
        autoScroll
        entry={entry}
        isActive
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
    const card = screen.getByRole("article")
    card.scrollIntoView = scrollIntoView

    render(
      <EntryCard
        autoScroll={false}
        entry={entry}
        isActive
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
      { container },
    )

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it("renders a ClassEditor with the entry classes", () => {
    render(
      <EntryCard
        autoScroll
        entry={entry}
        isActive={false}
        onGoToRange={() => {}}
        onSelect={() => {}}
        onUpdateClasses={() => {}}
      />,
    )
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "flex\nitems-center\ngap-2\np-4",
    )
  })
})
