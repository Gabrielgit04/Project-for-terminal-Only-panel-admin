declare module "cloudflare:workers" {
  export interface TraceSpan {
    end(): void;
    async<T>(fn: () => Promise<T>): Promise<T>;
    setAttribute(key: string, value: string | number | boolean): void;
    setAttributes(attrs: Record<string, string | number | boolean>): void;
  }

  export interface RequestContext {
    traces: {
      newSpan(name: string): TraceSpan;
    };
  }

  export function getRequestContext(): RequestContext;
}
