// eslint-disable-next-line import/no-namespace -- vscode SDK requires namespace import
import * as vscode from "vscode"

import { escapeRegex } from "../utils/utils"

export const DEFAULT_SUPPORTED_FUNCTIONS = [
  "cn",
  "clsx",
  "cva",
  "cx",
  "twMerge",
  "twJoin",
  "classNames",
  "classnames",
]

const CLASS_ATTR_PATTERN = /\b(?:class|className)\s*=\s*(?:["'`{]|{\s*`)[^"'`}]*$/

/**
 * Checks if the cursor is inside a class/className attribute or a supported function call.
 * Uses a line-based heuristic: scans backward from cursor for an opening pattern.
 */
export function isInsideClassContext(
  document: vscode.TextDocument,
  position: vscode.Position,
  supportedFunctions: string[],
): boolean {
  const lineText = document.getText(
    new vscode.Range(new vscode.Position(position.line, 0), position),
  )

  if (CLASS_ATTR_PATTERN.test(lineText)) {
    return true
  }

  const funcNames = supportedFunctions
    .filter((fn) => !fn.startsWith("/"))
    .map((fn) => escapeRegex(fn))
    .join("|")

  if (funcNames.length === 0) {
    return false
  }

  const funcCallPattern = new RegExp(`\\b(?:${funcNames})\\s*\\([^)]*["'\`][^"'\`]*$`)
  return funcCallPattern.test(lineText)
}
