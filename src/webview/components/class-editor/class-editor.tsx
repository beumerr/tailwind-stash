import { useCallback, useEffect, useRef } from "preact/hooks"

import "./class-editor.scss"

interface ClassEditorProps {
  classes: Array<string>
  debounceMs?: number
  onChange: (classes: string) => void
  onFocus?: () => void
}

export function ClassEditor({ classes, debounceMs = 500, onChange, onFocus }: ClassEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = el.scrollHeight + "px"
    }
  }, [])

  useEffect(() => {
    autoResize()
  }, [classes, autoResize])

  const handleInput = (e: Event) => {
    autoResize()
    const value = (e.target as HTMLTextAreaElement).value
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const joined = value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ")
      onChange(joined)
    }, debounceMs)
  }

  return (
    <textarea
      className="class-editor"
      onFocus={onFocus}
      onInput={handleInput}
      ref={textareaRef}
      spellCheck={false}
      value={classes.join("\n")}
    />
  )
}
