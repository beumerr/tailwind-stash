import { useEffect, useRef, useState } from "preact/hooks"

import { ClassEntry } from "../../../utils/types"
import { EmptyState } from "../../components/empty-state/empty-state"
import { EntryCard } from "../../components/entry-card/entry-card"

type PanelMessage =
  | {
      activeBorderColor: string
      elementTextColor: string
      scrollPanelOnEditorSelect: boolean
      textareaFocusBackground: string
      type: "config"
    }
  | { activeIndex: number; entries: ClassEntry[]; type: "update" }
  | { index: number; type: "setActive" }

interface PanelProps {
  vscode: ReturnType<typeof acquireVsCodeApi>
}

export function Panel({ vscode }: PanelProps) {
  const [entries, setEntries] = useState<ClassEntry[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [autoScrollPanel, setAutoScrollPanel] = useState(true)
  const hasFocusRef = useRef(false)

  useEffect(() => {
    const onFocusIn = () => {
      hasFocusRef.current = true
    }
    const onFocusOut = () => {
      hasFocusRef.current = false
    }
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("focusout", onFocusOut)
    return () => {
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("focusout", onFocusOut)
    }
  }, [])

  useEffect(() => {
    const handler = (event: MessageEvent<PanelMessage>) => {
      const msg = event.data
      if (msg.type === "update") {
        setEntries(msg.entries)
        setActiveIndex(msg.activeIndex)
      } else if (msg.type === "setActive") {
        if (!hasFocusRef.current) {
          setActiveIndex(msg.index)
        }
      } else if (msg.type === "config") {
        setAutoScrollPanel(msg.scrollPanelOnEditorSelect)
        const root = document.documentElement
        if (msg.elementTextColor) {
          root.style.setProperty("--ts-element-color", msg.elementTextColor)
        } else {
          root.style.removeProperty("--ts-element-color")
        }
        if (msg.activeBorderColor) {
          root.style.setProperty("--ts-active-border-color", msg.activeBorderColor)
        } else {
          root.style.removeProperty("--ts-active-border-color")
        }
        if (msg.textareaFocusBackground) {
          root.style.setProperty("--ts-textarea-focus-bg", msg.textareaFocusBackground)
        } else {
          root.style.removeProperty("--ts-textarea-focus-bg")
        }
      }
    }
    window.addEventListener("message", handler)
    vscode.postMessage({ type: "ready" })
    return () => {
      window.removeEventListener("message", handler)
      const root = document.documentElement
      root.style.removeProperty("--ts-element-color")
      root.style.removeProperty("--ts-active-border-color")
      root.style.removeProperty("--ts-textarea-focus-bg")
    }
  }, [vscode])

  if (entries.length === 0) {
    return <EmptyState message="No Tailwind classes detected in the current file." />
  }

  return (
    <div>
      <h2 className="text-sm text-description mb-3 font-medium">Tailwind Classes</h2>
      {entries.map((entry, i) => (
        <EntryCard
          autoScroll={autoScrollPanel}
          entry={entry}
          isActive={i === activeIndex}
          key={`${entry.line}-${i}`}
          onGoToRange={() => {
            vscode.postMessage({ index: i, type: "goToRange" })
          }}
          onSelect={() => {
            setActiveIndex(i)
            vscode.postMessage({ index: i, type: "selectEntry" })
          }}
          onUpdateClasses={(classes) => {
            vscode.postMessage({ classes, index: i, type: "updateClasses" })
          }}
        />
      ))}
    </div>
  )
}
