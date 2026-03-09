export interface PlaceholderMatch {
  /** Matched placeholder keys in config definition order */
  keys: string[]
  /** Number of classes not covered by any matched placeholder */
  restCount: number
}

/**
 * Finds all placeholder entries whose classes are a subset of the given class list.
 * Returns matched keys (config definition order) and the count of remaining classes.
 * Returns null if no placeholders match.
 */
export function matchPlaceholders(
  classes: string[],
  placeholders: Record<string, string>,
): null | PlaceholderMatch {
  const classSet = new Set(classes)
  const matchedKeys: string[] = []
  const coveredClasses = new Set<string>()

  for (const [key, value] of Object.entries(placeholders)) {
    const placeholderClasses = value.split(/\s+/).filter(Boolean)
    if (placeholderClasses.length === 0) {
      continue
    }
    const allPresent = placeholderClasses.every((c) => classSet.has(c))
    if (allPresent) {
      matchedKeys.push(key)
      for (const c of placeholderClasses) {
        coveredClasses.add(c)
      }
    }
  }

  if (matchedKeys.length === 0) {
    return null
  }

  return {
    keys: matchedKeys,
    restCount: classes.filter((c) => !coveredClasses.has(c)).length,
  }
}

/**
 * Formats a placeholder match using the user's format template.
 * Supports {keys} and {rest}. The "+{rest}" portion is suppressed when rest is 0.
 */
export function formatPlaceholder(match: PlaceholderMatch, format: string): string {
  const keysStr = match.keys.join(" ")

  if (match.restCount === 0) {
    // Remove the entire segment containing {rest} and surrounding decoration
    // Handles patterns like "+{rest}", " +{rest}", "(+{rest})", " ({rest} more)" etc.
    const withoutRest = format
      .replaceAll(/\s*\([^)]*\{rest}[^)]*\)/g, "")
      .replaceAll(/\s*\+?\{rest}/g, "")
    return withoutRest.replaceAll("{keys}", keysStr).trim()
  }

  return format.replaceAll("{keys}", keysStr).replaceAll("{rest}", String(match.restCount))
}
