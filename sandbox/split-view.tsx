/**
 * Split-view test — open this file AND basics.html side by side.
 *
 * Verify:
 *  1. Both editors show fold decorations simultaneously
 *  2. Clicking a fold in either editor expands it
 *  3. The class editor panel tracks whichever editor is active
 *  4. Editing classes in the panel updates the correct editor
 */

export function Card() {
  return (
    <div class="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
      <h2 class="text-xl font-semibold text-gray-900 tracking-tight">
        Title
      </h2>
      <p class="text-sm text-gray-600 leading-relaxed line-clamp-3">
        Description goes here with enough text to test long class strings.
      </p>
      <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2">
        Action
      </button>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside class="w-64 h-screen bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <nav class="flex flex-col gap-1 p-4 text-sm font-medium">
        <a class="px-3 py-2 rounded-md bg-blue-50 text-blue-700 font-semibold" href="#">
          Dashboard
        </a>
        <a class="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors" href="#">
          Settings
        </a>
      </nav>
    </aside>
  )
}
