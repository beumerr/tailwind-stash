import { describe, expect, it } from "vitest"

import {
  formatPlaceholder,
  matchPlaceholders,
  PlaceholderMatch,
} from "../../src/core/placeholderMatcher"

// ─── matchPlaceholders ──────────────────────────────────────────────

describe("matchPlaceholders", () => {
  const placeholders = {
    btn: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700",
    card: "max-w-sm rounded overflow-hidden shadow-lg p-6 m-4",
    "flex-center": "flex justify-center items-center",
  }

  it("returns null when no placeholders match", () => {
    const classes = ["mt-4", "mb-2", "text-sm"]
    expect(matchPlaceholders(classes, placeholders)).toBeNull()
  })

  it("returns null for empty placeholders map", () => {
    const classes = ["px-4", "py-2"]
    expect(matchPlaceholders(classes, {})).toBeNull()
  })

  it("matches a single placeholder exactly", () => {
    const classes = ["flex", "justify-center", "items-center"]
    const result = matchPlaceholders(classes, placeholders)
    expect(result).toEqual({ keys: ["flex-center"], restCount: 0 })
  })

  it("matches a single placeholder with extra classes", () => {
    const classes = ["flex", "justify-center", "items-center", "mt-4", "mb-2"]
    const result = matchPlaceholders(classes, placeholders)
    expect(result).toEqual({ keys: ["flex-center"], restCount: 2 })
  })

  it("matches multiple placeholders simultaneously", () => {
    const classes = [
      "px-4",
      "py-2",
      "bg-blue-500",
      "text-white",
      "rounded",
      "hover:bg-blue-700",
      "flex",
      "justify-center",
      "items-center",
      "mt-4",
      "mb-2",
    ]
    const result = matchPlaceholders(classes, placeholders)
    expect(result).not.toBeNull()
    expect(result!.keys).toContain("btn")
    expect(result!.keys).toContain("flex-center")
    expect(result!.restCount).toBe(2)
  })

  it("counts shared classes only once in rest", () => {
    // btn includes "rounded", card includes "rounded"
    // If both match, "rounded" should only be counted as covered once
    const classes = [
      "px-4",
      "py-2",
      "bg-blue-500",
      "text-white",
      "rounded",
      "hover:bg-blue-700",
      "max-w-sm",
      "overflow-hidden",
      "shadow-lg",
      "p-6",
      "m-4",
    ]
    const result = matchPlaceholders(classes, placeholders)
    expect(result).not.toBeNull()
    expect(result!.keys).toContain("btn")
    expect(result!.keys).toContain("card")
    expect(result!.restCount).toBe(0)
  })

  it("preserves config definition order for keys", () => {
    const classes = [
      "flex",
      "justify-center",
      "items-center",
      "px-4",
      "py-2",
      "bg-blue-500",
      "text-white",
      "rounded",
      "hover:bg-blue-700",
    ]
    const result = matchPlaceholders(classes, placeholders)
    expect(result).not.toBeNull()
    // btn is defined before flex-center in the config
    expect(result!.keys).toEqual(["btn", "flex-center"])
  })

  it("ignores placeholders with empty values", () => {
    const classes = ["flex", "justify-center", "items-center"]
    const result = matchPlaceholders(classes, { ...placeholders, empty: "" })
    expect(result).toEqual({ keys: ["flex-center"], restCount: 0 })
  })

  it("is order-independent for class matching", () => {
    const classes = ["items-center", "flex", "justify-center"]
    const result = matchPlaceholders(classes, placeholders)
    expect(result).toEqual({ keys: ["flex-center"], restCount: 0 })
  })
})

// ─── formatPlaceholder ──────────────────────────────────────────────

describe("formatPlaceholder", () => {
  it("formats with default template and rest > 0", () => {
    const match: PlaceholderMatch = { keys: ["btn"], restCount: 2 }
    expect(formatPlaceholder(match, "{keys} +{rest}")).toBe("btn +2")
  })

  it("suppresses +{rest} when rest is 0", () => {
    const match: PlaceholderMatch = { keys: ["btn"], restCount: 0 }
    expect(formatPlaceholder(match, "{keys} +{rest}")).toBe("btn")
  })

  it("formats multiple keys", () => {
    const match: PlaceholderMatch = { keys: ["btn", "flex-center"], restCount: 3 }
    expect(formatPlaceholder(match, "{keys} +{rest}")).toBe("btn flex-center +3")
  })

  it("formats multiple keys with zero rest", () => {
    const match: PlaceholderMatch = { keys: ["btn", "flex-center"], restCount: 0 }
    expect(formatPlaceholder(match, "{keys} +{rest}")).toBe("btn flex-center")
  })

  it("supports custom format templates", () => {
    const match: PlaceholderMatch = { keys: ["btn"], restCount: 5 }
    expect(formatPlaceholder(match, "[{keys}] ({rest} more)")).toBe("[btn] (5 more)")
  })

  it("handles custom format with zero rest", () => {
    const match: PlaceholderMatch = { keys: ["btn"], restCount: 0 }
    expect(formatPlaceholder(match, "{keys} (+{rest})")).toBe("btn")
  })
})
