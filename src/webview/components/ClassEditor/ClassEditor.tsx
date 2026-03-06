import { useRef, useEffect, useCallback } from 'preact/hooks';
import './ClassEditor.css';

interface ClassEditorProps {
  classes: string[];
  onChange: (classes: string) => void;
  onFocus?: () => void;
  debounceMs?: number;
}

export function ClassEditor({ classes, onChange, onFocus, debounceMs = 500 }: ClassEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [classes, autoResize]);

  const handleInput = (e: Event) => {
    autoResize();
    const value = (e.target as HTMLTextAreaElement).value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const joined = value
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');
      onChange(joined);
    }, debounceMs);
  };

  return (
    <textarea
      ref={textareaRef}
      class="class-editor"
      spellcheck={false}
      onInput={handleInput}
      onFocus={onFocus}
      value={classes.join('\n')}
    />
  );
}
