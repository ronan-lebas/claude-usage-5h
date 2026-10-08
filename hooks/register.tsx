import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { Window5h } from '../types'

const win = atom({ plugin: 'usage-5h', key: 'window' } as const, null)
const tick = atom({ plugin: 'usage-5h', key: 'tick' } as const, 0)

const pick = (limits: readonly SessionRateLimit[]): Window5h | null => {
  const w = limits.find(l => l.kind === 'five_hour')
  return w ? { percentUsed: w.percentUsed, resetsAt: w.resetsAt } : null
}

const label = (w: Window5h, now: number): string => {
  const pct = `${Math.round(w.percentUsed)}%`
  if (!w.resetsAt) return pct
  const mins = Math.max(0, Math.ceil((Date.parse(w.resetsAt) - now) / 60000))
  return `${pct} | ${Math.floor(mins / 60)}h ${mins % 60}min`
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    const { rateLimits } = await $.session.usage()
    await update($, win, () => pick(rateLimits))
    $.clock.every(30_000, () => update($, tick, n => n + 1))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await update($, win, () => pick(e.rateLimits))
    return next(e)
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    await read($, tick)
    const w = await read($, win)
    if (!w) return next(e)
    return next({ ...e, props: { ...e.props, modes: [label(w, await $.clock.now()), ...(e.props.modes ?? [])] } })
  })
}
