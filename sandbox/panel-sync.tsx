/**
 * Panel sync / race-condition test.
 *
 * Steps to test:
 *  1. Open class editor panel (Cmd/Ctrl+Shift+P → "Show CSS Preview")
 *  2. Open this file — panel should show entries below
 *  3. Switch to another sandbox file — panel should update instantly
 *  4. Switch back — panel should show these entries again, no stale data
 *  5. Open a NEW tab (e.g., split-view.tsx) — panel should follow
 *  6. Close the other tab — panel should stay connected to this file
 *  7. Edit a class string below via the panel — verify it writes to the right file
 */

export function Header() {
  return (
    <header class="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
      <div class="flex items-center gap-3 text-lg font-bold text-gray-900">
        Logo
      </div>
      <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
        <a href="#">Home</a>
        <a href="#">About</a>
      </nav>
    </header>
  )
}

export function Footer() {
  return (
    <footer class="mt-auto py-8 px-6 bg-gray-900 text-gray-400 text-sm text-center">
      <p class="max-w-2xl mx-auto leading-relaxed tracking-wide">
        Footer content with enough classes to fold.
      </p>
    </footer>
  )
}
