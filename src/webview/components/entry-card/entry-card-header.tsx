interface EntryCardHeaderProps {
  count: number
  element: string
  line: number
  onClick: () => void
}

export function EntryCardHeader({ count, element, line, onClick }: EntryCardHeaderProps) {
  return (
    <button
      className="flex w-full justify-between items-center px-2.5 py-1.5 bg-quote-bg border-b border-border border-x-0 border-t-0 cursor-pointer"
      onClick={onClick}
      type="button"
    >
      <span className="text-ts-element">{element}</span>
      <span aria-label={`Line ${line}`}>{line}</span>
      <span className="text-[11px] text-description">
        {count} {count === 1 ? "class" : "classes"}
      </span>
    </button>
  )
}
