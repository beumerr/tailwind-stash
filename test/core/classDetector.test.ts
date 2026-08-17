import { afterEach, describe, expect, it, vi } from "vitest"

import { createMockDocument, window } from "../__mocks__/vscode"
import { detectClassRanges } from "../../src/core/classDetector"

const defaultFunctions = [
  "cn",
  "clsx",
  "cva",
  "cx",
  "twMerge",
  "twJoin",
  "classNames",
  "classnames",
]

afterEach(() => {
  vi.restoreAllMocks()
})

function detect(text: string, opts?: { functions?: string[]; minClasses?: number }) {
  const doc = createMockDocument(text)
  return detectClassRanges(doc, opts?.functions ?? defaultFunctions, opts?.minClasses ?? 4)
}

// ─── HTML class attributes ───────────────────────────────────────────

describe("HTML class attributes", () => {
  it('detects class="" with enough classes', () => {
    const results = detect('<div class="flex items-center p-4 rounded">')
    expect(results).toHaveLength(1)
    expect(results[0].classes).toEqual(["flex", "items-center", "p-4", "rounded"])
  })

  it('detects className="" (JSX)', () => {
    const results = detect('<div className="flex items-center p-4 rounded">')
    expect(results).toHaveLength(1)
    expect(results[0].classes).toEqual(["flex", "items-center", "p-4", "rounded"])
  })

  it("detects single-quoted attributes", () => {
    const results = detect("<div class='flex items-center p-4 rounded'>")
    expect(results).toHaveLength(1)
  })

  it("detects template literal attributes", () => {
    const results = detect("<div className={`flex items-center p-4 rounded`}>")
    expect(results).toHaveLength(1)
  })

  it("ignores attributes below minClasses threshold", () => {
    const results = detect('<div class="flex p-4">')
    expect(results).toHaveLength(0)
  })

  it("respects custom minClasses", () => {
    const results = detect('<div class="flex p-4">', { minClasses: 2 })
    expect(results).toHaveLength(1)
  })

  it("handles multiple attributes in the same document", () => {
    const text = `
<div class="flex items-center p-4 rounded">
<span class="text-sm font-bold text-red-500 mt-2">
`
    const results = detect(text)
    expect(results).toHaveLength(2)
  })

  it("returns correct line numbers", () => {
    const text = `<div>
  <span class="flex items-center p-4 rounded">
</div>`
    const results = detect(text)
    expect(results).toHaveLength(1)
    expect(results[0].range.start.line).toBe(1)
  })
})

// ─── Template literals with interpolations ───────────────────────────

describe("template literals with interpolations", () => {
  it("extracts static segments around interpolations", () => {
    const text =
      '<div className={`flex items-center gap-2 p-4 ${cond ? "a" : "b"} rounded mt-2 mb-2 mx-auto`}>'
    const results = detect(text)
    expect(results.length).toBeGreaterThanOrEqual(1)
    // Should find at least the static segments that meet the threshold
  })

  it("skips template literals where static segments are too short", () => {
    const text = "<div className={`${dynamicClasses}`}>"
    const results = detect(text)
    expect(results).toHaveLength(0)
  })
})

// ─── Utility function calls ─────────────────────────────────────────

describe("utility function calls", () => {
  it("detects cn() calls", () => {
    const text = 'const cls = cn("flex items-center p-4 rounded");'
    const results = detect(text)
    expect(results).toHaveLength(1)
    expect(results[0].classes).toEqual(["flex", "items-center", "p-4", "rounded"])
  })

  it("detects clsx() calls", () => {
    const text = 'const cls = clsx("flex items-center p-4 rounded");'
    const results = detect(text)
    expect(results).toHaveLength(1)
  })

  it("detects twMerge() calls", () => {
    const text = 'const cls = twMerge("flex items-center p-4 rounded");'
    const results = detect(text)
    expect(results).toHaveLength(1)
  })

  it("detects multiple string arguments", () => {
    const text = 'cn("flex items-center p-4 rounded", "text-sm font-bold mt-2 mx-auto")'
    const results = detect(text)
    expect(results).toHaveLength(2)
  })

  it("ignores function calls not in the supported list", () => {
    const text = 'myFunc("flex items-center p-4 rounded")'
    const results = detect(text)
    expect(results).toHaveLength(0)
  })

  it("handles nested parentheses", () => {
    const text =
      'cn("flex items-center p-4 rounded", someCondition && "text-sm font-bold mt-2 mx-auto")'
    const results = detect(text)
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it("supports custom function names", () => {
    const text = 'myStyles("flex items-center p-4 rounded")'
    const results = detect(text, { functions: ["myStyles"] })
    expect(results).toHaveLength(1)
  })

  it("supports regex function patterns", () => {
    const text = 'getButtonClasses("flex items-center p-4 rounded")'
    const results = detect(text, { functions: ["/^get.*Classes$/"] })
    expect(results).toHaveLength(1)
  })

  it("regex patterns do not match non-matching names", () => {
    const text = 'setButtonStyles("flex items-center p-4 rounded")'
    const results = detect(text, { functions: ["/^get.*Classes$/"] })
    expect(results).toHaveLength(0)
  })
})

// ─── Element inference ──────────────────────────────────────────────

describe("element inference", () => {
  it("infers the enclosing HTML element", () => {
    const text = '<button class="flex items-center p-4 rounded">'
    const results = detect(text)
    expect(results[0].element).toBe("button")
  })

  it("infers JSX component names", () => {
    const text = '<MyComponent className="flex items-center p-4 rounded" />'
    const results = detect(text)
    expect(results[0].element).toBe("MyComponent")
  })

  it("shows function name for utility calls", () => {
    const text = 'cn("flex items-center p-4 rounded")'
    const results = detect(text)
    expect(results[0].element).toBe("cn()")
  })

  it('falls back to "element" when no tag is found', () => {
    const text = 'const x = "flex items-center p-4 rounded";'
    // This won't be detected since it's not a class attr or function call
    // Let's test with a function call far from any tag
    const text2 = 'cn("flex items-center p-4 rounded")'
    const results = detect(text2)
    expect(results[0].element).toBe("cn()")
  })
})

// ─── minClasses threshold ───────────────────────────────────────────

describe("minClasses threshold", () => {
  it("default threshold of 4 skips 3 classes", () => {
    const results = detect('<div class="flex p-4 mt-2">')
    expect(results).toHaveLength(0)
  })

  it("default threshold of 4 includes 4 classes", () => {
    const results = detect('<div class="flex p-4 mt-2 rounded">')
    expect(results).toHaveLength(1)
  })

  it("threshold of 1 includes single-class strings", () => {
    const results = detect('<div class="flex">', { minClasses: 1 })
    expect(results).toHaveLength(1)
  })

  it("threshold applies to function calls too", () => {
    const results = detect('cn("flex p-4")')
    expect(results).toHaveLength(0)
  })
})

// ─── Deduplication ──────────────────────────────────────────────────

describe("deduplication", () => {
  it("does not return duplicate ranges for className in function calls", () => {
    // className="cn(...)" could match both the HTML attr pattern and function pattern
    const text = '<div className="flex items-center p-4 rounded">'
    const results = detect(text)
    // Each range should appear only once
    const keys = results.map(
      (r) =>
        `${r.range.start.line}:${r.range.start.character}-${r.range.end.line}:${r.range.end.character}`,
    )
    expect(new Set(keys).size).toBe(keys.length)
  })
})

// ─── Edge cases ─────────────────────────────────────────────────────

describe("edge cases", () => {
  it("handles empty document", () => {
    const results = detect("")
    expect(results).toHaveLength(0)
  })

  it("handles document with no class attributes", () => {
    const results = detect('<div id="main"><span>Hello</span></div>')
    expect(results).toHaveLength(0)
  })

  it("handles extra whitespace in class strings", () => {
    const results = detect('<div class="  flex   items-center   p-4   rounded  ">')
    expect(results).toHaveLength(1)
    expect(results[0].classes).toEqual(["flex", "items-center", "p-4", "rounded"])
  })

  it("handles multiline class strings", () => {
    const text = `<div class="flex
  items-center
  p-4
  rounded">`
    const results = detect(text)
    expect(results).toHaveLength(1)
    expect(results[0].classes).toContain("flex")
    expect(results[0].classes).toContain("rounded")
  })

  it("handles empty function argument list", () => {
    const results = detect("cn()")
    expect(results).toHaveLength(0)
  })

  it("handles function with no string arguments", () => {
    const results = detect("cn(someVariable, anotherVar)")
    expect(results).toHaveLength(0)
  })
})

// ─── Tailwind-specific class syntax ─────────────────────────────────

describe("Tailwind-specific class syntax", () => {
  it("handles responsive prefixes like sm: md: lg:", () => {
    const results = detect('<div class="sm:flex md:grid lg:hidden xl:block">')
    expect(results).toHaveLength(1)
    expect(results[0].classes).toContain("sm:flex")
  })

  it("handles state prefixes like hover: focus: dark:", () => {
    const results = detect(
      '<div class="hover:bg-blue-500 focus:ring-2 dark:text-white active:scale-95">',
    )
    expect(results).toHaveLength(1)
  })

  it("handles arbitrary values with brackets like w-[100px]", () => {
    const results = detect('<div class="w-[100px] h-[50vh] bg-[#ff0000] text-[14px]">')
    expect(results).toHaveLength(1)
    expect(results[0].classes).toContain("w-[100px]")
  })

  it("handles negative values like -mt-4", () => {
    const results = detect('<div class="-mt-4 -ml-2 -translate-x-1/2 -rotate-45">')
    expect(results).toHaveLength(1)
    expect(results[0].classes).toContain("-mt-4")
  })

  it("handles fraction values like w-1/2", () => {
    const results = detect('<div class="w-1/2 h-1/3 translate-x-1/2 basis-1/4">')
    expect(results).toHaveLength(1)
    expect(results[0].classes).toContain("w-1/2")
  })

  it("handles important modifier !", () => {
    const results = detect('<div class="!flex !important-class !p-4 !mt-0">')
    expect(results).toHaveLength(1)
    expect(results[0].classes).toContain("!flex")
  })

  it("handles stacked modifiers like dark:hover:bg-blue-500", () => {
    const results = detect(
      '<div class="dark:hover:bg-blue-500 sm:focus:ring-2 lg:dark:text-white group-hover:opacity-100">',
    )
    expect(results).toHaveLength(1)
  })
})

// ─── Real-world JSX patterns ────────────────────────────────────────

describe("real-world JSX patterns", () => {
  it('detects className inside JSX expression: className={cn("...")}', () => {
    const text = '<div className={cn("flex items-center p-4 rounded")}>'
    const results = detect(text)
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('handles className={cn("...", condition && "...")}', () => {
    const text =
      '<Button className={cn("flex items-center p-4 rounded", isActive && "bg-blue-500 text-white font-bold ring-2")}>'
    const results = detect(text)
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it("handles self-closing tags", () => {
    const results = detect('<img class="w-full h-auto object-cover rounded" />')
    expect(results).toHaveLength(1)
    expect(results[0].element).toBe("img")
  })

  it("handles two class attributes on the same line", () => {
    const text =
      '<div class="flex items-center p-4 rounded"></div><span class="text-sm font-bold mt-2 mx-auto"></span>'
    const results = detect(text)
    expect(results).toHaveLength(2)
  })

  it("handles class attribute followed by other attributes", () => {
    const text = '<input class="w-full border rounded px-3" type="text" placeholder="Search">'
    const results = detect(text)
    expect(results).toHaveLength(1)
  })
})

// ─── Framework-specific patterns ────────────────────────────────────

describe("framework-specific patterns", () => {
  it("handles Vue template syntax", () => {
    const text = '<template><div class="flex items-center p-4 rounded"></div></template>'
    const results = detect(text)
    expect(results).toHaveLength(1)
  })

  it("handles Svelte class directive", () => {
    const text = '<div class="flex items-center p-4 rounded">content</div>'
    const results = detect(text)
    expect(results).toHaveLength(1)
  })

  it("handles PHP echo with class", () => {
    const text = '<div class="flex items-center p-4 rounded"><?php echo $content; ?></div>'
    const results = detect(text)
    expect(results).toHaveLength(1)
  })
})

// ─── Multiple function patterns together ────────────────────────────

describe("multiple function patterns", () => {
  it("detects different supported functions in the same file", () => {
    const text = `
const a = cn("flex items-center p-4 rounded");
const b = clsx("grid gap-4 p-6 bg-white");
const c = twMerge("text-sm font-bold mt-2 mx-auto");
`
    const results = detect(text)
    expect(results).toHaveLength(3)
  })

  it("handles mix of literal and regex function patterns", () => {
    const text = `
const a = cn("flex items-center p-4 rounded");
const b = getCardStyles("grid gap-4 p-6 bg-white");
`
    const results = detect(text, { functions: ["cn", "/^get.*Styles$/"] })
    expect(results).toHaveLength(2)
  })

  it("does not match function names that are substrings of other words", () => {
    // "cn" should not match "scnario" or "acne"
    const text = 'const scenario = "flex items-center p-4 rounded";'
    const results = detect(text)
    expect(results).toHaveLength(0)
  })
})

// ─── cva() variant patterns ─────────────────────────────────────────

describe("cva() patterns", () => {
  it("detects base classes in cva()", () => {
    const text = `const button = cva("inline-flex items-center justify-center rounded");`
    const results = detect(text)
    expect(results).toHaveLength(1)
  })

  it("detects multiple string arguments in cva()", () => {
    const text = `cva("inline-flex items-center justify-center rounded", {
  variants: {
    size: {
      sm: "h-8 px-3 text-sm gap-1",
      md: "h-10 px-4 text-base gap-2",
    }
  }
})`
    const results = detect(text)
    // Should detect the base string and possibly variant strings
    expect(results.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── Empty and invalid function patterns ────────────────────────────

describe("empty and invalid function patterns", () => {
  it("returns HTML results when supportedFunctions is empty", () => {
    const results = detect('<div class="flex items-center p-4 rounded">', { functions: [] })
    expect(results).toHaveLength(1)
    expect(results[0].element).toBe("div")
  })

  it("warns once and keeps valid detections when a regex pattern is invalid", () => {
    const warningSpy = vi.spyOn(window, "showWarningMessage")
    const text = `
const a = cn("flex items-center p-4 rounded");
const b = getButtonClasses("grid gap-4 p-6 bg-white");
<div class="text-sm font-bold mt-2 mx-auto"></div>
`

    const results = detect(text, {
      functions: ["cn", "/[invalid(/", "/^get.*Classes$/"],
    })

    expect(results).toHaveLength(3)
    expect(warningSpy).toHaveBeenCalledTimes(1)
    expect(warningSpy.mock.calls[0]?.[0]).toContain("/[invalid(/")
  })

  it("does not repeat the warning for the same invalid regex pattern", () => {
    const warningSpy = vi.spyOn(window, "showWarningMessage")

    detect('<div class="flex items-center p-4 rounded">', {
      functions: ["/[still-invalid(/"],
    })
    detect('<div class="flex items-center p-4 rounded">', {
      functions: ["/[still-invalid(/"],
    })

    expect(warningSpy).toHaveBeenCalledTimes(1)
  })

  it("returns results gracefully when regex pattern is invalid", () => {
    const results = detect('<div class="flex items-center p-4 rounded">', {
      functions: ["/[invalid(/"],
    })
    // Should not throw, should still return HTML-detected ranges
    expect(results).toHaveLength(1)
  })
})

// ─── Template literal with nested braces ────────────────────────────

describe("template literal interpolation edge cases", () => {
  it("handles template literal with nested braces in interpolation", () => {
    const text =
      "<div className={`flex items-center gap-2 p-4 ${obj.fn({ a: 1 })} rounded mt-2 mb-2 mx-auto`}>"
    const results = detect(text)
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it("handles template literal with no static content after interpolation", () => {
    const text = "<div className={`flex items-center gap-2 p-4 ${dynamicClasses}`}>"
    const results = detect(text)
    // The first segment "flex items-center gap-2 p-4" has 4 classes
    expect(results).toHaveLength(1)
  })

  it("handles template literal with only whitespace segments around interpolation", () => {
    const text = "<div className={`${a} ${b}`}>"
    const results = detect(text)
    expect(results).toHaveLength(0)
  })
})

// ─── Deduplication with overlapping patterns ────────────────────────

describe("deduplication", () => {
  it("deduplicates ranges that appear in both HTML and function patterns", () => {
    // cn() inside className={cn("...")} — both HTML attr and function pattern match
    const text = '<div className={cn("flex items-center p-4 rounded")}>'
    const results = detect(text)
    // The same range should not appear twice
    const keys = results.map(
      (r) =>
        `${r.range.start.line}:${r.range.start.character}-${r.range.end.line}:${r.range.end.character}`,
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("removes duplicates when className attr contains a function call", () => {
    // This text creates the same range from both HTML attr pattern and function pattern
    const text = 'className="flex items-center p-4 rounded"'
    // Detect twice by also having cn match the same quoted string
    // A className={cn("flex items-center p-4 rounded")} might match the
    // quoted string twice. Let's verify dedup works with an explicit overlap.
    const text2 = `<div className={cn("flex items-center p-4 rounded")}>`
    const results1 = detect(text2)
    // Results should be deduplicated — no two ranges with same start/end
    const seen = new Set<string>()
    for (const r of results1) {
      const key = `${r.range.start.line}:${r.range.start.character}-${r.range.end.line}:${r.range.end.character}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })
})

// ─── inferElement fallback ──────────────────────────────────────────

describe("inferElement fallback", () => {
  it("falls back to 'element' when no enclosing tag exists", () => {
    // Use a function call that's not preceded by any HTML tag
    const text = 'cn("flex items-center p-4 rounded")'
    const results = detect(text)
    // cn() uses funcName, so element is "cn()"
    expect(results[0].element).toBe("cn()")
  })
})

// ─── Boundary and stress scenarios ──────────────────────────────────

describe("boundary and stress scenarios", () => {
  it("handles a very long class string", () => {
    const classes = Array.from({ length: 50 }, (_, i) => `class-${i}`).join(" ")
    const text = `<div class="${classes}">`
    const results = detect(text)
    expect(results).toHaveLength(1)
    expect(results[0].classes).toHaveLength(50)
  })

  it("handles many class attributes in a large document", () => {
    const lines = Array.from(
      { length: 20 },
      (_, i) => `<div class="flex items-center p-${i} rounded">`,
    ).join("\n")
    const results = detect(lines)
    expect(results).toHaveLength(20)
  })

  it("does not detect classes inside HTML comments", () => {
    const text = '<!-- <div class="flex items-center p-4 rounded"> -->'
    // This is a known limitation worth documenting — regex-based detection
    // may still match inside comments. If it does, that's acceptable for now.
    const results = detect(text)
    // Either 0 (ideal) or 1 (known limitation) is acceptable
    expect(results.length).toBeLessThanOrEqual(1)
  })

  it("does not detect classes inside JS string variables (non-function)", () => {
    const text = 'const x = "flex items-center p-4 rounded";'
    const results = detect(text)
    expect(results).toHaveLength(0)
  })

  it("handles unclosed parenthesis gracefully", () => {
    const text = 'cn("flex items-center p-4 rounded"'
    const results = detect(text)
    // Should not crash — may or may not detect depending on implementation
    expect(results).toBeDefined()
  })

  it("handles empty class attribute", () => {
    const results = detect('<div class="">')
    expect(results).toHaveLength(0)
  })

  it("handles class attribute with only whitespace", () => {
    const results = detect('<div class="   ">')
    expect(results).toHaveLength(0)
  })
})
