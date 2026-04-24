import React, { useEffect, useRef } from 'react'
import type { FundFlow } from '../../types/forensics'

interface FundFlowGraphProps {
  flows: FundFlow[]
}

export const FundFlowGraph: React.FC<FundFlowGraphProps> = ({ flows }) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || flows.length === 0) return

    const svg = svgRef.current
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    title.setAttribute('x', '10')
    title.setAttribute('y', '30')
    title.setAttribute('fill', '#F1F5F9')
    title.setAttribute('font-size', '16')
    title.setAttribute('font-weight', 'bold')
    title.textContent = 'Fund Flow Graph (D3.js Sankey coming soon)'
    svg.appendChild(title)

    const senders = new Map<string, number>()
    flows.forEach(f => {
      senders.set(f.fromEntity, (senders.get(f.fromEntity) || 0) + parseFloat(f.amount))
    })

    let y = 60
    Array.from(senders.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([entity, amount]) => {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', '20')
        text.setAttribute('y', String(y))
        text.setAttribute('fill', '#94A3B8')
        text.setAttribute('font-size', '12')
        text.textContent = `${entity.slice(0, 10)}... → ${amount.toFixed(2)} ETH`
        svg.appendChild(text)
        y += 25
      })
  }, [flows])

  return (
    <div className="h-full bg-bg-secondary rounded-lg border border-bg-tertiary overflow-hidden flex flex-col">
      <div className="p-4 border-b border-bg-tertiary">
        <h2 className="text-lg font-bold text-text-primary">Fund Flow</h2>
      </div>
      <svg ref={svgRef} className="flex-1" style={{ background: '#1E293B' }} />
    </div>
  )
}
