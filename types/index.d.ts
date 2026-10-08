export type Window5h = { percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'usage-5h': { window: Window5h | null; tick: number }
  }
}
