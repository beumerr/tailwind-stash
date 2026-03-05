import { useEffect, useRef } from "preact/hooks"

import { ClassEntry } from "../../../utils/types"
import { cn } from "../../../utils/utils"
import { ClassEditor } from "../class-editor/class-editor"
import { EntryCardHeader } from "./entry-card-header"

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
      ref={cardRef}
      role="article"
    >
      <EntryCardHeader
        count={entry.classes.length}
        element={entry.element}
        line={entry.line}
        onClick={onGoToRange}
      />
      <ClassEditor classes={entry.classes} onChange={onUpdateClasses} onFocus={onSelect} />
    </div>
  )
}
