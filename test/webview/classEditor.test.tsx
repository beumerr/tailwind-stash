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
})
