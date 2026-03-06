import { useState, useEffect } from 'preact/hooks';
import { ClassEntry } from '../../types';
import { EntryCard } from './EntryCard/EntryCard';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import './Panel.css';

type PanelMessage =
  | { type: 'update'; entries: ClassEntry[]; activeIndex: number }
  | { type: 'setActive'; index: number };

interface PanelProps {
  vscode: ReturnType<typeof acquireVsCodeApi>;
}

export function Panel({ vscode }: PanelProps) {
  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const handler = (event: MessageEvent<PanelMessage>) => {
      const msg = event.data;
      if (msg.type === 'update') {
        setEntries(msg.entries);
        setActiveIndex(msg.activeIndex);
      } else if (msg.type === 'setActive') {
        setActiveIndex(msg.index);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (entries.length === 0) {
    return <EmptyState message="No Tailwind classes detected in the current file." />;
  }

  return (
    <div class="panel">
      <h2 class="panel__title">Tailwind Classes</h2>
      {entries.map((entry, i) => (
        <EntryCard
          key={`${entry.line}-${i}`}
          entry={entry}
          isActive={i === activeIndex}
          onUpdateClasses={(classes) => {
            vscode.postMessage({ type: 'updateClasses', index: i, classes });
          }}
          onGoToRange={() => {
            vscode.postMessage({ type: 'goToRange', index: i });
          }}
        />
      ))}
    </div>
  );
}
