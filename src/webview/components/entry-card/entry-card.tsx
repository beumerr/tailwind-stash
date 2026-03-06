import { useEffect, useRef } from "preact/hooks"

import { ClassEntry } from "../../types"
import { cn } from "../../utils/cn"
import { ClassEditor } from "../class-editor/class-editor"
import "./entry-card.scss"

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
    <div className={cn("entry-card", isActive && "active")} ref={cardRef}>
      <div className="header" onClick={onGoToRange}>
        <span className="element">{entry.element}</span>
        <span className="line">L{entry.line}</span>
        <span className="count">{entry.classes.length} classes</span>
      </div>
      <ClassEditor classes={entry.classes} onChange={onUpdateClasses} onFocus={onSelect} />
    </div>
  )
}
