/**
 * Ambient declarations for the manual-testing sandbox.
 *
 * The sandbox files are fixtures: their job is to be *read* by the class
 * detector, so the source text has to stay exactly as an author would write
 * it. Declaring the class-name helpers here keeps the editor quiet without
 * editing the fixtures or adding real dependencies for code that never runs.
 */

declare module "some-lib" {
  export function cn(...args: unknown[]): string
}

declare function clsx(...args: unknown[]): string
declare function cva(...args: unknown[]): string
declare function cx(...args: unknown[]): string
declare function twJoin(...args: unknown[]): string
declare function twMerge(...args: unknown[]): string
declare function classNames(...args: unknown[]): string
