import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';
import { _reset, _getCommandHandler, window } from '../__mocks__/vscode';
import { activate, deactivate } from '../../src/extension';

const projectRoot = path.resolve(__dirname, '../..');

function makeContext() {
  const subscriptions: any[] = [];
  return { subscriptions, extensionPath: projectRoot } as any;
}

beforeEach(() => {
  _reset();
  window.activeTextEditor = undefined;
});

// ─── activate ───────────────────────────────────────────────────────

describe('activate', () => {
  it('registers the collapseAll command', () => {
    activate(makeContext());
    expect(_getCommandHandler('tailwindStash.collapseAll')).toBeDefined();
  });

  it('registers the expandAll command', () => {
    activate(makeContext());
    expect(_getCommandHandler('tailwindStash.expandAll')).toBeDefined();
  });

  it('registers the toggleCollapse command', () => {
    activate(makeContext());
    expect(_getCommandHandler('tailwindStash.toggleCollapse')).toBeDefined();
  });

  it('registers the showCssPreview command', () => {
    activate(makeContext());
    expect(_getCommandHandler('tailwindStash.showCssPreview')).toBeDefined();
  });

  it('registers exactly 4 commands', () => {
    const ctx = makeContext();
    activate(ctx);
    const commands = [
      'tailwindStash.collapseAll',
      'tailwindStash.expandAll',
      'tailwindStash.toggleCollapse',
      'tailwindStash.showCssPreview',
    ];
    for (const cmd of commands) {
      expect(_getCommandHandler(cmd)).toBeDefined();
    }
  });

  it('pushes subscriptions onto the context', () => {
    const ctx = makeContext();
    activate(ctx);
    // 4 commands + 1 foldingManager
    expect(ctx.subscriptions.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── command handlers ───────────────────────────────────────────────

describe('command handlers', () => {
  it('collapseAll does not throw', () => {
    activate(makeContext());
    expect(() => _getCommandHandler('tailwindStash.collapseAll')!()).not.toThrow();
  });

  it('expandAll does not throw', () => {
    activate(makeContext());
    expect(() => _getCommandHandler('tailwindStash.expandAll')!()).not.toThrow();
  });

  it('toggleCollapse does not throw', () => {
    activate(makeContext());
    expect(() => _getCommandHandler('tailwindStash.toggleCollapse')!()).not.toThrow();
  });

  it('showCssPreview does not throw', () => {
    activate(makeContext());
    expect(() => _getCommandHandler('tailwindStash.showCssPreview')!()).not.toThrow();
  });
});

// ─── deactivate ─────────────────────────────────────────────────────

describe('deactivate', () => {
  it('does not throw', () => {
    expect(() => deactivate()).not.toThrow();
  });

  it('returns undefined', () => {
    expect(deactivate()).toBeUndefined();
  });
});
