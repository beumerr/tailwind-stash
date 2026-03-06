import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks"

import { debounce } from "../../../utils/utils"

interface ClassEditorProps {
  classes: string[]
  debounceMs?: number
  onChange: (classes: string) => void
  onFocus?: () => void
}

export function ClassEditor({ classes, debounceMs = 500, onChange, onFocus }: ClassEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localValue, setLocalValue] = useState(() => classes.join("\n"))

  const debouncedOnChange = useMemo(
    () =>
      debounce((value: string) => {
        const joined = value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" ")
        onChange(joined)
      }, debounceMs),
    [onChange, debounceMs],
  )

  useEffect(() => {
    setLocalValue(classes.join("\n"))
  }, [classes])

  useEffect(() => {
    return () => debouncedOnChange.cancel()
  }, [debouncedOnChange])

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    autoResize()
  }, [localValue, autoResize])

  const handleInput = (e: Event) => {
    const value = (e.target as HTMLTextAreaElement).value
    setLocalValue(value)
    autoResize()
    debouncedOnChange.fn(value)
  }

  return (
    <textarea
      aria-label="Edit Tailwind classes"
      className="block w-full border-none outline-none resize-y px-2.5 py-2 text-editor-fg bg-editor-bg leading-relaxed min-h-10 focus:bg-ts-textarea-focus-bg"
      onFocus={onFocus}
      onInput={handleInput}
      ref={textareaRef}
      spellcheck={false}
      value={localValue}
    />
  )
}
