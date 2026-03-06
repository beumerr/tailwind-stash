import { vi } from 'vitest';

// Mock acquireVsCodeApi globally for webview tests
(globalThis as any).acquireVsCodeApi = vi.fn(() => ({
  postMessage: vi.fn(),
  getState: vi.fn(),
  setState: vi.fn(),
}));
