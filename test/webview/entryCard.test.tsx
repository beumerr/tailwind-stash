// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { EntryCard } from '../../src/webview/views/panel/EntryCard/EntryCard';
import type { ClassEntry } from '../../src/webview/types';

const entry: ClassEntry = {
  element: 'div',
  line: 10,
  classes: ['flex', 'items-center', 'gap-2', 'p-4'],
};

afterEach(cleanup);

describe('EntryCard', () => {
  it('renders element name, line number, and class count', () => {
    const { container } = render(
      <EntryCard entry={entry} isActive={false} onUpdateClasses={() => {}} onGoToRange={() => {}} onSelect={() => {}} />
    );
    expect(container.querySelector('.entry-card__element')!.textContent).toBe('div');
    expect(container.querySelector('.entry-card__line')!.textContent).toBe('L10');
    expect(container.querySelector('.entry-card__count')!.textContent).toBe('4 classes');
  });

  it('applies active class when isActive is true', () => {
    const { container } = render(
      <EntryCard entry={entry} isActive={true} onUpdateClasses={() => {}} onGoToRange={() => {}} onSelect={() => {}} />
    );
    expect(container.querySelector('.entry-card')!.classList.contains('active')).toBe(true);
  });

  it('does not apply active class when isActive is false', () => {
    const { container } = render(
      <EntryCard entry={entry} isActive={false} onUpdateClasses={() => {}} onGoToRange={() => {}} onSelect={() => {}} />
    );
    expect(container.querySelector('.entry-card')!.classList.contains('active')).toBe(false);
  });

  it('calls onGoToRange when header is clicked', () => {
    const onGoToRange = vi.fn();
    const { container } = render(
      <EntryCard entry={entry} isActive={false} onUpdateClasses={() => {}} onGoToRange={onGoToRange} onSelect={() => {}} />
    );
    container.querySelector('.entry-card__header')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(onGoToRange).toHaveBeenCalledOnce();
  });

  it('calls onSelect when textarea is focused', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <EntryCard entry={entry} isActive={false} onUpdateClasses={() => {}} onGoToRange={() => {}} onSelect={onSelect} />
    );
    container.querySelector('textarea')!.dispatchEvent(
      new FocusEvent('focus', { bubbles: true })
    );
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('scrolls into view when becoming active', () => {
    const scrollIntoView = vi.fn();
    const { container } = render(
      <EntryCard entry={entry} isActive={false} onUpdateClasses={() => {}} onGoToRange={() => {}} onSelect={() => {}} />
    );
    const card = container.querySelector('.entry-card')!;
    card.scrollIntoView = scrollIntoView;

    // Re-render with isActive=true
    render(
      <EntryCard entry={entry} isActive={true} onUpdateClasses={() => {}} onGoToRange={() => {}} onSelect={() => {}} />,
      { container }
    );

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('renders a ClassEditor with the entry classes', () => {
    const { container } = render(
      <EntryCard entry={entry} isActive={false} onUpdateClasses={() => {}} onGoToRange={() => {}} onSelect={() => {}} />
    );
    const textarea = container.querySelector('textarea')!;
    expect(textarea.value).toBe('flex\nitems-center\ngap-2\np-4');
  });
});
