import { useRef, useEffect } from 'preact/hooks';
import { ClassEntry } from '../../../types';
import { ClassEditor } from '../../../components/ClassEditor/ClassEditor';
import './EntryCard.css';

interface EntryCardProps {
  entry: ClassEntry;
  isActive: boolean;
  onUpdateClasses: (classes: string) => void;
  onGoToRange: () => void;
}

export function EntryCard({ entry, isActive, onUpdateClasses, onGoToRange }: EntryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive]);

  return (
    <div ref={cardRef} class={`entry-card ${isActive ? 'active' : ''}`}>
      <div class="entry-card__header" onClick={onGoToRange}>
        <span class="entry-card__element">{entry.element}</span>
        <span class="entry-card__line">L{entry.line}</span>
        <span class="entry-card__count">{entry.classes.length} classes</span>
      </div>
      <ClassEditor classes={entry.classes} onChange={onUpdateClasses} />
    </div>
  );
}
