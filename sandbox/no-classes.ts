/**
 * A file with NO Tailwind classes.
 *
 * Verify:
 *  - No fold decorations appear
 *  - Panel shows empty state when this file is active
 *  - Switching from a file with classes to this one clears the panel
 *  - Switching back restores the panel entries
 */

export function add(a: number, b: number): number {
  return a + b
}

export function greet(name: string): string {
  return `Hello, ${name}!`
}

const config = {
  theme: "dark",
  language: "en",
  fontSize: 14,
}

export default config
