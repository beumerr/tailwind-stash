import { vi } from "vitest"

// Mock acquireVsCodeApi globally for webview tests
;(globalThis as unknown as Record<string, unknown>).acquireVsCodeApi = vi.fn(() => ({
  getState: vi.fn(),
  postMessage: vi.fn(),
  setState: vi.fn(),
}))
