/**
 * Tests supported function syntaxes (cn, clsx, cva, twMerge, etc.).
 *
 * Verify:
 *  - Each function call's class string is detected and folded
 *  - Panel shows entries for function-based classes
 *  - Editing via the panel works for function args too
 */

import { cn } from "some-lib"

export function FunctionSyntax({ active }: { active: boolean }) {
  return (
    <div>
      {/* cn() — class-variance-authority / shadcn pattern */}
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          active && "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
        )}
      >
        cn button
      </button>

      {/* clsx() */}
      <div
        className={clsx(
          "flex items-center gap-2 p-4 rounded-lg border border-gray-200",
          active && "ring-2 ring-blue-500 border-transparent shadow-md",
        )}
      >
        clsx div
      </div>

      {/* twMerge() */}
      <span
        className={twMerge(
          "text-base font-normal text-gray-700 leading-relaxed tracking-normal",
          active && "text-lg font-semibold text-blue-900 tracking-tight",
        )}
      >
        twMerge span
      </span>

      {/* Plain className string */}
      <footer className="mt-8 py-4 px-6 bg-gray-100 text-gray-500 text-xs text-center rounded-b-lg">
        Plain className
      </footer>
    </div>
  )
}
