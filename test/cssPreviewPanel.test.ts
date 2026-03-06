import { describe, it, expect } from 'vitest';
import { escapeHtml, findActiveIndex } from '../src/cssPreviewPanel';

// ─── escapeHtml ─────────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than signs', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes greater-than signs', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('class="foo"')).toBe('class=&quot;foo&quot;');
  });

  it('escapes all special characters together', () => {
    expect(escapeHtml('<a href="x&y">')).toBe('&lt;a href=&quot;x&amp;y&quot;&gt;');
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('flex items-center p-4')).toBe('flex items-center p-4');
  });

  it('handles multiple ampersands', () => {
    expect(escapeHtml('a && b && c')).toBe('a &amp;&amp; b &amp;&amp; c');
  });

  it('handles single quotes (not escaped)', () => {
    expect(escapeHtml("it's")).toBe("it's");
  });

  it('handles Tailwind classes with special chars like brackets', () => {
    expect(escapeHtml('w-[100px]')).toBe('w-[100px]');
  });

  it('handles element names like cn()', () => {
    expect(escapeHtml('cn()')).toBe('cn()');
  });

  it('handles HTML-like content in class names', () => {
    expect(escapeHtml('<MyComponent>')).toBe('&lt;MyComponent&gt;');
  });
});

// ─── findActiveIndex ────────────────────────────────────────────────

function makeRange(startLine: number, endLine: number) {
  return {
    range: {
      start: { line: startLine },
      end: { line: endLine },
    },
  };
}

describe('findActiveIndex', () => {
  it('returns -1 for empty ranges', () => {
    expect(findActiveIndex(5, [])).toBe(-1);
  });

  it('returns 0 when cursor is inside the only range', () => {
    const ranges = [makeRange(3, 5)];
    expect(findActiveIndex(4, ranges)).toBe(0);
  });

  it('returns 0 when cursor is on the start line of the range', () => {
    const ranges = [makeRange(3, 5)];
    expect(findActiveIndex(3, ranges)).toBe(0);
  });

  it('returns 0 when cursor is on the end line of the range', () => {
    const ranges = [makeRange(3, 5)];
    expect(findActiveIndex(5, ranges)).toBe(0);
  });

  it('returns the nearest range when cursor is outside all ranges', () => {
    const ranges = [makeRange(2, 3), makeRange(10, 12)];
    // Cursor at line 5 — closer to range 0 (dist 2) than range 1 (dist 5)
    expect(findActiveIndex(5, ranges)).toBe(0);
  });

  it('returns the nearest range when cursor is closer to a later range', () => {
    const ranges = [makeRange(2, 3), makeRange(10, 12)];
    // Cursor at line 9 — closer to range 1 (dist 1) than range 0 (dist 6)
    expect(findActiveIndex(9, ranges)).toBe(1);
  });

  it('returns the containing range even if another is closer by line number', () => {
    const ranges = [makeRange(1, 1), makeRange(3, 7), makeRange(9, 9)];
    // Cursor at line 5, inside range 1
    expect(findActiveIndex(5, ranges)).toBe(1);
  });

  it('returns first range when cursor is before all ranges', () => {
    const ranges = [makeRange(5, 6), makeRange(10, 12)];
    expect(findActiveIndex(0, ranges)).toBe(0);
  });

  it('returns last range when cursor is after all ranges', () => {
    const ranges = [makeRange(5, 6), makeRange(10, 12)];
    expect(findActiveIndex(100, ranges)).toBe(1);
  });

  it('picks the closer range when cursor is equidistant between two', () => {
    const ranges = [makeRange(2, 2), makeRange(8, 8)];
    // Cursor at line 5 — dist 3 to both; should return the first one found
    const result = findActiveIndex(5, ranges);
    expect(result).toBe(0); // first match wins on ties
  });

  it('handles single-line ranges', () => {
    const ranges = [makeRange(5, 5)];
    expect(findActiveIndex(5, ranges)).toBe(0);
    expect(findActiveIndex(3, ranges)).toBe(0);
  });

  it('handles many ranges and finds the right one', () => {
    const ranges = Array.from({ length: 20 }, (_, i) => makeRange(i * 5, i * 5 + 1));
    // Cursor at line 52 — inside range at index 10 (lines 50-51)
    expect(findActiveIndex(50, ranges)).toBe(10);
  });

  it('handles cursor between two adjacent ranges', () => {
    const ranges = [makeRange(1, 2), makeRange(4, 5)];
    // Cursor at line 3 — equidistant (dist 1 from both)
    const result = findActiveIndex(3, ranges);
    expect(result).toBe(0); // first match wins on ties
  });
});
