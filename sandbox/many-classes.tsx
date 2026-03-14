/**
 * Stress test — many class ranges in one file.
 *
 * Verify:
 *  - All ranges fold without lag
 *  - Panel lists all entries and scrolls
 *  - Selecting an entry in the panel scrolls the editor to it
 *  - Rapid cursor movement between ranges stays responsive
 */

export function StressTest() {
  return (
    <div class="min-h-screen bg-gray-50 p-8 font-sans antialiased">
      <div class="max-w-4xl mx-auto space-y-6 bg-white rounded-2xl shadow-xl p-8">
        <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
          Stress Test
        </h1>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium">
            Card 1
          </div>
          <div class="p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 font-medium">
            Card 2
          </div>
          <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 font-medium">
            Card 3
          </div>
          <div class="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 font-medium">
            Card 4
          </div>
          <div class="p-4 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 font-medium">
            Card 5
          </div>
          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 font-medium">
            Card 6
          </div>
          <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 font-medium">
            Card 7
          </div>
          <div class="p-4 bg-purple-50 border border-purple-200 rounded-lg text-purple-800 font-medium">
            Card 8
          </div>
          <div class="p-4 bg-pink-50 border border-pink-200 rounded-lg text-pink-800 font-medium">
            Card 9
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-gray-200">
          <span class="text-sm text-gray-500 font-medium tabular-nums">9 items</span>
          <button class="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors">
            Load More
          </button>
        </div>
      </div>
    </div>
  )
}
