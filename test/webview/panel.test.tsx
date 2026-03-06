// @vitest-environment happy-dom
/// <reference path="../../src/webview/global.d.ts" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/preact';
import { Panel } from '../../src/webview/views/panel/Panel';
import type { ClassEntry } from '../../src/webview/types';

function createVscodeApi() {
  return {
    postMessage: vi.fn(),
    getState: vi.fn(),
    setState: vi.fn(),
  } as ReturnType<typeof acquireVsCodeApi>;
}

function postWindowMessage(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data }));
  });
}

const sampleEntries: ClassEntry[] = [
  { element: 'div', line: 5, classes: ['flex', 'items-center', 'p-4'] },
  { element: 'button', line: 12, classes: ['bg-blue-500', 'text-white', 'rounded'] },
];

afterEach(cleanup);

describe('Panel', () => {
  it('shows empty state when no entries', () => {
    const vscode = createVscodeApi();
    const { container } = render(<Panel vscode={vscode} />);
    expect(container.querySelector('.empty-state')).toBeTruthy();
    expect(container.textContent).toContain('No Tailwind classes detected');
  });

  it('renders entry cards after receiving update message', () => {
    const vscode = createVscodeApi();
    const { container } = render(<Panel vscode={vscode} />);

    postWindowMessage({ type: 'update', entries: sampleEntries, activeIndex: 0 });

    const cards = container.querySelectorAll('.entry-card');
    expect(cards).toHaveLength(2);
  });

  it('displays element name and line number', () => {
    const vscode = createVscodeApi();
    const { container } = render(<Panel vscode={vscode} />);

    postWindowMessage({ type: 'update', entries: sampleEntries, activeIndex: -1 });

    expect(container.textContent).toContain('div');
    expect(container.textContent).toContain('L5');
    expect(container.textContent).toContain('button');
    expect(container.textContent).toContain('L12');
  });

  it('marks the active entry card', () => {
    const vscode = createVscodeApi();
    const { container } = render(<Panel vscode={vscode} />);

    postWindowMessage({ type: 'update', entries: sampleEntries, activeIndex: 1 });

    const cards = container.querySelectorAll('.entry-card');
    expect(cards[0].classList.contains('active')).toBe(false);
    expect(cards[1].classList.contains('active')).toBe(true);
  });

  it('updates active index on setActive message', () => {
    const vscode = createVscodeApi();
    const { container } = render(<Panel vscode={vscode} />);

    postWindowMessage({ type: 'update', entries: sampleEntries, activeIndex: 0 });
    postWindowMessage({ type: 'setActive', index: 1 });

    const cards = container.querySelectorAll('.entry-card');
    expect(cards[0].classList.contains('active')).toBe(false);
    expect(cards[1].classList.contains('active')).toBe(true);
  });

  it('switches active card when textarea is focused', () => {
    const vscode = createVscodeApi();
    const { container } = render(<Panel vscode={vscode} />);

    postWindowMessage({ type: 'update', entries: sampleEntries, activeIndex: 0 });

    act(() => {
      container.querySelectorAll('textarea')[1].dispatchEvent(
        new FocusEvent('focus', { bubbles: true })
      );
    });

    const cards = container.querySelectorAll('.entry-card');
    expect(cards[0].classList.contains('active')).toBe(false);
    expect(cards[1].classList.contains('active')).toBe(true);
  });

  it('ignores setActive messages while panel has focus', () => {
    const vscode = createVscodeApi();
    const { container } = render(<Panel vscode={vscode} />);

    postWindowMessage({ type: 'update', entries: sampleEntries, activeIndex: 0 });

    // Simulate panel gaining focus
    act(() => {
      document.dispatchEvent(new FocusEvent('focusin'));
    });

    // Extension tries to set active to 0, but panel has focus on card 1
    act(() => {
      container.querySelectorAll('textarea')[1].dispatchEvent(
        new FocusEvent('focus', { bubbles: true })
      );
    });
    postWindowMessage({ type: 'setActive', index: 0 });

    const cards = container.querySelectorAll('.entry-card');
    expect(cards[1].classList.contains('active')).toBe(true);
  });

  it('sends goToRange message when header is clicked', () => {
    const vscode = createVscodeApi();
    const { container } = render(<Panel vscode={vscode} />);

    postWindowMessage({ type: 'update', entries: sampleEntries, activeIndex: -1 });

    const header = container.querySelector('.entry-card__header')!;
    header.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(vscode.postMessage).toHaveBeenCalledWith({ type: 'goToRange', index: 0 });
  });

  it('displays class count for each entry', () => {
    const vscode = createVscodeApi();
    const { container } = render(<Panel vscode={vscode} />);

    postWindowMessage({ type: 'update', entries: sampleEntries, activeIndex: -1 });

    const counts = container.querySelectorAll('.entry-card__count');
    expect(counts[0].textContent).toBe('3 classes');
    expect(counts[1].textContent).toBe('3 classes');
  });

  it('returns to empty state when entries are cleared', () => {
    const vscode = createVscodeApi();
    const { container } = render(<Panel vscode={vscode} />);

    postWindowMessage({ type: 'update', entries: sampleEntries, activeIndex: 0 });
    expect(container.querySelectorAll('.entry-card')).toHaveLength(2);

    postWindowMessage({ type: 'update', entries: [], activeIndex: -1 });
    expect(container.querySelector('.empty-state')).toBeTruthy();
  });
});
