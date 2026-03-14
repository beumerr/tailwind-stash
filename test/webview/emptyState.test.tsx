// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/preact"
import { afterEach, describe, expect, it } from "vitest"

import { EmptyState } from "../../src/webview/components/empty-state/empty-state"

afterEach(cleanup)

describe("EmptyState", () => {
  it("renders the empty state as a status region", () => {
    render(<EmptyState message="No Tailwind classes detected in the current file." />)

    const emptyState = screen.getByRole("status")
    expect(emptyState).toBeTruthy()
    expect(emptyState.textContent).toContain("No Tailwind classes detected in the current file.")
  })
})
