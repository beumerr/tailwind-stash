declare function acquireVsCodeApi(): {
  getState(): unknown
  postMessage(message: unknown): void
  setState(state: unknown): void
}

declare module "*.scss" {
  const content: string
  export default content
}
