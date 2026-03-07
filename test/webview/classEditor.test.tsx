// @vitest-environment happy-dom
import { render, fireEvent, cleanup } from "@testing-library/preact"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { ClassEditor } from "../../src/webview/components/class-editor/class-editor"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe("ClassEditor", () => {
  it("renders a textarea with classes as newline-separated values", () => {
    const { container } = render(
      <ClassEditor classes={["flex", "items-center", "p-4"]} onChange={() => {}} />,
    )
    const textarea = container.querySelector("textarea")!
    expect(textarea.value).toBe("flex\nitems-center\np-4")
  })

  it("renders empty textarea when classes array is empty", () => {
    const { container } = render(<ClassEditor classes={[]} onChange={() => {}} />)
    const textarea = container.querySelector("textarea")!
    expect(textarea.value).toBe("")
  })

  it("calls onChange with joined classes after debounce", () => {
    const onChange = vi.fn()
    const { container } = render(
      <ClassEditor classes={["flex"]} debounceMs={300} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!

    // Simulate typing
    textarea.value = "flex\nitems-center\np-4"
    fireEvent.input(textarea)

    // Should not have called onChange yet
    expect(onChange).not.toHaveBeenCalled()

    // Advance past debounce
    vi.advanceTimersByTime(300)

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith("flex items-center p-4")
  })

  it("trims whitespace and filters empty lines when joining", () => {
    const onChange = vi.fn()
    const { container } = render(<ClassEditor classes={[]} debounceMs={100} onChange={onChange} />)
    const textarea = container.querySelector("textarea")!

    textarea.value = "  flex  \n\n  items-center  \n  \n  p-4  "
    fireEvent.input(textarea)
    vi.advanceTimersByTime(100)

    expect(onChange).toHaveBeenCalledWith("flex items-center p-4")
  })

  it("resets debounce timer on rapid input", () => {
    const onChange = vi.fn()
    const { container } = render(<ClassEditor classes={[]} debounceMs={500} onChange={onChange} />)
    const textarea = container.querySelector("textarea")!

    textarea.value = "flex"
    fireEvent.input(textarea)
    vi.advanceTimersByTime(300)

    textarea.value = "flex\np-4"
    fireEvent.input(textarea)
    vi.advanceTimersByTime(300)

    // Still shouldn't have fired — second input reset the timer
    expect(onChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith("flex p-4")
  })

  it("clears pending debounce on unmount", () => {
    const onChange = vi.fn()
    const { container, unmount } = render(
      <ClassEditor classes={["flex"]} debounceMs={500} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!

    textarea.value = "flex\np-4"
    fireEvent.input(textarea)

    // Unmount before debounce fires
    unmount()
    vi.advanceTimersByTime(600)

    // onChange should not have been called after unmount
    expect(onChange).not.toHaveBeenCalled()
  })

  it("calls onFocus callback when textarea is focused", () => {
    const onFocus = vi.fn()
    const { container } = render(
      <ClassEditor classes={["flex"]} onChange={() => {}} onFocus={onFocus} />,
    )
    const textarea = container.querySelector("textarea")!
    fireEvent.focus(textarea)
    expect(onFocus).toHaveBeenCalledOnce()
  })

  it("uses default debounceMs of 500", () => {
    const onChange = vi.fn()
    const { container } = render(<ClassEditor classes={[]} onChange={onChange} />)
    const textarea = container.querySelector("textarea")!

    textarea.value = "flex"
    fireEvent.input(textarea)

    vi.advanceTimersByTime(499)
    expect(onChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it("does not overwrite local edits when classes prop updates before debounce fires", () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex", "p-4"]} debounceMs={500} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!

    // User types a new class
    textarea.value = "flex\np-4\nbg-red"
    fireEvent.input(textarea)

    // Before debounce fires, parent re-renders with old classes (e.g. from a different update)
    rerender(<ClassEditor classes={["flex", "p-4"]} debounceMs={500} onChange={onChange} />)

    // The textarea should keep the user's local edit, not revert
    expect(textarea.value).toBe("flex\np-4\nbg-red")
  })

  it("does not update textarea when incoming classes match local content", () => {
    const onChange = vi.fn()
    const classes1 = ["flex", "p-4"]
    const { container, rerender } = render(
      <ClassEditor classes={classes1} debounceMs={500} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!
    expect(textarea.value).toBe("flex\np-4")

    // User types, debounce fires, then parent re-renders with equivalent classes
    textarea.value = "flex\np-4"
    fireEvent.input(textarea)
    vi.advanceTimersByTime(500)

    // Re-render with a NEW array reference containing the same values
    rerender(<ClassEditor classes={["flex", "p-4"]} debounceMs={500} onChange={onChange} />)
    // Textarea should keep its value (not flicker)
    expect(textarea.value).toBe("flex\np-4")
  })

  it("syncs textarea when parent provides different classes after debounce", () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex", "p-4"]} debounceMs={500} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!
    expect(textarea.value).toBe("flex\np-4")

    // Parent updates with completely different classes (e.g. external edit)
    rerender(<ClassEditor classes={["grid", "gap-2"]} debounceMs={500} onChange={onChange} />)
    expect(textarea.value).toBe("grid\ngap-2")
  })
})

// ─── Regression tests for fixed bugs ────────────────────────────────

describe("ClassEditor regression: cursor and content stability", () => {
  it("does not revert textarea when deleting the last character on a line", () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex", "bg-red"]} debounceMs={500} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!
    expect(textarea.value).toBe("flex\nbg-red")

    // User deletes the last character: "bg-red" → "bg-re"
    textarea.value = "flex\nbg-re"
    fireEvent.input(textarea)

    // Before debounce fires, parent re-renders with old classes
    rerender(<ClassEditor classes={["flex", "bg-red"]} debounceMs={500} onChange={onChange} />)

    // dirtyRef should protect local edits — textarea must keep user's value
    expect(textarea.value).toBe("flex\nbg-re")
  })

  it("does not revert textarea when user presses Enter to create empty line", () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex", "p-4"]} debounceMs={500} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!

    // User presses Enter after "flex" creating an empty line
    textarea.value = "flex\n\np-4"
    fireEvent.input(textarea)

    // Parent re-renders with same classes (empty line is filtered in onChange)
    rerender(<ClassEditor classes={["flex", "p-4"]} debounceMs={500} onChange={onChange} />)

    // Should preserve the empty line the user created
    expect(textarea.value).toBe("flex\n\np-4")
  })

  it("does not revert textarea when user deletes an entire line via backspace", () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex", "bg-red", "p-4"]} debounceMs={500} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!

    // User deletes "bg-red" entirely
    textarea.value = "flex\n\np-4"
    fireEvent.input(textarea)

    // Parent still has old classes
    rerender(
      <ClassEditor classes={["flex", "bg-red", "p-4"]} debounceMs={500} onChange={onChange} />,
    )

    // Should keep user's deletion
    expect(textarea.value).toBe("flex\n\np-4")
  })

  it("clears dirtyRef after debounce fires, allowing next sync", () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex"]} debounceMs={300} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!

    // User types
    textarea.value = "flex\np-4"
    fireEvent.input(textarea)

    // Debounce fires
    vi.advanceTimersByTime(300)
    expect(onChange).toHaveBeenCalledWith("flex p-4")

    // Now parent provides updated classes from the edit roundtrip
    rerender(<ClassEditor classes={["flex", "p-4"]} debounceMs={300} onChange={onChange} />)

    // Since dirtyRef is now false and content matches, textarea should stay stable
    expect(textarea.value).toBe("flex\np-4")
  })

  it("accepts external class changes after debounce clears dirty flag", () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex"]} debounceMs={300} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!

    // User types
    textarea.value = "flex\np-4"
    fireEvent.input(textarea)
    vi.advanceTimersByTime(300)

    // External edit changes classes to something completely different
    rerender(<ClassEditor classes={["grid", "gap-2"]} debounceMs={300} onChange={onChange} />)

    // dirtyRef is false, and content differs — should sync
    expect(textarea.value).toBe("grid\ngap-2")
  })
})

describe("ClassEditor regression: stable debounce across re-renders", () => {
  it("debounce timer is not cancelled by parent re-renders", () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex"]} debounceMs={500} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!

    // User types
    textarea.value = "flex\np-4"
    fireEvent.input(textarea)

    // Parent re-renders multiple times (e.g., other state changes)
    rerender(<ClassEditor classes={["flex"]} debounceMs={500} onChange={onChange} />)
    rerender(<ClassEditor classes={["flex"]} debounceMs={500} onChange={onChange} />)
    rerender(<ClassEditor classes={["flex"]} debounceMs={500} onChange={onChange} />)

    // Debounce should still fire — not cancelled by re-renders
    vi.advanceTimersByTime(500)
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith("flex p-4")
  })

  it("uses latest onChange callback even though debounce is stable", () => {
    const onChange1 = vi.fn()
    const onChange2 = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex"]} debounceMs={500} onChange={onChange1} />,
    )
    const textarea = container.querySelector("textarea")!

    // User types
    textarea.value = "flex\np-4"
    fireEvent.input(textarea)

    // Parent re-renders with a different onChange
    rerender(<ClassEditor classes={["flex"]} debounceMs={500} onChange={onChange2} />)

    // Debounce fires — should call onChange2, not onChange1
    vi.advanceTimersByTime(500)
    expect(onChange1).not.toHaveBeenCalled()
    expect(onChange2).toHaveBeenCalledOnce()
    expect(onChange2).toHaveBeenCalledWith("flex p-4")
  })
})

describe("ClassEditor regression: no duplicate classes from feedback loops", () => {
  it("does not duplicate classes during edit roundtrip", () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex", "p-4"]} debounceMs={300} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!

    // User adds bg-red
    textarea.value = "flex\np-4\nbg-red"
    fireEvent.input(textarea)
    vi.advanceTimersByTime(300)

    expect(onChange).toHaveBeenCalledWith("flex p-4 bg-red")

    // Parent updates with the new classes (edit roundtrip)
    rerender(
      <ClassEditor classes={["flex", "p-4", "bg-red"]} debounceMs={300} onChange={onChange} />,
    )

    // Textarea should have exactly the three classes, no duplicates
    const lines = textarea.value.split("\n").filter(Boolean)
    expect(lines).toEqual(["flex", "p-4", "bg-red"])
  })

  it("does not duplicate classes when user types same class twice quickly", () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <ClassEditor classes={["flex"]} debounceMs={300} onChange={onChange} />,
    )
    const textarea = container.querySelector("textarea")!

    // User types bg-red
    textarea.value = "flex\nbg-red"
    fireEvent.input(textarea)
    vi.advanceTimersByTime(300)

    // Roundtrip
    rerender(<ClassEditor classes={["flex", "bg-red"]} debounceMs={300} onChange={onChange} />)
    onChange.mockClear()

    // User types bg-red again on a new line
    textarea.value = "flex\nbg-red\nbg-red"
    fireEvent.input(textarea)
    vi.advanceTimersByTime(300)

    // Should send exactly what the user typed (two bg-red is intentional)
    expect(onChange).toHaveBeenCalledWith("flex bg-red bg-red")

    // Roundtrip with both
    rerender(
      <ClassEditor classes={["flex", "bg-red", "bg-red"]} debounceMs={300} onChange={onChange} />,
    )

    // Should show exactly three lines
    const lines = textarea.value.split("\n").filter(Boolean)
    expect(lines).toEqual(["flex", "bg-red", "bg-red"])
  })
})
