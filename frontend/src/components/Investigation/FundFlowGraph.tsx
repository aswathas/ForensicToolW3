import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { FundFlow } from '../../types/forensics'

// ── Types ──────────────────────────────────────────────────────────────────

interface FundFlowGraphProps {
  flows: FundFlow[]
}

interface SankeyNode {
  id: string
  label: string          // truncated address
  fullAddress: string
  column: 'left' | 'right'
  totalFlow: number      // ETH total through this node
  x: number
  y: number
  height: number
  isAnomaly: boolean
}

interface SankeyLink {
  from: SankeyNode
  to: SankeyNode
  amount: number         // ETH parsed
  rawAmount: string
  asset: string
  txHash: string
  isAnomaly: boolean
  width: number          // stroke width in px
  // cubic bezier control points
  d: string
  // label position
  labelX: number
  labelY: number
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  content: {
    from: string
    to: string
    amount: string
    asset: string
    tx: string
    anomaly: boolean
  }
}

// ── Constants ─────────────────────────────────────────────────────────────

const COLORS = {
  bg:           '#020617',
  bgSecondary:  '#0f172a',
  bgTertiary:   '#1e293b',
  red:          '#dc143c',
  redDim:       'rgba(220,20,60,0.18)',
  redGlow:      'rgba(220,20,60,0.45)',
  redFlow:      'rgba(220,20,60,0.55)',
  skyFlow:      'rgba(56,189,248,0.40)',
  gold:         '#d4af37',
  goldDim:      'rgba(212,175,55,0.18)',
  goldFlow:     'rgba(212,175,55,0.50)',
  textPrimary:  '#f1f5f9',
  textSecondary:'#94a3b8',
  textMuted:    '#475569',
  borderDim:    '#1e293b',
  borderSubtle: '#334155',
  teal:         '#2dd4bf',
  tealFlow:     'rgba(45,212,191,0.40)',
}

const NODE_WIDTH      = 130   // px
const NODE_PADDING_Y  = 12    // gap between nodes
const MIN_NODE_H      = 28    // minimum node height
const MAX_NODE_H      = 56
const LEFT_X          = 20    // left column x origin
const MAX_LINK_WIDTH  = 18
const MIN_LINK_WIDTH  = 2

// ── Helpers ────────────────────────────────────────────────────────────────

function truncAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function parseEth(amount: string): number {
  const n = parseFloat(amount)
  return isNaN(n) ? 0 : n
}

function formatEth(eth: number): string {
  if (eth >= 1000) return `${(eth / 1000).toFixed(2)}k ETH`
  if (eth >= 1)    return `${eth.toFixed(3)} ETH`
  return `${eth.toFixed(6)} ETH`
}

// ── Layout engine ──────────────────────────────────────────────────────────

function buildLayout(
  flows: FundFlow[],
  svgW: number,
  svgH: number,
): { nodes: SankeyNode[]; links: SankeyLink[] } {
  if (flows.length === 0) return { nodes: [], links: [] }

  // Aggregate flows by address pair — deduplicate
  const edgeMap = new Map<string, { amount: number; rawAmount: string; asset: string; txHash: string; isAnomaly: boolean }>()
  flows.forEach(f => {
    const key = `${f.fromEntity}::${f.toEntity}`
    const existing = edgeMap.get(key)
    const amt = parseEth(f.amount)
    if (existing) {
      existing.amount += amt
      if (f.isAnomaly) existing.isAnomaly = true
    } else {
      edgeMap.set(key, {
        amount: amt,
        rawAmount: f.amount,
        asset: f.asset ?? 'ETH',
        txHash: f.transaction ?? '',
        isAnomaly: f.isAnomaly ?? false,
      })
    }
  })

  // Collect unique addresses and decide left vs right column
  // Heuristic: a node is "left" (source) if it appears as fromEntity more than toEntity
  const fromCount = new Map<string, number>()
  const toCount   = new Map<string, number>()
  const anomalyAddrs = new Set<string>()

  flows.forEach(f => {
    fromCount.set(f.fromEntity, (fromCount.get(f.fromEntity) ?? 0) + 1)
    toCount.set(f.toEntity,     (toCount.get(f.toEntity)     ?? 0) + 1)
    if (f.isAnomaly) {
      anomalyAddrs.add(f.fromEntity)
      anomalyAddrs.add(f.toEntity)
    }
  })

  // Determine total ETH flowing through each node
  const nodeFlow = new Map<string, number>()
  edgeMap.forEach((edge, key) => {
    const [from, to] = key.split('::')
    nodeFlow.set(from, (nodeFlow.get(from) ?? 0) + edge.amount)
    nodeFlow.set(to,   (nodeFlow.get(to)   ?? 0) + edge.amount)
  })

  // Assign columns
  const allAddresses = new Set<string>([...fromCount.keys(), ...toCount.keys()])
  const columnAssign = new Map<string, 'left' | 'right'>()
  allAddresses.forEach(addr => {
    const fc = fromCount.get(addr) ?? 0
    const tc = toCount.get(addr)   ?? 0
    // Pure sinks (only receive) → right. Pure sources (only send) → left.
    // Mixed → left if sends more, right if receives more
    columnAssign.set(addr, fc >= tc ? 'left' : 'right')
  })

  // Split + sort by total flow descending
  const leftAddrs  = [...allAddresses].filter(a => columnAssign.get(a) === 'left')
    .sort((a, b) => (nodeFlow.get(b) ?? 0) - (nodeFlow.get(a) ?? 0))
  const rightAddrs = [...allAddresses].filter(a => columnAssign.get(a) === 'right')
    .sort((a, b) => (nodeFlow.get(b) ?? 0) - (nodeFlow.get(a) ?? 0))

  // Map total ETH to node height
  const allFlows = [...nodeFlow.values()]
  const maxFlow  = Math.max(...allFlows, 1)

  function nodeHeight(flow: number): number {
    const ratio = flow / maxFlow
    return MIN_NODE_H + ratio * (MAX_NODE_H - MIN_NODE_H)
  }

  // Position left column
  const usableH = svgH - 16 // top + bottom padding
  const rightX  = svgW - NODE_WIDTH - 20

  function positionColumn(addrs: string[], colX: number): Map<string, SankeyNode> {
    const result = new Map<string, SankeyNode>()
    // Total height of all nodes + gaps
    const totalH = addrs.reduce((acc, a) => acc + nodeHeight(nodeFlow.get(a) ?? 0), 0)
      + Math.max(0, addrs.length - 1) * NODE_PADDING_Y
    const startY = Math.max(8, (usableH - totalH) / 2)

    let cy = startY
    addrs.forEach(addr => {
      const h = nodeHeight(nodeFlow.get(addr) ?? 0)
      result.set(addr, {
        id: addr,
        label: truncAddr(addr),
        fullAddress: addr,
        column: colX < svgW / 2 ? 'left' : 'right',
        totalFlow: nodeFlow.get(addr) ?? 0,
        x: colX,
        y: cy,
        height: h,
        isAnomaly: anomalyAddrs.has(addr),
      })
      cy += h + NODE_PADDING_Y
    })
    return result
  }

  const leftNodes  = positionColumn(leftAddrs,  LEFT_X)
  const rightNodes = positionColumn(rightAddrs, rightX)
  const nodeMap    = new Map<string, SankeyNode>([...leftNodes, ...rightNodes])

  // Track vertical offsets within nodes for multiple links
  const leftOffset  = new Map<string, number>()  // how many px already used from left node
  const rightOffset = new Map<string, number>()

  // Max link width based on max edge amount
  const edgeAmounts  = [...edgeMap.values()].map(e => e.amount)
  const maxEdgeAmt   = Math.max(...edgeAmounts, 1)

  function linkWidth(amount: number): number {
    const ratio = amount / maxEdgeAmt
    return MIN_LINK_WIDTH + ratio * (MAX_LINK_WIDTH - MIN_LINK_WIDTH)
  }

  // Build link paths
  const links: SankeyLink[] = []

  edgeMap.forEach((edge, key) => {
    const [fromAddr, toAddr] = key.split('::')
    const fromNode = nodeMap.get(fromAddr)
    const toNode   = nodeMap.get(toAddr)
    if (!fromNode || !toNode) return
    if (fromNode.column === toNode.column) return // skip same-column (shouldn't happen often)

    const w = linkWidth(edge.amount)

    // Source attachment point (right side of left node, or left side of right node)
    const fromOffY   = leftOffset.get(fromAddr) ?? 0
    const toOffY     = rightOffset.get(toAddr)  ?? 0

    const x1 = fromNode.x + NODE_WIDTH
    const y1 = fromNode.y + fromOffY + w / 2

    const x2 = toNode.x
    const y2 = toNode.y + toOffY + w / 2

    leftOffset.set(fromAddr,  fromOffY + w + 1)
    rightOffset.set(toAddr,   toOffY  + w + 1)

    // Cubic bezier — control points at 40% and 60% of horizontal span
    const dx = x2 - x1
    const cpX1 = x1 + dx * 0.45
    const cpX2 = x2 - dx * 0.45
    const d = `M ${x1} ${y1} C ${cpX1} ${y1}, ${cpX2} ${y2}, ${x2} ${y2}`

    links.push({
      from: fromNode,
      to: toNode,
      amount: edge.amount,
      rawAmount: edge.rawAmount,
      asset: edge.asset,
      txHash: edge.txHash,
      isAnomaly: edge.isAnomaly,
      width: w,
      d,
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2 - 4,
    })
  })

  const nodes = [...nodeMap.values()]
  return { nodes, links }
}

// ── Gradient defs ──────────────────────────────────────────────────────────

function SvgDefs() {
  return (
    <defs>
      {/* Normal cross-flow gradient: red → sky */}
      <linearGradient id="ffg-flow-normal" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor={COLORS.redFlow} />
        <stop offset="100%" stopColor={COLORS.skyFlow} />
      </linearGradient>

      {/* Anomaly flow gradient: bright red → gold */}
      <linearGradient id="ffg-flow-anomaly" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="rgba(220,20,60,0.85)" />
        <stop offset="100%" stopColor={COLORS.goldFlow} />
      </linearGradient>

      {/* Hover highlight */}
      <linearGradient id="ffg-flow-hover" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="rgba(220,20,60,1)" />
        <stop offset="100%" stopColor="rgba(56,189,248,0.9)" />
      </linearGradient>

      {/* Node fill — anomaly */}
      <linearGradient id="ffg-node-anomaly" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="rgba(220,20,60,0.25)" />
        <stop offset="100%" stopColor="rgba(220,20,60,0.05)" />
      </linearGradient>

      {/* Node fill — normal */}
      <linearGradient id="ffg-node-normal" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="rgba(56,189,248,0.12)" />
        <stop offset="100%" stopColor="rgba(56,189,248,0.03)" />
      </linearGradient>

      {/* Grid pattern */}
      <pattern id="ffg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(220,20,60,0.03)" strokeWidth="1" />
      </pattern>

      {/* Glow filter */}
      <filter id="ffg-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Red node glow */}
      <filter id="ffg-red-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feColorMatrix in="blur" type="matrix"
          values="1 0 0 0 0.86   0 0 0 0 0.08   0 0 0 0 0.15   0 0 0 0.6 0"
          result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Dash animation */}
      <style>{`
        @keyframes ffg-dash {
          from { stroke-dashoffset: 200; }
          to   { stroke-dashoffset: 0; }
        }
        .ffg-link-hover {
          animation: ffg-dash 0.8s linear infinite;
          stroke-dasharray: 12 6;
        }
        @keyframes ffg-pulse-node {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.7; }
        }
        .ffg-node-pulse {
          animation: ffg-pulse-node 2s ease-in-out infinite;
        }
      `}</style>
    </defs>
  )
}

// ── Node component ─────────────────────────────────────────────────────────

function NodeBox({
  node,
  hovered,
  onMouseEnter,
  onMouseLeave,
}: {
  node: SankeyNode
  hovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const isRight    = node.column === 'right'
  const fillId     = node.isAnomaly ? 'url(#ffg-node-anomaly)' : 'url(#ffg-node-normal)'
  const borderCol  = node.isAnomaly ? COLORS.red : (isRight ? '#38bdf8' : COLORS.borderSubtle)
  const labelColor = node.isAnomaly ? COLORS.red : COLORS.textSecondary
  const filterId   = node.isAnomaly ? 'url(#ffg-red-glow)' : undefined
  const glowOpacity = hovered ? 1 : (node.isAnomaly ? 0.6 : 0)

  // Connector dot — on right side for left nodes, left side for right nodes
  const dotX = isRight ? node.x : node.x + NODE_WIDTH
  const dotY = node.y + node.height / 2

  return (
    <g
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'default' }}
      filter={filterId}
    >
      {/* Outer glow rect (anomaly) */}
      {node.isAnomaly && (
        <rect
          x={node.x - 2}
          y={node.y - 2}
          width={NODE_WIDTH + 4}
          height={node.height + 4}
          rx={5}
          fill="none"
          stroke={COLORS.red}
          strokeWidth={1}
          opacity={glowOpacity}
          style={{ transition: 'opacity 0.2s' }}
        />
      )}

      {/* Main box */}
      <rect
        x={node.x}
        y={node.y}
        width={NODE_WIDTH}
        height={node.height}
        rx={3}
        fill={fillId}
        stroke={borderCol}
        strokeWidth={hovered ? 1.5 : 1}
        opacity={hovered ? 1 : 0.85}
        style={{ transition: 'all 0.15s' }}
      />

      {/* Left accent bar */}
      <rect
        x={isRight ? node.x + NODE_WIDTH - 2 : node.x}
        y={node.y + 2}
        width={2}
        height={node.height - 4}
        rx={1}
        fill={node.isAnomaly ? COLORS.red : (isRight ? '#38bdf8' : COLORS.borderSubtle)}
        opacity={0.8}
      />

      {/* Label: truncated address */}
      <text
        x={node.x + (isRight ? NODE_WIDTH - 8 : 8)}
        y={node.y + node.height / 2 - (node.height >= 40 ? 6 : 1)}
        textAnchor={isRight ? 'end' : 'start'}
        fill={labelColor}
        fontSize={10}
        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        fontWeight={node.isAnomaly ? 'bold' : 'normal'}
        style={{ transition: 'fill 0.15s' }}
      >
        {node.label}
      </text>

      {/* ETH amount label (if enough height) */}
      {node.height >= 40 && (
        <text
          x={node.x + (isRight ? NODE_WIDTH - 8 : 8)}
          y={node.y + node.height / 2 + 8}
          textAnchor={isRight ? 'end' : 'start'}
          fill={COLORS.textMuted}
          fontSize={8.5}
          fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        >
          {formatEth(node.totalFlow)}
        </text>
      )}

      {/* Connector dot */}
      <circle
        cx={dotX}
        cy={dotY}
        r={2.5}
        fill={node.isAnomaly ? COLORS.red : '#38bdf8'}
        opacity={0.7}
        className={node.isAnomaly ? 'ffg-node-pulse' : ''}
      />
    </g>
  )
}

// ── Link component ─────────────────────────────────────────────────────────

function FlowLink({
  link,
  hovered,
  dimmed,
  onMouseEnter,
  onMouseLeave,
}: {
  link: SankeyLink
  hovered: boolean
  dimmed: boolean
  onMouseEnter: (e: React.MouseEvent<SVGPathElement>) => void
  onMouseLeave: () => void
}) {
  const gradId = hovered
    ? 'url(#ffg-flow-hover)'
    : link.isAnomaly
      ? 'url(#ffg-flow-anomaly)'
      : 'url(#ffg-flow-normal)'

  const baseOpacity = dimmed ? 0.08 : (link.isAnomaly ? 0.75 : 0.55)
  const opacity     = hovered ? 1 : baseOpacity

  return (
    <g>
      {/* Shadow path for hit-area */}
      <path
        d={link.d}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(link.width + 8, 16)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'crosshair' }}
      />

      {/* Visible flow path */}
      <path
        d={link.d}
        fill="none"
        stroke={gradId}
        strokeWidth={link.width}
        strokeLinecap="round"
        opacity={opacity}
        filter={hovered ? 'url(#ffg-glow)' : undefined}
        className={hovered ? 'ffg-link-hover' : undefined}
        style={{ transition: 'opacity 0.2s, stroke-width 0.15s' }}
        pointerEvents="none"
      />

      {/* Amount label (shown when hovered or if link is wide enough) */}
      {(hovered || link.width >= 8) && (
        <text
          x={link.labelX}
          y={link.labelY}
          textAnchor="middle"
          fill={link.isAnomaly ? '#ff6b6b' : COLORS.textSecondary}
          fontSize={8.5}
          fontFamily="'JetBrains Mono', monospace"
          opacity={hovered ? 1 : 0.6}
          pointerEvents="none"
          style={{
            paintOrder: 'stroke',
            stroke: COLORS.bg,
            strokeWidth: 3,
          }}
        >
          {formatEth(link.amount)}
        </text>
      )}
    </g>
  )
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function Tooltip({ state }: { state: TooltipState }) {
  if (!state.visible) return null

  const W = 220
  const H = 120

  return (
    <div
      style={{
        position: 'absolute',
        left: state.x + 12,
        top: state.y - 12,
        width: W,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <div style={{
        background: 'rgba(15,23,42,0.97)',
        border: `1px solid ${state.content.anomaly ? COLORS.red : COLORS.borderSubtle}`,
        borderRadius: 4,
        padding: '10px 12px',
        boxShadow: state.content.anomaly
          ? '0 0 16px rgba(220,20,60,0.3), 0 4px 24px rgba(0,0,0,0.6)'
          : '0 4px 24px rgba(0,0,0,0.5)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        lineHeight: 1.7,
        color: COLORS.textSecondary,
        minHeight: H,
      }}>
        {state.content.anomaly && (
          <div style={{
            color: COLORS.red,
            fontSize: 9,
            fontWeight: 'bold',
            marginBottom: 6,
            letterSpacing: '0.08em',
          }}>
            ⚠ ANOMALOUS FLOW
          </div>
        )}
        <div style={{ color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 11, marginBottom: 6 }}>
          {formatEth(parseEth(state.content.amount))} {state.content.asset}
        </div>
        <Row label="FROM" value={state.content.from} />
        <Row label="TO"   value={state.content.to} />
        {state.content.tx && (
          <Row label="TX" value={`${state.content.tx.slice(0, 14)}…`} />
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
      <span style={{ color: COLORS.textMuted, width: 30, flexShrink: 0 }}>{label}</span>
      <span style={{ color: COLORS.textSecondary, wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 12,
      color: COLORS.textMuted,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Network icon — pure SVG, no import */}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="8"  cy="20" r="4" stroke={COLORS.borderSubtle} strokeWidth="1.5" />
        <circle cx="32" cy="12" r="4" stroke={COLORS.borderSubtle} strokeWidth="1.5" />
        <circle cx="32" cy="28" r="4" stroke={COLORS.borderSubtle} strokeWidth="1.5" />
        <line x1="12" y1="20" x2="28" y2="13" stroke={COLORS.borderDim} strokeWidth="1" strokeDasharray="3 2" />
        <line x1="12" y1="20" x2="28" y2="27" stroke={COLORS.borderDim} strokeWidth="1" strokeDasharray="3 2" />
      </svg>
      <span style={{ fontSize: 11, color: COLORS.textMuted }}>
        No fund flows detected in this run
      </span>
      <span style={{ fontSize: 9, color: COLORS.textMuted, opacity: 0.6 }}>
        // run forensics pipeline to populate
      </span>
    </div>
  )
}

// ── Legend ─────────────────────────────────────────────────────────────────

function Legend({ anomalyCount }: { anomalyCount: number }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 10,
      right: 14,
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9,
      color: COLORS.textMuted,
      pointerEvents: 'none',
    }}>
      <LegendItem color={COLORS.redFlow}  label="Anomalous" />
      <LegendItem color={COLORS.skyFlow}  label="Normal" />
      {anomalyCount > 0 && (
        <span style={{ color: COLORS.red, fontSize: 9 }}>
          {anomalyCount} suspicious
        </span>
      )}
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 20, height: 3, background: color, borderRadius: 2,
      }} />
      <span>{label}</span>
    </div>
  )
}

// ── Column labels ──────────────────────────────────────────────────────────

function ColumnLabels({ svgW }: { svgW: number }) {
  const rightX = svgW - NODE_WIDTH - 20
  return (
    <g>
      <text
        x={LEFT_X + NODE_WIDTH / 2}
        y={10}
        textAnchor="middle"
        fill={COLORS.textMuted}
        fontSize={8.5}
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="0.08em"
      >
        SOURCES
      </text>
      <text
        x={rightX + NODE_WIDTH / 2}
        y={10}
        textAnchor="middle"
        fill={COLORS.textMuted}
        fontSize={8.5}
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="0.08em"
      >
        SINKS
      </text>
    </g>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export const FundFlowGraph: React.FC<FundFlowGraphProps> = ({ flows }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims]       = useState({ w: 700, h: 280 })
  const [hoveredLink, setHoveredLink] = useState<number | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0,
    content: { from: '', to: '', amount: '', asset: '', tx: '', anomaly: false },
  })

  // Observe container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ w: Math.max(width, 300), h: Math.max(height, 180) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { nodes, links } = buildLayout(flows, dims.w, dims.h - 14)

  const anomalyCount = links.filter(l => l.isAnomaly).length

  const handleLinkEnter = useCallback((
    e: React.MouseEvent<SVGPathElement>,
    idx: number,
    link: SankeyLink,
  ) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setHoveredLink(idx)
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      content: {
        from:    link.from.fullAddress,
        to:      link.to.fullAddress,
        amount:  link.rawAmount,
        asset:   link.asset,
        tx:      link.txHash,
        anomaly: link.isAnomaly,
      },
    })
  }, [])

  const handleLinkLeave = useCallback(() => {
    setHoveredLink(null)
    setTooltip(t => ({ ...t, visible: false }))
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!tooltip.visible) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip(t => ({ ...t, x: e.clientX - rect.left, y: e.clientY - rect.top }))
  }, [tooltip.visible])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: COLORS.bg,
        overflow: 'hidden',
      }}
    >
      {flows.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <svg
            width={dims.w}
            height={dims.h}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <SvgDefs />

            {/* Grid background */}
            <rect width={dims.w} height={dims.h} fill="url(#ffg-grid)" />

            {/* Column headers */}
            <ColumnLabels svgW={dims.w} />

            {/* Horizontal separator line */}
            <line
              x1={LEFT_X + NODE_WIDTH + 8}
              y1="0"
              x2={dims.w - NODE_WIDTH - 28}
              y2="0"
              stroke={COLORS.borderDim}
              strokeWidth={0.5}
              strokeDasharray="4 4"
              opacity={0.4}
            />

            {/* Links — draw behind nodes */}
            <g>
              {links.map((link, i) => (
                <FlowLink
                  key={i}
                  link={link}
                  hovered={hoveredLink === i}
                  dimmed={
                    (hoveredLink !== null && hoveredLink !== i) ||
                    (hoveredNode !== null &&
                      link.from.id !== hoveredNode &&
                      link.to.id !== hoveredNode)
                  }
                  onMouseEnter={e => handleLinkEnter(e, i, link)}
                  onMouseLeave={handleLinkLeave}
                />
              ))}
            </g>

            {/* Nodes — drawn on top */}
            <g>
              {nodes.map(node => (
                <NodeBox
                  key={node.id}
                  node={node}
                  hovered={hoveredNode === node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                />
              ))}
            </g>
          </svg>

          <Legend anomalyCount={anomalyCount} />
          <Tooltip state={tooltip} />
        </>
      )}
    </div>
  )
}
