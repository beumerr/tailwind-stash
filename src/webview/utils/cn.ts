export function cn(...args: Array<false | null | string | undefined>): string {
  return args.filter(Boolean).join(" ")
}
