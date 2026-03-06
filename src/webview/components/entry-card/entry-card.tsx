import { useEffect, useRef } from "preact/hooks"

import { ClassEntry } from "../../types"
import { cn } from "../../utils/cn"
import { ClassEditor } from "../class-editor/class-editor"

interface EntryCardProps {
  autoScroll: boolean
  entry: ClassEntry
  isActive: boolean
  onGoToRange: () => void
  onSelect: () => void
  onUpdateClasses: (classes: string) => void
}

export function EntryCard({
  autoScroll,
  entry,
  isActive,
  onGoToRange,
  onSelect,
  onUpdateClasses,
}: EntryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive && autoScroll && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [isActive, autoScroll])

  return (
    <div
      className={cn(
        "my-1.5 border border-border rounded overflow-hidden opacity-60 transition-[opacity,border-color] duration-150",
        isActive && "opacity-100 border-ts-active-border",
      )}
      data-active={isActive || undefined}
      data-testid="entry-card"
      ref={cardRef}
    >
      <div
        className="flex justify-between items-center px-2.5 py-1.5 bg-quote-bg border-b border-border cursor-pointer"
        data-testid="header"
        onClick={onGoToRange}
      >
        <span data-testid="element">{entry.element}</span>
        <span data-testid="line">{entry.line}</span>
        <span className="text-[11px] text-description" data-testid="count">
          {entry.classes.length} classes
        </span>
      </div>
      <ClassEditor classes={entry.classes} onChange={onUpdateClasses} onFocus={onSelect} />
    </div>
  )
}
