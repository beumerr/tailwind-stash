export function cn(...args: (false | null | string | undefined)[]): string {
  return args.filter(Boolean).join(" ")
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): { cancel: () => void; fn: (...args: Parameters<T>) => void } {
  let timeout: ReturnType<typeof setTimeout>
  return {
    cancel: () => clearTimeout(timeout),
    fn: (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => fn(...args), ms)
    },
  }
}

export function escapeRegex(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}
