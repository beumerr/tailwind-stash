import { useCallback, useEffect, useRef, useState } from "preact/hooks"

import { debounce } from "../../../utils/utils"

interface ClassEditorProps {
  classes: string[]
  debounceMs?: number
  onChange: (classes: string) => void
  onFocus?: () => void
}

export function ClassEditor({ classes, debounceMs = 500, onChange, onFocus }: ClassEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dirtyRef = useRef(false)
  const localValueRef = useRef("")
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [localValue, setLocalValue] = useState(() => classes.join("\n"))
  localValueRef.current = localValue

  // Stable debounce — never recreated, so it's never cancelled by re-renders.
  // Uses onChangeRef to always call the latest onChange callback.
  const debouncedOnChange = useRef(
    debounce((value: string) => {
      const joined = value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ")
      onChangeRef.current(joined)
      dirtyRef.current = false
    }, debounceMs),
  ).current

  useEffect(() => {
    return () => debouncedOnChange.cancel()
  }, [debouncedOnChange])

  useEffect(() => {
    // Skip sync while the user has unsent local edits
    if (dirtyRef.current) {
      return
    }
    // Only sync when the actual classes differ (ignoring empty lines)
    const local = localValueRef.current
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ")
    const incoming = classes.join(" ")
    if (local !== incoming) {
      setLocalValue(classes.join("\n"))
    }
  }, [classes])

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
    dirtyRef.current = true
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
