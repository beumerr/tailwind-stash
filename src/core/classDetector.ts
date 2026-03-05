// eslint-disable-next-line import/no-namespace -- vscode SDK requires namespace import
import * as vscode from "vscode"

export interface ClassRange {
  /** Individual class names */
  classes: string[]
  /** The nearest enclosing HTML/JSX element tag */
  element: string
  /** Full range of the class string value (inside quotes) */
  range: vscode.Range
}

/**
 * Detects Tailwind class strings in a document, including those wrapped
 * in utility functions like cn(), clsx(), cva(), twMerge(), etc.
 */
export function detectClassRanges(
  document: vscode.TextDocument,
  supportedFunctions: string[],
  minClasses: number = 4,
): ClassRange[] {
  const text = document.getText()
  const results: ClassRange[] = []

  // Pattern 1: HTML-style class/className attributes
  //   class="..." or className="..." or class='...' or className='...'
  const htmlAttrPattern = /\b(?:class|className)\s*=\s*(?:"([^"]*?)"|'([^']*?)'|{`([^`]*?)`})/g

  let match: null | RegExpExecArray
  while ((match = htmlAttrPattern.exec(text)) !== null) {
    const value = match[1] ?? match[2] ?? match[3] ?? ""
    // Determine quote type by which capture group matched, not by content
    const quoteChar = match[1] !== undefined ? '"' : match[2] !== undefined ? "'" : "`"
    const valueStart = match.index + match[0].indexOf(quoteChar) + 1

    if (match[3] !== undefined && value.includes("${")) {
      // Template literal with interpolations — extract static segments only
      extractStaticSegments(document, results, value, valueStart, minClasses)
    } else {
      addClassRange(document, results, value, valueStart, null, minClasses)
    }
  }

  // Pattern 2: Utility function calls — cn("...", "..."), clsx("..."), etc.
  // Entries starting with "/" are treated as regex patterns (e.g. "/^my.*Classes$/")
  const literalNames: string[] = []
  const regexPatterns: string[] = []
  for (const fn of supportedFunctions) {
    const regexMatch = fn.match(/^\/(.+)\/$/)
    if (regexMatch) {
      // Strip ^/$ anchors — they don't work inside a group in a larger regex.
      // Use \b boundaries instead for correct matching.
      const cleaned = regexMatch[1].replace(/^\^/, "").replace(/\$$/, "")
      regexPatterns.push(`\\b${cleaned}`)
    } else {
      literalNames.push(escapeRegex(fn))
    }
  }
  const allPatterns = [...literalNames.map((n) => `\\b${n}`), ...regexPatterns]
  if (allPatterns.length === 0) {
    return results
  }
  let funcPattern: RegExp
  try {
    funcPattern = new RegExp(`(${allPatterns.join("|")})\\s*\\(`, "g")
  } catch {
    return results
  }

  while ((match = funcPattern.exec(text)) !== null) {
    const funcName = match[1]
    const argsStart = match.index + match[0].length
    const argsEnd = findMatchingParen(text, argsStart - 1)
    if (argsEnd === -1) {
      continue
    }

    const argsText = text.slice(argsStart, argsEnd)
    // Find string literals inside the function arguments
    const stringPattern = /(?:"([^"]*?)"|'([^']*?)'|`([^`]*?)`)/g
    let strMatch: null | RegExpExecArray
    while ((strMatch = stringPattern.exec(argsText)) !== null) {
      const strValue = strMatch[1] ?? strMatch[2] ?? strMatch[3] ?? ""
      const strStart = argsStart + strMatch.index + 1 // +1 for the quote
      addClassRange(document, results, strValue, strStart, funcName, minClasses)
    }
  }

  // Deduplicate and sort by position in document
  return deduplicateRanges(results).sort(
    (a, b) =>
      a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character,
  )
}

function addClassRange(
  document: vscode.TextDocument,
  results: ClassRange[],
  value: string,
  valueStart: number,
  funcName: null | string,
  minClasses: number,
) {
  const classes = value.split(/\s+/).filter(Boolean)
  if (classes.length < minClasses) {
    return
  }

  const startPos = document.positionAt(valueStart)
  const endPos = document.positionAt(valueStart + value.length)
  const range = new vscode.Range(startPos, endPos)

  const element = inferElement(document, valueStart, funcName)

  results.push({
    classes,
    element,
    range,
  })
}

/**
 * Find the nearest enclosing HTML/JSX tag or wrapping function name.
 */
function inferElement(
  document: vscode.TextDocument,
  offset: number,
  funcName: null | string,
): string {
  if (funcName) {
    return `${funcName}()`
  }

  const text = document.getText()
  const lookback = 500
  const before = text.slice(Math.max(0, offset - lookback), offset)

  const tagPattern = /<([A-Za-z][\w.-]*)/g
  let tagMatch: null | RegExpExecArray
  let lastTag: null | string = null
  while ((tagMatch = tagPattern.exec(before)) !== null) {
    lastTag = tagMatch[1]
  }

  return lastTag || "element"
}

/**
 * Extract static class segments from a template literal with interpolations.
 * e.g. `flex items-center ${cond ? 'a' : 'b'} p-4 rounded`
 * yields two segments: "flex items-center " and " p-4 rounded"
 */
function extractStaticSegments(
  document: vscode.TextDocument,
  results: ClassRange[],
  value: string,
  valueStart: number,
  minClasses: number,
) {
  // Walk through the template literal, skipping ${...} blocks
  let i = 0
  while (i < value.length) {
    const exprStart = value.indexOf("${", i)
    // Static segment is from i to exprStart (or end of string)
    const segEnd = exprStart === -1 ? value.length : exprStart
    const segment = value.slice(i, segEnd)
    const segmentTrimmed = segment.trim()

    if (segmentTrimmed.length > 0) {
      // Find the actual start (skip leading whitespace in segment)
      const leadingWs = segment.length - segment.trimStart().length
      addClassRange(document, results, segmentTrimmed, valueStart + i + leadingWs, null, minClasses)
    }

    if (exprStart === -1) {
      break
    }

    // Skip past the ${...} block — find matching }
    let depth = 0
    let j = exprStart + 2
    for (; j < value.length; j++) {
      if (value[j] === "{") {
        depth++
      } else if (value[j] === "}") {
        if (depth === 0) {
          j++
          break
        }
        depth--
      }
    }
    i = j
  }
}

function findMatchingParen(text: string, openIndex: number): number {
  let depth = 0
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "(") {
      depth++
    } else if (text[i] === ")") {
      depth--
      if (depth === 0) {
        return i
      }
    }
  }
  return -1
}

function escapeRegex(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

function deduplicateRanges(ranges: ClassRange[]): ClassRange[] {
  const seen = new Set<string>()
  return ranges.filter((r) => {
    const key = `${r.range.start.line}:${r.range.start.character}-${r.range.end.line}:${r.range.end.character}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
