import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { money, moneyCompact, monthLabel, num, pct, shortDate } from '../utils/format'

/**
 * Gráficas SVG ligeras (sin dependencias, mismo enfoque que HOTEL): se dibujan al ancho real del contenedor, usan la
 * paleta corporativa y funcionan en modo oscuro. Solo pintan datos reales que manda el backend.
 */
export const PALETTE = ['rgb(var(--brand-500))', 'rgb(var(--accent-500))', '#f59e0b', '#f43f5e', '#0ea5e9', '#a855f7', '#22c55e', '#64748b']

function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return undefined
    setW(ref.current.clientWidth)
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

export function fmt(v, format) {
  if (v === null || v === undefined) return '—'
  if (format === 'money') return money(v)
  if (format === 'percent') return pct(v)
  return num(v)
}
const axisFmt = (v, format) => (format === 'money' ? moneyCompact(v) : format === 'percent' ? `${num(v)}%` : num(v))
const labelFmt = (l) => (/^\d{4}-\d{2}$/.test(l) ? monthLabel(l) : /^\d{4}-\d{2}-\d{2}$/.test(l) ? shortDate(l) : l)

function niceScale(min, max) {
  const lo = Math.min(0, min)
  const hi = Math.max(0, max)
  if (hi === lo) return { lo: 0, hi: 1, ticks: [0, 1] }
  const raw = (hi - lo) / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks = []
  for (let t = start; t <= end + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6)
  return { lo: start, hi: end, ticks }
}

/** Barras agrupadas o apiladas, o líneas con área. points: [{label, values: []}] */
export function Chart({ points = [], series = [], kind = 'bar', format = 'number', height = 240, stacked = false, colors = PALETTE, empty = 'Sin datos en el periodo' }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const uid = useId().replace(/:/g, '')
  const vals = points.map((p) => (p.values || []).map((v) => Number(v) || 0))
  const max = stacked ? Math.max(0, ...vals.map((v) => v.reduce((a, b) => a + Math.max(0, b), 0))) : Math.max(0, ...vals.flat())
  const min = Math.min(0, ...vals.flat())
  const scale = useMemo(() => niceScale(min, max), [min, max])
  const allZero = vals.flat().every((v) => !v)
  const padL = 52
  const padB = 26
  const padT = 12
  const w = Math.max(0, width - padL - 6)
  const h = height - padB - padT
  const y = (v) => padT + h - ((v - scale.lo) / (scale.hi - scale.lo || 1)) * h
  const band = points.length ? w / points.length : 0
  const every = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(w / 58))))
  const x = (i) => padL + band * i + band / 2

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && points.length > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.join(', ')} onMouseLeave={() => setHover(null)}>
          <defs>
            {series.map((_, j) => (
              <linearGradient key={j} id={`g-${uid}-${j}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={colors[j % colors.length]} stopOpacity="0.32" />
                <stop offset="100%" stopColor={colors[j % colors.length]} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {scale.ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width} y1={y(t)} y2={y(t)} className={t === 0 ? 'stroke-slate-300 dark:stroke-white/20' : 'stroke-slate-100 dark:stroke-white/[.06]'} strokeDasharray={t === 0 ? '' : '3 4'} />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[10px] tabular">{axisFmt(t, format)}</text>
            </g>
          ))}
          {points.map((p, i) => i % every === 0 && (
            <text key={`l${i}`} x={x(i)} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">{labelFmt(p.label).slice(0, 12)}</text>
          ))}
          {hover !== null && <rect x={padL + band * hover} y={padT} width={band} height={h} className="fill-slate-100 dark:fill-white/[.04]" rx="6" />}
          {kind === 'line' ? series.map((_, j) => {
            const c = points.map((p, i) => [x(i), y(Number(p.values[j]) || 0)])
            const d = c.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ')
            const area = `${d} L${c[c.length - 1][0].toFixed(1)},${y(Math.max(scale.lo, 0))} L${c[0][0].toFixed(1)},${y(Math.max(scale.lo, 0))} Z`
            return (
              <g key={j}>
                {j === 0 && <path d={area} fill={`url(#g-${uid}-${j})`} />}
                <path d={d} fill="none" stroke={colors[j % colors.length]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {points.length <= 40 && c.map(([a, b], i) => <circle key={i} cx={a} cy={b} r={hover === i ? 4.5 : 3} fill={colors[j % colors.length]} className="stroke-white dark:stroke-ink-900" strokeWidth="2" />)}
              </g>
            )
          }) : points.map((p, i) => {
            const gap = Math.min(14, band * 0.28)
            if (stacked) {
              let acc = 0
              return p.values.map((v, j) => {
                const val = Math.max(0, Number(v) || 0)
                const top = y(acc + val)
                const bottom = y(acc)
                acc += val
                return <rect key={`${i}-${j}`} x={padL + band * i + gap / 2} y={top} width={Math.max(1, band - gap)} height={Math.max(0, bottom - top)} rx={j === p.values.length - 1 ? 4 : 0} fill={colors[j % colors.length]} />
              })
            }
            const bw = Math.max(1, (band - gap) / p.values.length)
            return p.values.map((v, j) => {
              const n = Number(v) || 0
              const top = y(Math.max(0, n))
              const bottom = y(Math.min(0, n))
              return <rect key={`${i}-${j}`} x={padL + band * i + gap / 2 + bw * j} y={top} width={Math.max(1, bw - (p.values.length > 1 ? 2 : 0))} height={Math.max(n ? 1.5 : 0, bottom - top)} rx={Math.min(5, bw / 3)} fill={colors[j % colors.length]} opacity={hover !== null && hover !== i ? 0.45 : 1} />
            })
          })}
          {points.map((p, i) => <rect key={`h${i}`} x={padL + band * i} y={padT} width={band} height={h} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />)}
        </svg>
      )}
      {(points.length === 0 || allZero) && <p className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-slate-400">{empty}</p>}
      {hover !== null && points[hover] && (
        <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl bg-ink-900/95 px-3 py-2 text-xs text-white shadow-xl ring-1 ring-white/10 backdrop-blur"
          style={{ left: Math.min(Math.max(x(hover), 90), Math.max(90, width - 90)) }}>
          <p className="mb-1 font-semibold">{labelFmt(points[hover].label)}</p>
          {series.map((s, j) => (
            <p key={s} className="flex items-center gap-2 whitespace-nowrap tabular"><span className="h-2 w-2 rounded-full" style={{ background: colors[j % colors.length] }} />{s}: <b>{fmt(points[hover].values[j], format)}</b></p>
          ))}
        </div>
      )}
    </div>
  )
}

export function Legend({ series, colors = PALETTE }) {
  if (!series || series.length < 2) return null
  return (
    <div className="flex flex-wrap gap-4 text-xs muted">
      {series.map((s, j) => <span key={s} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[j % colors.length] }} />{s}</span>)}
    </div>
  )
}

/** Barras horizontales por categoría: [{label, value, color?}] */
export function HBars({ data = [], format = 'number', empty = 'Sin datos', max: forcedMax, onSelect }) {
  const max = forcedMax || Math.max(1, ...data.map((d) => Math.abs(Number(d.value) || 0)))
  if (!data.length || data.every((d) => !Number(d.value))) return <p className="py-8 text-center text-xs text-slate-400">{empty}</p>
  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => {
        const v = Number(d.value) || 0
        return (
          <li key={d.label} className={onSelect ? 'cursor-pointer' : ''} onClick={() => onSelect?.(d)}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 truncate"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color || PALETTE[i % PALETTE.length] }} />{d.label}</span>
              <span className="shrink-0 font-semibold tabular">{fmt(v, format)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max((Math.abs(v) / max) * 100, v ? 2 : 0)}%`, background: d.color || PALETTE[i % PALETTE.length] }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Dona segmentada: [{label, value, color}] */
export function Donut({ data = [], size = 168, thickness = 22, center, sub, format = 'number' }) {
  const total = data.reduce((a, d) => a + (Number(d.value) || 0), 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const [hover, setHover] = useState(null)
  return (
    <div className="flex flex-col items-center gap-5 2xl:flex-row 2xl:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-slate-100 dark:stroke-white/[.06]" />
          {total > 0 && data.map((d, i) => {
            const len = ((Number(d.value) || 0) / total) * c
            const el = <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color || PALETTE[i % PALETTE.length]} strokeWidth={hover === i ? thickness + 4 : thickness}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="transition-all" />
            offset += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="font-display text-2xl font-extrabold tabular">{hover !== null ? fmt(data[hover].value, format) : center ?? fmt(total, format)}</span>
          <span className="text-[11px] muted">{hover !== null ? data[hover].label : sub}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-sm" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="flex min-w-0 items-center gap-2 truncate"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color || PALETTE[i % PALETTE.length] }} />{d.label}</span>
            <span className="shrink-0 tabular"><b>{fmt(d.value, format)}</b> <span className="text-xs muted">{total ? `${Math.round((Number(d.value) / total) * 100)}%` : ''}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Sparkline({ values = [], color = 'rgb(var(--brand-500))', height = 36 }) {
  const [ref, width] = useWidth()
  const uid = useId().replace(/:/g, '')
  const nums = values.map((v) => Number(v) || 0)
  const max = Math.max(...nums, 0)
  const min = Math.min(...nums, 0)
  const pts = nums.map((v, i) => [nums.length > 1 ? (i / (nums.length - 1)) * width : 0, height - 3 - ((v - min) / (max - min || 1)) * (height - 6)])
  const d = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ')
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width > 0 && nums.length > 1 && (
        <svg width={width} height={height}>
          <defs><linearGradient id={`s-${uid}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".3" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
          <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#s-${uid})`} />
          <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

/** Embudo comercial: [{label, value}] */
export function Funnel({ data = [], format = 'number' }) {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0))
  return (
    <ul className="space-y-1.5">
      {data.map((d, i) => {
        const w = Math.max(8, ((Number(d.value) || 0) / max) * 100)
        return (
          <li key={d.label} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-xs font-medium muted">{d.label}</span>
            <div className="flex-1">
              <div className="flex h-7 items-center justify-end rounded-lg px-2 text-[11px] font-bold text-white transition-[width] duration-700"
                style={{ width: `${w}%`, background: `linear-gradient(90deg, rgb(var(--brand-${Math.min(9, 4 + Math.floor(i / 2))}00)), rgb(var(--brand-${Math.min(9, 5 + Math.floor(i / 2))}00)))` }}>
                {fmt(d.value, format)}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

