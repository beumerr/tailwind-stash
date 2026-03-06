import { describe, it, expect } from 'vitest';
import { findActiveIndex } from '../src/core/cssPreviewPanel';

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
    expect(findActiveIndex(5, ranges)).toBe(0);
  });

  it('returns the nearest range when cursor is closer to a later range', () => {
    const ranges = [makeRange(2, 3), makeRange(10, 12)];
    expect(findActiveIndex(9, ranges)).toBe(1);
  });

  it('returns the containing range even if another is closer by line number', () => {
    const ranges = [makeRange(1, 1), makeRange(3, 7), makeRange(9, 9)];
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
    const result = findActiveIndex(5, ranges);
    expect(result).toBe(0);
  });

  it('handles single-line ranges', () => {
    const ranges = [makeRange(5, 5)];
    expect(findActiveIndex(5, ranges)).toBe(0);
    expect(findActiveIndex(3, ranges)).toBe(0);
  });

  it('handles many ranges and finds the right one', () => {
    const ranges = Array.from({ length: 20 }, (_, i) => makeRange(i * 5, i * 5 + 1));
    expect(findActiveIndex(50, ranges)).toBe(10);
  });

  it('handles cursor between two adjacent ranges', () => {
    const ranges = [makeRange(1, 2), makeRange(4, 5)];
    const result = findActiveIndex(3, ranges);
    expect(result).toBe(0);
  });
});
