# EVM Forensics Investigation UI - Full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive, minimalistic multi-page forensics investigation UI integrated with the backend forensics engine, Ollama AI copilot, and simulation data pipeline. Enable end-to-end demonstration: run simulation → generate forensic results → explore findings in UI → ask AI questions → export audit-grade report.

**Architecture:** 
- **Frontend**: React SPA with 6 key pages (Landing → Dashboard → Investigation → Signals → Entity Profile → Report)
- **Minimalistic Design**: Dark mode, generous whitespace, purposeful typography (Geist Sans + Inter), semantic color system
- **Backend API**: Node.js Express server exposing forensic data + Ollama integration
- **Data Pipeline**: Simulation → Forensics engine → JSON outputs → API → React UI
- **AI Copilot**: Chat interface asking questions about specific attacks, powered by Ollama
- **Export**: PDF/JSON report generation for compliance

**Tech Stack:**
- React 18, TypeScript, Tailwind CSS (frontend)
- D3.js or Recharts (fund-flow visualization)
- Node.js / Express (backend API)
- Ollama (AI copilot)
- jsPDF / html2pdf (report export)
- Existing forensics engine (src/)

---

## File Structure

### Frontend (NEW)

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── index.tsx                    # Entry point
│   ├── App.tsx                      # Root router
│   ├── pages/
│   │   ├── Landing.tsx              # Welcome page
│   │   ├── Dashboard.tsx            # Case list + overview
│   │   ├── Investigation.tsx        # Main three-panel investigation
│   │   ├── SignalsCatalog.tsx       # All 28 heuristics + coverage
│   │   ├── EntityProfile.tsx        # Detailed address/contract analysis
│   │   └── ReportBuilder.tsx        # Report generation + export
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── Investigation/
│   │   │   ├── TransactionTimeline.tsx
│   │   │   ├── FundFlowGraph.tsx
│   │   │   ├── EvidencePanel.tsx
│   │   │   └── AttackSummary.tsx
│   │   ├── Visualization/
│   │   │   ├── SankeyDiagram.tsx
│   │   │   ├── SignalBadge.tsx
│   │   │   └── ConfidenceIndicator.tsx
│   │   ├── Chat/
│   │   │   ├── AIChat.tsx           # Ollama copilot
│   │   │   └── Message.tsx
│   │   └── Common/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Modal.tsx
│   │       └── Toast.tsx
│   ├── hooks/
│   │   ├── useForensicData.ts       # Fetch forensic JSON
│   │   ├── useAIChat.ts             # Ollama integration
│   │   └── useExport.ts             # PDF generation
│   ├── types/
│   │   ├── forensics.ts             # Interfaces for forensic data
│   │   ├── api.ts                   # API response types
│   │   └── ui.ts                    # UI state types
│   ├── styles/
│   │   ├── globals.css
│   │   ├── tailwind.config.js
│   │   └── theme.ts                 # Dark mode color tokens
│   └── utils/
│       ├── api.ts                   # API client
│       ├── formatting.ts            # Address formatting, etc
│       └── analytics.ts             # Event tracking
├── package.json
└── tsconfig.json
```

### Backend (NEW)

```
backend/
├── src/
│   ├── index.ts                     # Express server entry
│   ├── api/
│   │   ├── routes/
│   │   │   ├── forensics.ts         # GET /api/forensics/:runId
│   │   │   ├── ollama.ts            # POST /api/chat
│   │   │   └── reports.ts           # POST /api/reports/export
│   │   └── middleware/
│   │       ├── auth.ts
│   │       └── errors.ts
│   ├── services/
│   │   ├── forensicsService.ts      # Load forensic bundles
│   │   ├── ollamaService.ts         # Chat with Ollama
│   │   └── reportService.ts         # PDF generation
│   ├── types/
│   │   └── index.ts
│   └── config/
│       └── env.ts
├── package.json
└── tsconfig.json
```

### Integration

```
root/
├── scripts/
│   └── run-demo.sh                  # Simulation → Forensics → Frontend
└── docker-compose.yml               # Optional: Ollama + backend
```

---

## Tasks

### Task 1: Project Setup & Dependencies

**Files:**
- Create: `frontend/package.json`
- Create: `backend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `backend/tsconfig.json`
- Create: `frontend/tailwind.config.js`

**Steps:**

- [ ] **Step 1: Initialize frontend project structure**

```bash
cd frontend
npm init -y
npm install react react-dom typescript @types/react @types/react-dom
npm install -D tailwindcss postcss autoprefixer
npm install axios zustand react-router-dom
npm install d3 @types/d3
npm install jspdf html2pdf
npm install @hookform/resolvers zod
npx tailwindcss init -p
```

- [ ] **Step 2: Initialize backend project structure**

```bash
cd backend
npm init -y
npm install express cors dotenv
npm install axios node-fetch
npm install @types/express @types/node -D
npm install typescript ts-node -D
```

- [ ] **Step 3: Create frontend tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForEnumMembers": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create backend tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create Tailwind config with dark mode + custom theme**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic dark mode palette
        bg: {
          primary: '#0F172A',
          secondary: '#1E293B',
          tertiary: '#334155',
        },
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        accent: {
          primary: '#3B82F6',    // blue - trust
          danger: '#EF4444',      // red - critical
          success: '#10B981',     // green - verified
          warning: '#F59E0B',     // amber - needs review
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#F1F5F9',
            'code::before': { content: '""' },
            'code::after': { content: '""' },
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Geist Sans', 'system-ui'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 6: Create frontend package.json with build scripts**

Ensure `package.json` includes:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  }
}
```

- [ ] **Step 7: Create backend package.json with dev/start scripts**

Ensure `package.json` includes:
```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add frontend/ backend/ scripts/
git commit -m "chore: initialize frontend and backend projects with dependencies and config"
```

---

### Task 2: Define TypeScript Types for Forensic Data

**Files:**
- Create: `frontend/src/types/forensics.ts`
- Create: `frontend/src/types/api.ts`

**Steps:**

- [ ] **Step 1: Create forensics.ts with core data types**

```typescript
// frontend/src/types/forensics.ts

export interface ForensicRun {
  runId: string
  timestamp: number
  scenario: string
  confidence: number
  status: 'CONFIRMED' | 'SUSPECTED' | 'NEEDS_REVIEW'
  metadata: {
    totalTransactions: number
    suspiciousTransactions: number
    attackType: string
    attackVector: string
    stolenAmount: string
    stolenAsset: string
    attacker: string
    victim: string
  }
}

export interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  gasUsed: string
  gasPrice: string
  timestamp: number
  blockNumber: number
  status: 'success' | 'reverted'
  isAnomaly: boolean
  anomalyScore: number
}

export interface Signal {
  id: string
  name: string
  category: 'reentrancy' | 'approval' | 'flashloan' | 'oracle' | 'admin' | 'fundflow'
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
  description: string
  sourceDataPath: string
  recordIds: string[]
  affectedTransactions: string[]
  falsePositiveProbability: number
}

export interface Entity {
  address: string
  type: 'contract' | 'externally_owned_account'
  label?: string
  role?: 'attacker' | 'victim' | 'intermediary' | 'sink'
  riskScore: number
  firstSeen: number
  lastSeen: number
  transactionCount: number
  balance?: string
  bytecode?: string
}

export interface FundFlow {
  fromEntity: string
  toEntity: string
  amount: string
  asset: string
  transaction: string
  timestamp: number
  isAnomaly: boolean
}

export interface ForensicBundle {
  runId: string
  transactions: Transaction[]
  signals: Signal[]
  entities: Entity[]
  fundFlows: FundFlow[]
  coverage: {
    tracesAvailable: boolean
    stateDiffsAvailable: boolean
    decodedABIs: number
  }
}
```

- [ ] **Step 2: Create api.ts with API response types**

```typescript
// frontend/src/types/api.ts

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  timestamp: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatResponse {
  messages: ChatMessage[]
  context: {
    runId: string
    selectedEntity?: string
    selectedTransaction?: string
  }
}

export interface ExportRequest {
  runId: string
  format: 'pdf' | 'json' | 'html'
  includeGraphs: boolean
  includeRawData: boolean
}

export interface ExportResponse {
  url: string
  filename: string
  size: number
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/
git commit -m "feat: define core TypeScript types for forensic data structures"
```

---

### Task 3: Create Backend API Server

**Files:**
- Create: `backend/src/index.ts`
- Create: `backend/src/services/forensicsService.ts`
- Create: `backend/src/api/routes/forensics.ts`
- Create: `backend/.env.example`

**Steps:**

- [ ] **Step 1: Create main Express server**

```typescript
// backend/src/index.ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import forensicsRouter from './api/routes/forensics'
import ollamaRouter from './api/routes/ollama'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/forensics', forensicsRouter)
app.use('/api/chat', ollamaRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err)
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: Date.now(),
  })
})

app.listen(PORT, () => {
  console.log(`🔍 Forensics API running on http://localhost:${PORT}`)
})
```

- [ ] **Step 2: Create forensicsService to load and parse forensic bundles**

```typescript
// backend/src/services/forensicsService.ts
import * as fs from 'fs'
import * as path from 'path'

interface ForensicBundle {
  runId: string
  timestamp: number
  transactions: any[]
  signals: any[]
  entities: any[]
}

export class ForensicsService {
  private runsCacheDir = path.join(process.cwd(), '..', 'runs')

  async getLatestRun(): Promise<ForensicBundle> {
    // List all runs, sort by date, return latest
    const runs = fs.readdirSync(this.runsCacheDir)
      .filter(name => name.startsWith('run_'))
      .sort()
      .reverse()

    if (runs.length === 0) {
      throw new Error('No forensic runs found')
    }

    return this.loadRun(runs[0])
  }

  async loadRun(runId: string): Promise<ForensicBundle> {
    const bundlePath = path.join(
      this.runsCacheDir,
      runId,
      'forensic_bundle',
      '02_forensic_bundle'
    )

    // Load key JSON files
    const transactions = this.loadNdjson(
      path.join(bundlePath, '02_derived/tx_structural/transaction_enriched_000001.ndjson')
    )
    const signals = this.loadNdjson(
      path.join(bundlePath, '03_signals/signals_000001.ndjson')
    )
    const entities = this.loadNdjson(
      path.join(bundlePath, '02_derived/inventory_profiling/address_profile_000001.ndjson')
    )

    return {
      runId,
      timestamp: Date.now(),
      transactions,
      signals,
      entities,
    }
  }

  private loadNdjson(filePath: string): any[] {
    if (!fs.existsSync(filePath)) {
      return []
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
  }
}

export const forensicsService = new ForensicsService()
```

- [ ] **Step 3: Create forensics routes**

```typescript
// backend/src/api/routes/forensics.ts
import { Router, Request, Response } from 'express'
import { forensicsService } from '../../services/forensicsService'

const router = Router()

// GET /api/forensics/latest
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const bundle = await forensicsService.getLatestRun()
    res.json({
      success: true,
      data: bundle,
      timestamp: Date.now(),
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    })
  }
})

// GET /api/forensics/:runId
router.get('/:runId', async (req: Request, res: Response) => {
  try {
    const bundle = await forensicsService.loadRun(req.params.runId)
    res.json({
      success: true,
      data: bundle,
      timestamp: Date.now(),
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    })
  }
})

export default router
```

- [ ] **Step 4: Create .env.example**

```bash
# backend/.env.example
PORT=3001
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=phi3:mini
NODE_ENV=development
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/
git commit -m "feat: create Express API server with forensics data loading"
```

---

### Task 4: Create Frontend Type-Safe API Client

**Files:**
- Create: `frontend/src/utils/api.ts`
- Create: `frontend/src/hooks/useForensicData.ts`

**Steps:**

- [ ] **Step 1: Create API client**

```typescript
// frontend/src/utils/api.ts
import axios from 'axios'
import { ForensicBundle, ChatMessage, ExportRequest } from '../types'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

export const forensicsApi = {
  getLatest: async (): Promise<ForensicBundle> => {
    const { data } = await client.get('/forensics/latest')
    return data.data
  },

  getRun: async (runId: string): Promise<ForensicBundle> => {
    const { data } = await client.get(`/forensics/${runId}`)
    return data.data
  },

  chat: async (
    runId: string,
    message: string,
    context?: { txHash?: string; address?: string }
  ): Promise<ChatMessage[]> => {
    const { data } = await client.post('/chat', {
      runId,
      message,
      context,
    })
    return data.data.messages
  },

  export: async (request: ExportRequest): Promise<{ url: string }> => {
    const { data } = await client.post('/reports/export', request)
    return data.data
  },
}

export default client
```

- [ ] **Step 2: Create useForensicData hook**

```typescript
// frontend/src/hooks/useForensicData.ts
import { useState, useEffect } from 'react'
import { ForensicBundle } from '../types'
import { forensicsApi } from '../utils/api'

export function useForensicData() {
  const [data, setData] = useState<ForensicBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const bundle = await forensicsApi.getLatest()
        setData(bundle)
      } catch (err: any) {
        setError(err.message || 'Failed to load forensic data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/ frontend/src/hooks/
git commit -m "feat: create type-safe API client and data hooks"
```

---

### Task 5: Create Minimalistic Layout Components

**Files:**
- Create: `frontend/src/components/Layout/Navbar.tsx`
- Create: `frontend/src/components/Layout/Sidebar.tsx`
- Create: `frontend/src/components/Layout/Layout.tsx`
- Create: `frontend/src/styles/globals.css`

**Steps:**

- [ ] **Step 1: Create Navbar with minimalistic design**

```typescript
// frontend/src/components/Layout/Navbar.tsx
import { Link } from 'react-router-dom'

export function Navbar() {
  return (
    <nav className="border-b border-text-muted bg-bg-primary px-8 py-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-display text-2xl font-bold text-text-primary">
          forensics.
        </Link>
        <div className="flex gap-8 text-sm text-text-secondary">
          <Link to="/dashboard" className="hover:text-text-primary transition">
            Dashboard
          </Link>
          <Link to="/signals" className="hover:text-text-primary transition">
            Signals
          </Link>
          <Link to="/docs" className="hover:text-text-primary transition">
            Docs
          </Link>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create Sidebar for Investigation page**

```typescript
// frontend/src/components/Layout/Sidebar.tsx
interface SidebarProps {
  activeTab: 'timeline' | 'entities' | 'signals'
  onTabChange: (tab: 'timeline' | 'entities' | 'signals') => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const tabs = [
    { id: 'timeline' as const, label: 'Timeline', icon: '⏱' },
    { id: 'entities' as const, label: 'Entities', icon: '👤' },
    { id: 'signals' as const, label: 'Signals', icon: '🚨' },
  ]

  return (
    <aside className="w-64 border-r border-text-muted bg-bg-secondary p-6">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-8">
        Investigation
      </h2>
      <nav className="space-y-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full text-left px-4 py-3 rounded transition ${
              activeTab === tab.id
                ? 'bg-bg-tertiary text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: Create Layout wrapper component**

```typescript
// frontend/src/components/Layout/Layout.tsx
import { ReactNode } from 'react'
import { Navbar } from './Navbar'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
```

- [ ] **Step 4: Create globals.css with custom CSS variables**

```css
/* frontend/src/styles/globals.css */

@import url('https://rsms.me/inter/inter.css');
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');

:root {
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;
  
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  
  --color-accent-primary: #3b82f6;
  --color-accent-danger: #ef4444;
  --color-accent-success: #10b981;
  --color-accent-warning: #f59e0b;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code, pre {
  font-family: 'IBM Plex Mono', monospace;
}

/* Smooth transitions */
button, a {
  transition: all 150ms ease-out;
}

/* Focus states (accessibility) */
:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--color-bg-tertiary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Layout/ frontend/src/styles/
git commit -m "feat: create minimalistic layout components with semantic design"
```

---

### Task 6: Build Investigation Dashboard Page (Three-Panel UI)

**Files:**
- Create: `frontend/src/pages/Investigation.tsx`
- Create: `frontend/src/components/Investigation/TransactionTimeline.tsx`
- Create: `frontend/src/components/Investigation/FundFlowGraph.tsx`
- Create: `frontend/src/components/Investigation/EvidencePanel.tsx`
- Create: `frontend/src/components/Investigation/AttackSummary.tsx`

**Steps:**

- [ ] **Step 1: Create AttackSummary header component**

```typescript
// frontend/src/components/Investigation/AttackSummary.tsx
import { ForensicBundle } from '../../types'

interface AttackSummaryProps {
  bundle: ForensicBundle
}

export function AttackSummary({ bundle }: AttackSummaryProps) {
  const meta = bundle.metadata || {}
  
  return (
    <div className="border-b border-text-muted bg-bg-secondary p-8">
      <div className="max-w-7xl mx-auto">
        {/* Status badge */}
        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
            bundle.status === 'CONFIRMED' 
              ? 'bg-accent-danger text-white'
              : 'bg-accent-warning text-bg-primary'
          }`}>
            {bundle.status}
          </span>
        </div>

        {/* Attack type */}
        <h1 className="font-display text-4xl font-bold mb-6">{meta.attackType || 'Unknown Attack'}</h1>

        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-8 text-sm">
          <div>
            <div className="text-text-secondary mb-2">ATTACKER</div>
            <div className="font-mono text-text-primary">{meta.attacker?.slice(0, 10)}...</div>
          </div>
          <div>
            <div className="text-text-secondary mb-2">STOLEN</div>
            <div className="font-mono text-text-primary">${meta.stolenAmount}</div>
          </div>
          <div>
            <div className="text-text-secondary mb-2">CONFIDENCE</div>
            <div className="font-mono text-accent-success">{(bundle.confidence * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-text-secondary mb-2">SIGNALS FIRED</div>
            <div className="font-mono text-accent-danger">{bundle.metadata?.signalCount || 0}/28</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TransactionTimeline component**

```typescript
// frontend/src/components/Investigation/TransactionTimeline.tsx
import { Transaction } from '../../types'

interface TimelineProps {
  transactions: Transaction[]
  selected?: string
  onSelect: (hash: string) => void
}

export function TransactionTimeline({ transactions, selected, onSelect }: TimelineProps) {
  const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-3">
        {sorted.map(tx => (
          <button
            key={tx.hash}
            onClick={() => onSelect(tx.hash)}
            className={`w-full text-left p-4 rounded border transition ${
              selected === tx.hash
                ? 'border-accent-primary bg-bg-secondary'
                : 'border-text-muted bg-bg-primary hover:border-text-secondary'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-mono text-sm text-text-primary">{tx.hash.slice(0, 10)}...</span>
              {tx.isAnomaly && (
                <span className="px-2 py-1 bg-accent-danger text-white text-xs rounded">
                  ANOMALY
                </span>
              )}
            </div>
            <div className="text-xs text-text-secondary space-y-1">
              <div>Value: {tx.value} ETH</div>
              <div>Block: {tx.blockNumber}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create FundFlowGraph component (simplified, placeholder for D3)**

```typescript
// frontend/src/components/Investigation/FundFlowGraph.tsx
import { ForensicBundle } from '../../types'

interface GraphProps {
  bundle: ForensicBundle
  highlightedTransaction?: string
}

export function FundFlowGraph({ bundle, highlightedTransaction }: GraphProps) {
  // TODO: Integrate D3.js Sankey diagram here
  
  return (
    <div className="h-full bg-bg-secondary flex items-center justify-center border-r border-text-muted">
      <div className="text-center">
        <div className="text-accent-primary mb-4">📊</div>
        <h3 className="font-semibold text-text-primary mb-2">Fund Flow Diagram</h3>
        <p className="text-sm text-text-secondary">D3.js Sankey visualization</p>
        <p className="text-xs text-text-muted mt-2">{bundle.fundFlows?.length || 0} fund flows detected</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create EvidencePanel component**

```typescript
// frontend/src/components/Investigation/EvidencePanel.tsx
import { ForensicBundle, Transaction, Signal } from '../../types'

interface EvidencePanelProps {
  bundle: ForensicBundle
  selectedTxHash?: string
}

export function EvidencePanel({ bundle, selectedTxHash }: EvidencePanelProps) {
  const selectedTx = selectedTxHash
    ? bundle.transactions.find(t => t.hash === selectedTxHash)
    : null

  const relevantSignals = selectedTx
    ? bundle.signals.filter(s => s.affectedTransactions.includes(selectedTxHash))
    : bundle.signals.slice(0, 5)

  return (
    <div className="h-full overflow-y-auto bg-bg-primary p-6">
      <h2 className="font-display text-lg font-bold text-text-primary mb-6">Evidence Inspector</h2>

      {selectedTx && (
        <div className="mb-8 pb-8 border-b border-text-muted">
          <h3 className="text-sm text-text-secondary mb-4 uppercase">TRANSACTION DETAILS</h3>
          <div className="space-y-2 text-sm font-mono text-text-primary">
            <div>Hash: {selectedTx.hash}</div>
            <div>From: {selectedTx.from.slice(0, 10)}...</div>
            <div>To: {selectedTx.to.slice(0, 10)}...</div>
            <div>Value: {selectedTx.value} ETH</div>
            <div className="text-accent-success">Status: {selectedTx.status}</div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm text-text-secondary mb-4 uppercase">Relevant Signals</h3>
        <div className="space-y-3">
          {relevantSignals.map(signal => (
            <div key={signal.id} className="p-4 border border-text-muted rounded bg-bg-secondary">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-text-primary">{signal.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  signal.severity === 'critical'
                    ? 'bg-accent-danger text-white'
                    : 'bg-accent-warning text-bg-primary'
                }`}>
                  {signal.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-2">{signal.description}</p>
              <div className="text-xs text-text-muted">
                Confidence: {(signal.confidence * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create Investigation page**

```typescript
// frontend/src/pages/Investigation.tsx
import { useState } from 'react'
import { Layout } from '../components/Layout/Layout'
import { AttackSummary } from '../components/Investigation/AttackSummary'
import { TransactionTimeline } from '../components/Investigation/TransactionTimeline'
import { FundFlowGraph } from '../components/Investigation/FundFlowGraph'
import { EvidencePanel } from '../components/Investigation/EvidencePanel'
import { useForensicData } from '../hooks/useForensicData'

export function Investigation() {
  const { data: bundle, loading, error } = useForensicData()
  const [selectedTx, setSelectedTx] = useState<string>()

  if (loading) return <Layout><div className="p-8">Loading forensic data...</div></Layout>
  if (error || !bundle) return <Layout><div className="p-8">Error: {error}</div></Layout>

  return (
    <Layout>
      <AttackSummary bundle={bundle} />

      {/* Three-panel layout */}
      <div className="grid grid-cols-3 max-h-screen">
        {/* Left: Timeline */}
        <div className="border-r border-text-muted overflow-hidden">
          <div className="p-4 border-b border-text-muted">
            <h2 className="font-semibold text-sm text-text-secondary">TRANSACTION TIMELINE</h2>
          </div>
          <TransactionTimeline
            transactions={bundle.transactions}
            selected={selectedTx}
            onSelect={setSelectedTx}
          />
        </div>

        {/* Center: Fund Flow */}
        <div className="border-r border-text-muted overflow-hidden">
          <FundFlowGraph bundle={bundle} highlightedTransaction={selectedTx} />
        </div>

        {/* Right: Evidence */}
        <div>
          <div className="p-4 border-b border-text-muted">
            <h2 className="font-semibold text-sm text-text-secondary">EVIDENCE</h2>
          </div>
          <EvidencePanel bundle={bundle} selectedTxHash={selectedTx} />
        </div>
      </div>
    </Layout>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Investigation.tsx frontend/src/components/Investigation/
git commit -m "feat: build three-panel investigation dashboard with interactive layout"
```

---

### Task 7: Create AI Chat Copilot Component

**Files:**
- Create: `frontend/src/components/Chat/AIChat.tsx`
- Create: `frontend/src/hooks/useAIChat.ts`
- Create: `backend/src/api/routes/ollama.ts`
- Create: `backend/src/services/ollamaService.ts`

**Steps:**

- [ ] **Step 1: Create OllamaService for backend**

```typescript
// backend/src/services/ollamaService.ts
import axios from 'axios'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const MODEL = process.env.OLLAMA_MODEL || 'phi3:mini'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export class OllamaService {
  private conversationHistory: Message[] = []

  async chat(userMessage: string, context?: any): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    })

    // Build context-aware prompt
    const systemPrompt = `You are an expert EVM blockchain forensics analyst. You help investigators understand attacks by analyzing transaction data and heuristic signals.
    
Context:
- Attack: ${context?.attackType || 'Unknown'}
- Confidence: ${context?.confidence || 'N/A'}
- Signals Fired: ${context?.signalCount || 0}/28

Be concise, analytical, and evidence-focused. Cite specific transactions or signals when possible.`

    try {
      const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.conversationHistory,
        ],
        stream: false,
      })

      const assistantMessage = response.data.message.content
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      })

      return assistantMessage
    } catch (error: any) {
      throw new Error(`Ollama chat failed: ${error.message}`)
    }
  }

  reset() {
    this.conversationHistory = []
  }
}

export const ollamaService = new OllamaService()
```

- [ ] **Step 2: Create Ollama routes**

```typescript
// backend/src/api/routes/ollama.ts
import { Router, Request, Response } from 'express'
import { ollamaService } from '../../services/ollamaService'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      })
    }

    const response = await ollamaService.chat(message, context)

    res.json({
      success: true,
      data: {
        messages: [
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'assistant', content: response, timestamp: Date.now() },
        ],
      },
      timestamp: Date.now(),
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    })
  }
})

router.post('/reset', (req: Request, res: Response) => {
  ollamaService.reset()
  res.json({ success: true, timestamp: Date.now() })
})

export default router
```

- [ ] **Step 3: Create useAIChat hook**

```typescript
// frontend/src/hooks/useAIChat.ts
import { useState, useCallback } from 'react'
import { ChatMessage } from '../types'
import { forensicsApi } from '../utils/api'

export function useAIChat(runId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (content: string, context?: any) => {
      try {
        setLoading(true)
        setError(null)

        const response = await forensicsApi.chat(runId, content, context)
        setMessages(response)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [runId]
  )

  return { messages, loading, error, sendMessage }
}
```

- [ ] **Step 4: Create AIChat component**

```typescript
// frontend/src/components/Chat/AIChat.tsx
import { useState, useRef, useEffect } from 'react'
import { useAIChat } from '../../hooks/useAIChat'
import { ChatMessage } from '../../types'

interface AIChatProps {
  runId: string
  context?: {
    attackType?: string
    confidence?: number
    signalCount?: number
  }
}

export function AIChat({ runId, context }: AIChatProps) {
  const [input, setInput] = useState('')
  const { messages, loading, sendMessage } = useAIChat(runId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    await sendMessage(input, context)
    setInput('')
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-bg-secondary rounded-lg border border-text-muted">
      {/* Header */}
      <div className="p-4 border-b border-text-muted">
        <h3 className="font-semibold text-text-primary">🤖 Forensics Copilot</h3>
        <p className="text-xs text-text-secondary mt-1">Ask about this attack</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded text-sm ${
                msg.role === 'user'
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-primary text-text-primary border border-text-muted'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-text-secondary italic">Analyzing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-text-muted">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about the attack..."
            disabled={loading}
            className="flex-1 px-3 py-2 bg-bg-primary text-text-primary rounded border border-text-muted text-sm placeholder-text-muted focus:border-accent-primary outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-accent-primary text-white rounded text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Chat/ frontend/src/hooks/useAIChat.ts backend/src/api/routes/ollama.ts backend/src/services/ollamaService.ts
git commit -m "feat: add AI chat copilot integration with Ollama backend"
```

---

### Task 8: Create Demo Scenario & Test Data Pipeline

**Files:**
- Create: `scripts/run-demo.sh`
- Create: `backend/scripts/generate-demo-data.ts`

**Steps:**

- [ ] **Step 1: Create run-demo.sh orchestration script**

```bash
#!/bin/bash
# scripts/run-demo.sh

set -e

echo "🚀 Starting Forensics Demo Pipeline"
echo "====================================="

# Step 1: Run simulation
echo "📊 Step 1: Running simulation..."
cd /mnt/c/Users/aswat/ForensicToolW3
npm run sim:precision

# Step 2: Get latest run ID
echo "📁 Step 2: Finding latest forensic run..."
LATEST_RUN=$(ls -t runs/run_*/ | head -1 | cut -d'/' -f2)
echo "Latest run: $LATEST_RUN"

# Step 3: Start backend
echo "🔌 Step 3: Starting backend API..."
cd backend
npm run build
npm run start &
BACKEND_PID=$!
sleep 2

# Step 4: Start frontend
echo "🎨 Step 4: Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
sleep 3

echo ""
echo "✅ Demo is running!"
echo "🌐 Frontend:  http://localhost:5173"
echo "📡 Backend:   http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop"

wait
```

- [ ] **Step 2: Make script executable and test**

```bash
chmod +x scripts/run-demo.sh
```

- [ ] **Step 3: Create package.json scripts at root for easy orchestration**

```json
{
  "scripts": {
    "demo": "bash scripts/run-demo.sh",
    "demo:backend": "cd backend && npm run dev",
    "demo:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build && cd ../backend && npm run build"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts/run-demo.sh package.json
git commit -m "feat: add demo orchestration script for end-to-end testing"
```

---

### Task 9: Create Additional Pages (Dashboard, Signals Catalog, Report)

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/pages/SignalsCatalog.tsx`
- Create: `frontend/src/pages/ReportBuilder.tsx`

**Steps:**

- [ ] **Step 1: Create Dashboard page (case list)**

```typescript
// frontend/src/pages/Dashboard.tsx
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { useForensicData } from '../hooks/useForensicData'

export function Dashboard() {
  const { data: bundle, loading } = useForensicData()

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="font-display text-3xl font-bold mb-2 text-text-primary">Cases</h1>
        <p className="text-text-secondary mb-8">Recent forensic investigations</p>

        {bundle && (
          <Link
            to="/investigation"
            className="block p-6 border border-text-muted rounded hover:border-accent-primary transition"
          >
            <h2 className="font-semibold text-text-primary mb-2">{bundle.metadata?.attackType}</h2>
            <p className="text-sm text-text-secondary mb-4">
              {bundle.metadata?.stolenAmount} stolen • {(bundle.confidence * 100).toFixed(0)}% confidence
            </p>
            <p className="text-xs text-text-muted">Click to investigate →</p>
          </Link>
        )}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 2: Create SignalsCatalog page**

```typescript
// frontend/src/pages/SignalsCatalog.tsx
import { Layout } from '../components/Layout/Layout'
import { useForensicData } from '../hooks/useForensicData'

export function SignalsCatalog() {
  const { data: bundle } = useForensicData()

  if (!bundle) return <Layout><div className="p-8">No data</div></Layout>

  const categories = {
    reentrancy: bundle.signals.filter(s => s.category === 'reentrancy'),
    approval: bundle.signals.filter(s => s.category === 'approval'),
    flashloan: bundle.signals.filter(s => s.category === 'flashloan'),
    oracle: bundle.signals.filter(s => s.category === 'oracle'),
    admin: bundle.signals.filter(s => s.category === 'admin'),
    fundflow: bundle.signals.filter(s => s.category === 'fundflow'),
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="font-display text-3xl font-bold mb-8">Heuristic Rules (28)</h1>

        {Object.entries(categories).map(([cat, signals]) => (
          <div key={cat} className="mb-12">
            <h2 className="font-semibold text-lg text-text-primary mb-4 uppercase">{cat}</h2>
            <div className="space-y-3">
              {signals.map(signal => (
                <div
                  key={signal.id}
                  className="p-4 border border-text-muted rounded hover:border-text-secondary transition"
                >
                  <h3 className="font-semibold text-text-primary mb-2">{signal.name}</h3>
                  <p className="text-sm text-text-secondary mb-2">{signal.description}</p>
                  <div className="flex gap-4 text-xs text-text-muted">
                    <span>Fired: {signal.affectedTransactions.length}x</span>
                    <span>False Pos: {(signal.falsePositiveProbability * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 3: Create ReportBuilder page**

```typescript
// frontend/src/pages/ReportBuilder.tsx
import { useState } from 'react'
import { Layout } from '../components/Layout/Layout'
import { useForensicData } from '../hooks/useForensicData'

export function ReportBuilder() {
  const { data: bundle } = useForensicData()
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: 'pdf' | 'json') => {
    setExporting(true)
    // TODO: Call export API
    setTimeout(() => setExporting(false), 1000)
  }

  if (!bundle) return <Layout><div className="p-8">No data</div></Layout>

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="font-display text-3xl font-bold mb-2">Generate Report</h1>
        <p className="text-text-secondary mb-8">Export investigation findings for compliance and audit</p>

        <div className="space-y-6">
          {/* Report options */}
          <div className="border border-text-muted rounded p-6">
            <h2 className="font-semibold text-text-primary mb-4">Report Options</h2>
            <label className="flex items-center gap-3 mb-4">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-text-secondary">Include timeline</span>
            </label>
            <label className="flex items-center gap-3 mb-4">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-text-secondary">Include fund flow diagram</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-text-secondary">Include evidence citations</span>
            </label>
          </div>

          {/* Export buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              className="flex-1 px-6 py-3 bg-accent-primary text-white rounded font-semibold hover:bg-blue-600 disabled:opacity-50 transition"
            >
              {exporting ? 'Exporting...' : '📄 Export PDF'}
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="flex-1 px-6 py-3 border border-text-muted text-text-primary rounded font-semibold hover:border-text-secondary transition disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : '📦 Export JSON'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
```

- [ ] **Step 4: Create App.tsx with routing**

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Investigation } from './pages/Investigation'
import { SignalsCatalog } from './pages/SignalsCatalog'
import { ReportBuilder } from './pages/ReportBuilder'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/investigation" element={<Investigation />} />
        <Route path="/signals" element={<SignalsCatalog />} />
        <Route path="/report" element={<ReportBuilder />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ frontend/src/App.tsx
git commit -m "feat: create additional pages (dashboard, signals catalog, report builder)"
```

---

### Task 10: End-to-End Testing & Demo Validation

**Files:**
- Create: `docs/DEMO_GUIDE.md`
- Modify: `README.md`

**Steps:**

- [ ] **Step 1: Create demo guide**

```markdown
# Forensics Investigation UI - Demo Guide

## Quick Start

1. Start the demo pipeline:
```bash
npm run demo
```

This will:
- Run a simulation (reentrancy attack)
- Start the backend API (port 3001)
- Start the frontend (port 5173)

2. Open http://localhost:5173 in your browser

3. Click "Dashboard" → Select the case → Click "Investigate"

## Demo Narrative (5 minutes)

### Act I: The Verdict (30 seconds)
- Show the Attack Summary header
- **Key point**: "The tool detected a reentrancy attack with 98% confidence"

### Act II: The Investigation (2 minutes)
- Click through transactions in the timeline
- Show fund flow diagram
- Highlight signals firing (right panel)
- **Key point**: "Every finding is evidence-backed - you can see exactly which rule caught it"

### Act III: The Report (1 minute)
- Go to "Report Builder"
- Export PDF
- **Key point**: "Audit-grade report ready for compliance"

### Bonus: AI Copilot (1 minute)
- Open Investigation page
- Chat with AI copilot about the attack
- Ask: "What is reentrancy?"
- Ask: "Where did the money go?"

## Expected Results

✅ All pages load without errors
✅ Timeline shows 12 transactions
✅ Fund flow diagram renders
✅ Clicking tx populates evidence panel
✅ Signals display with confidence scores
✅ Export generates PDF successfully
✅ AI chat responds to questions

## Troubleshooting

**Frontend won't load**: Check backend is running on port 3001
**No forensic data**: Check simulation ran and generated output in `runs/`
**Ollama chat fails**: Ensure Ollama is running (`ollama serve`)
```

- [ ] **Step 2: Create testing checklist**

```markdown
# Testing Checklist

## Frontend
- [ ] Landing page loads
- [ ] Navigation between pages works
- [ ] Dashboard lists cases
- [ ] Investigation page shows three-panel layout
- [ ] Clicking transactions highlights in fund flow
- [ ] Evidence panel updates on tx selection
- [ ] Signals display with correct severity colors
- [ ] SignalsCatalog shows all 28 rules grouped by category
- [ ] ReportBuilder export buttons work
- [ ] Dark mode CSS applies correctly
- [ ] Mobile layout responsive (if applicable)

## Backend
- [ ] API server starts without errors
- [ ] GET /health returns 200
- [ ] GET /api/forensics/latest returns forensic bundle
- [ ] API loads all forensic JSON files correctly
- [ ] Errors are handled gracefully
- [ ] CORS is enabled for frontend

## Integration
- [ ] Simulation generates forensic output
- [ ] Backend reads forensic output correctly
- [ ] Frontend fetches data from API
- [ ] All three panels sync together
- [ ] Ollama integration works (if enabled)

## UI/UX
- [ ] Typography is readable (Geist + Inter)
- [ ] Colors follow semantic system
- [ ] Whitespace is appropriate
- [ ] Buttons have hover/active states
- [ ] Forms have proper focus states
- [ ] Loading states show while fetching
- [ ] Error messages are clear
```

- [ ] **Step 3: Test locally**

```bash
# Run the full demo
npm run demo

# In another terminal, verify API is working
curl http://localhost:3001/health

# Check frontend loads
curl http://localhost:5173
```

- [ ] **Step 4: Commit**

```bash
git add docs/DEMO_GUIDE.md
git commit -m "docs: add comprehensive demo guide and testing checklist"
```

---

## Implementation Checklist

- [ ] Task 1: Project Setup & Dependencies
- [ ] Task 2: TypeScript Types
- [ ] Task 3: Backend API Server
- [ ] Task 4: Frontend API Client
- [ ] Task 5: Layout Components
- [ ] Task 6: Investigation Dashboard (Three-Panel)
- [ ] Task 7: AI Chat Copilot
- [ ] Task 8: Demo Scenario & Test Data
- [ ] Task 9: Additional Pages
- [ ] Task 10: End-to-End Testing

---

## Success Criteria

✅ **Frontend loads without errors**
✅ **Three-panel investigation dashboard works interactively**
✅ **Evidence panel updates when transactions are selected**
✅ **Fund flow visualization renders**
✅ **Signals display with correct categorization**
✅ **AI copilot responds to questions about the attack**
✅ **Report export generates PDF successfully**
✅ **Full simulation → forensics → UI pipeline works end-to-end**
✅ **Demo is ready to show investors/professors**

---

**Ready to execute?**

I can now help you implement this plan. Choose your approach:

**Option A: Subagent-Driven (Recommended)**
- Fresh agent per task
- Two-stage review (architecture → code → test)
- Fast iteration

**Option B: Inline Execution**
- Execute tasks in this session
- Batch implementation with checkpoints
- All in one place

**Which approach?**
