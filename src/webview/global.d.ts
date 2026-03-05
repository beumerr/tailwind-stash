declare function acquireVsCodeApi(): {
  getState(): unknown
  postMessage(message: unknown): void
  setState(state: unknown): void
}
