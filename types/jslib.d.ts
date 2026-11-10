// k6 resolves these over the network at run time; TypeScript needs the shapes.
// https://grafana.com/docs/k6/latest/javascript-api/jslib/

declare module "https://jslib.k6.io/k6-utils/1.2.0/index.js" {
  export function randomIntBetween(min: number, max: number): number
  export function randomItem<T>(items: readonly T[]): T
  export function randomString(length: number, charset?: string): string
  export function uuidv4(): string
  export function findBetween(
    content: string,
    left: string,
    right: string,
    repeat?: boolean,
  ): string | string[] | null
}

declare module "https://jslib.k6.io/url/1.0.0/index.js" {
  export class URL {
    constructor(url: string, base?: string)
    toString(): string
    searchParams: URLSearchParams
  }
  export class URLSearchParams {
    constructor(init?: Record<string, unknown> | string)
    append(name: string, value: string): void
    toString(): string
  }
}

declare module "https://jslib.k6.io/formdata/0.0.2/index.js" {
  export class FormData {
    append(name: string, value: unknown, filename?: string): void
    body(): ArrayBuffer
    boundary: string
  }
}
