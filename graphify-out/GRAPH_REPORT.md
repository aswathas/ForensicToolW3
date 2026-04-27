# Graph Report - .  (2026-04-27)

## Corpus Check
- 133 files · ~127,387 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 418 nodes · 589 edges · 63 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.8)
- Token cost: 105,537 input · 71,808 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Simulation Infrastructure|Simulation Infrastructure]]
- [[_COMMUNITY_Graph Building Pipeline|Graph Building Pipeline]]
- [[_COMMUNITY_Signal Detection Engine|Signal Detection Engine]]
- [[_COMMUNITY_Frontend Components|Frontend Components]]
- [[_COMMUNITY_Backend API Routes|Backend API Routes]]
- [[_COMMUNITY_Data Models|Data Models]]
- [[_COMMUNITY_Forensics Modules|Forensics Modules]]
- [[_COMMUNITY_UI Pages|UI Pages]]
- [[_COMMUNITY_Design System|Design System]]
- [[_COMMUNITY_Animations|Animations]]
- [[_COMMUNITY_Component 10|Component 10]]
- [[_COMMUNITY_Component 11|Component 11]]
- [[_COMMUNITY_Component 12|Component 12]]
- [[_COMMUNITY_Component 13|Component 13]]
- [[_COMMUNITY_Component 14|Component 14]]
- [[_COMMUNITY_Component 15|Component 15]]
- [[_COMMUNITY_Component 16|Component 16]]
- [[_COMMUNITY_Component 17|Component 17]]
- [[_COMMUNITY_Component 18|Component 18]]
- [[_COMMUNITY_Component 19|Component 19]]
- [[_COMMUNITY_Component 20|Component 20]]
- [[_COMMUNITY_Component 21|Component 21]]
- [[_COMMUNITY_Component 22|Component 22]]
- [[_COMMUNITY_Component 23|Component 23]]
- [[_COMMUNITY_Component 24|Component 24]]
- [[_COMMUNITY_Component 25|Component 25]]
- [[_COMMUNITY_Component 26|Component 26]]
- [[_COMMUNITY_Component 27|Component 27]]
- [[_COMMUNITY_Component 28|Component 28]]
- [[_COMMUNITY_Component 29|Component 29]]
- [[_COMMUNITY_Component 30|Component 30]]
- [[_COMMUNITY_Component 31|Component 31]]
- [[_COMMUNITY_Component 32|Component 32]]
- [[_COMMUNITY_Component 33|Component 33]]
- [[_COMMUNITY_Component 34|Component 34]]
- [[_COMMUNITY_Component 35|Component 35]]
- [[_COMMUNITY_Component 36|Component 36]]
- [[_COMMUNITY_Component 37|Component 37]]
- [[_COMMUNITY_Component 38|Component 38]]
- [[_COMMUNITY_Component 39|Component 39]]
- [[_COMMUNITY_Component 40|Component 40]]
- [[_COMMUNITY_Component 41|Component 41]]
- [[_COMMUNITY_Component 42|Component 42]]
- [[_COMMUNITY_Component 43|Component 43]]
- [[_COMMUNITY_Component 44|Component 44]]
- [[_COMMUNITY_Component 45|Component 45]]
- [[_COMMUNITY_Component 46|Component 46]]
- [[_COMMUNITY_Component 47|Component 47]]
- [[_COMMUNITY_Component 48|Component 48]]
- [[_COMMUNITY_Component 49|Component 49]]
- [[_COMMUNITY_Component 50|Component 50]]
- [[_COMMUNITY_Component 51|Component 51]]
- [[_COMMUNITY_Component 52|Component 52]]
- [[_COMMUNITY_Component 53|Component 53]]
- [[_COMMUNITY_Component 54|Component 54]]
- [[_COMMUNITY_Component 55|Component 55]]
- [[_COMMUNITY_Component 108|Component 108]]
- [[_COMMUNITY_Component 109|Component 109]]
- [[_COMMUNITY_Component 110|Component 110]]
- [[_COMMUNITY_Component 111|Component 111]]
- [[_COMMUNITY_Component 112|Component 112]]
- [[_COMMUNITY_Component 113|Component 113]]
- [[_COMMUNITY_Component 114|Component 114]]

## God Nodes (most connected - your core abstractions)
1. `eth()` - 15 edges
2. `runScenario()` - 14 edges
3. `main()` - 13 edges
4. `loadArtifact()` - 12 edges
5. `main()` - 12 edges
6. `deployContract()` - 11 edges
7. `SmokeRenderer` - 9 edges
8. `resolveWindow()` - 8 edges
9. `ForensicsAPI` - 7 edges
10. `fundAddress()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Backend: Express.js API Server` --conceptually_related_to--> `Module: Ingestion (RPC/raw file import)`  [INFERRED]
  BUILD_PROGRESS.md → CLAUDE.md
- `main()` --calls--> `getBalance()`  [INFERRED]
  /mnt/c/Users/ADMIN/Desktop/Projects/ForensicToolW3/scripts/simulations/sim_runner.mjs → /mnt/c/Users/ADMIN/Desktop/Projects/ForensicToolW3/scripts/simulations/base/deploy_utils.mjs
- `main()` --calls--> `getSigners()`  [INFERRED]
  /mnt/c/Users/ADMIN/Desktop/Projects/ForensicToolW3/scripts/simulations/sim_runner.mjs → /mnt/c/Users/ADMIN/Desktop/Projects/ForensicToolW3/scripts/simulations/base/deploy_utils.mjs
- `deployMarker()` --calls--> `deployContract()`  [INFERRED]
  /mnt/c/Users/ADMIN/Desktop/Projects/ForensicToolW3/scripts/simulations/base/marker.mjs → /mnt/c/Users/ADMIN/Desktop/Projects/ForensicToolW3/scripts/simulations/base/deploy_utils.mjs
- `main()` --calls--> `collectRaw()`  [INFERRED]
  /mnt/c/Users/ADMIN/Desktop/Projects/ForensicToolW3/src/index.js → /mnt/c/Users/ADMIN/Desktop/Projects/ForensicToolW3/src/ingestion/raw_collector.js

## Communities

### Community 0 - "Simulation Infrastructure"
Cohesion: 0.14
Nodes (18): findAnvilBinary(), sleep(), startAnvil(), stopAnvil(), waitForRpc(), compileAll(), compileContracts(), collectRuntimeBytecodes() (+10 more)

### Community 1 - "Graph Building Pipeline"
Cohesion: 0.11
Nodes (15): parseArgs(), ndjson(), runGraphBuilder(), runIncidentClusterer(), runReportGenerator(), main(), sha256File(), walkDir() (+7 more)

### Community 2 - "Signal Detection Engine"
Cohesion: 0.28
Nodes (19): deployContract(), fundAddress(), getBalance(), getProvider(), getSigners(), mineBlocks(), deploySystem(), deployVictims() (+11 more)

### Community 3 - "Frontend Components"
Cohesion: 0.29
Nodes (10): confidenceToSeverity(), findFirstFile(), listRuns(), loadForensicBundle(), readJsonSafe(), readNdjson(), ruleCategory(), collectFromFiles() (+2 more)

### Community 4 - "Backend API Routes"
Cohesion: 0.24
Nodes (3): hexToRgb(), SmokeBackground(), SmokeRenderer

### Community 5 - "Data Models"
Cohesion: 0.53
Nodes (7): ChainIcon(), f(), FingerprintIcon(), Grid(), PulsingOrb(), Scanlines(), sp()

### Community 6 - "Forensics Modules"
Cohesion: 0.4
Nodes (9): classColor(), esc(), fmt(), getArg(), main(), ollamaGenerate(), readJson(), resolvePaths() (+1 more)

### Community 7 - "UI Pages"
Cohesion: 0.56
Nodes (6): f(), Heartbeat(), hexByte(), Scanlines(), seed(), sp()

### Community 8 - "Design System"
Cohesion: 0.39
Nodes (7): f(), Grid(), hexAddr(), Scanlines(), SceneFade(), seed(), sp()

### Community 9 - "Animations"
Cohesion: 0.56
Nodes (5): clamp(), ease(), Grid(), HeroBg(), ScanLine()

### Community 10 - "Component 10"
Cohesion: 0.25
Nodes (1): ForensicsAPI

### Community 11 - "Component 11"
Cohesion: 0.71
Nodes (5): chat(), chatViaGemini(), checkOllamaHealth(), getGeminiKey(), resolveBaseUrl()

### Community 12 - "Component 12"
Cohesion: 0.57
Nodes (3): f(), HexGrid(), seed()

### Community 13 - "Component 13"
Cohesion: 0.48
Nodes (5): buildLayout(), formatEth(), parseEth(), SvgDefs(), truncAddr()

### Community 14 - "Component 14"
Cohesion: 0.53
Nodes (4): buildSimArgs(), findLatestRun(), run(), writeRunSummary()

### Community 15 - "Component 15"
Cohesion: 0.53
Nodes (4): MiniFundFlowSVG(), MiniSparkline(), NoiseOverlay(), severityColor()

### Community 16 - "Component 16"
Cohesion: 0.73
Nodes (4): buildPrompt(), checkOllama(), main(), ollamaGenerate()

### Community 17 - "Component 17"
Cohesion: 0.73
Nodes (4): buildTraceEdges(), flattenTrace(), ndjson(), runDerivedPipeline()

### Community 18 - "Component 18"
Cohesion: 0.53
Nodes (4): f(), Grid(), Scanlines(), sp()

### Community 19 - "Component 19"
Cohesion: 0.53
Nodes (4): ExpandedDetails(), getThreatLevel(), SignalBadge(), SkeletonCard()

### Community 20 - "Component 20"
Cohesion: 0.6
Nodes (3): f(), hexAddr(), seed()

### Community 21 - "Component 21"
Cohesion: 0.6
Nodes (3): buildSystemContext(), handleKeyDown(), uid()

### Community 22 - "Component 22"
Cohesion: 0.6
Nodes (3): buildFrag(), DitheringShader(), hexToRgb()

### Community 23 - "Component 23"
Cohesion: 0.6
Nodes (3): humanizeSignal(), truncAddr(), truncHash()

### Community 24 - "Component 24"
Cohesion: 0.6
Nodes (3): getThreatLevel(), handleExport(), SeverityBar()

### Community 25 - "Component 25"
Cohesion: 0.8
Nodes (3): convertToDot(), loadNdjson(), processDir()

### Community 26 - "Component 26"
Cohesion: 0.8
Nodes (3): extractMlFeatures(), flattenTrace(), ndjson()

### Community 27 - "Component 27"
Cohesion: 0.8
Nodes (3): groupBy(), makeSignal(), runSignalsEngine()

### Community 28 - "Component 28"
Cohesion: 0.4
Nodes (5): Deterministic Layer 1 Transforms (no randomness), Evidence-First Reporting Principle, Layer 1: Derived Datasets (36 deterministic transforms), Layer 2: Signals Engine (28 heuristic rules), EVM Forensics Agent

### Community 29 - "Component 29"
Cohesion: 0.5
Nodes (5): Forensic Analysis, Incident Detection, Money Flow Tracing, Forensic Report Run 0bcbbae3, Forensic Report Run a636493

### Community 30 - "Component 30"
Cohesion: 0.83
Nodes (2): main(), runCommand()

### Community 31 - "Component 31"
Cohesion: 0.67
Nodes (2): hexAddr(), seed()

### Community 32 - "Component 32"
Cohesion: 0.83
Nodes (2): ShaderCanvas(), useShaderBackground()

### Community 33 - "Component 33"
Cohesion: 0.67
Nodes (2): normalizeBundle(), useForensicData()

### Community 34 - "Component 34"
Cohesion: 0.83
Nodes (2): go(), handler()

### Community 35 - "Component 35"
Cohesion: 0.67
Nodes (2): getAttackInfo(), truncAddr()

### Community 36 - "Component 36"
Cohesion: 0.83
Nodes (2): main(), ollamaGenerate()

### Community 37 - "Component 37"
Cohesion: 0.67
Nodes (2): handleOutside(), handleSelect()

### Community 38 - "Component 38"
Cohesion: 0.67
Nodes (2): WordsPullUp(), WordsPullUpMultiStyle()

### Community 39 - "Component 39"
Cohesion: 0.67
Nodes (1): handleSend()

### Community 40 - "Component 40"
Cohesion: 0.67
Nodes (1): Button()

### Community 41 - "Component 41"
Cohesion: 0.67
Nodes (1): EvidencePanel()

### Community 42 - "Component 42"
Cohesion: 0.67
Nodes (1): Footer()

### Community 43 - "Component 43"
Cohesion: 0.67
Nodes (1): Layout()

### Community 44 - "Component 44"
Cohesion: 0.67
Nodes (1): Sidebar()

### Community 45 - "Component 45"
Cohesion: 0.67
Nodes (1): mapRange()

### Community 46 - "Component 46"
Cohesion: 0.67
Nodes (1): HorizonBackground()

### Community 47 - "Component 47"
Cohesion: 0.67
Nodes (1): ThermodynamicGrid()

### Community 48 - "Component 48"
Cohesion: 0.67
Nodes (1): useAIChat()

### Community 49 - "Component 49"
Cohesion: 0.67
Nodes (1): handleEnter()

### Community 50 - "Component 50"
Cohesion: 0.67
Nodes (1): CountUp()

### Community 51 - "Component 51"
Cohesion: 0.67
Nodes (1): NoiseOverlay()

### Community 52 - "Component 52"
Cohesion: 0.67
Nodes (1): RemotionRoot()

### Community 53 - "Component 53"
Cohesion: 1.0
Nodes (2): Backend: Express.js API Server, Module: Ingestion (RPC/raw file import)

### Community 54 - "Component 54"
Cohesion: 1.0
Nodes (2): Investigation Dashboard - Three-Panel Layout, Investigation Page - Three-Panel Analysis

### Community 55 - "Component 55"
Cohesion: 1.0
Nodes (2): AI Chat Copilot - Ollama Integration, Module: AI Analyst (Ollama)

### Community 108 - "Component 108"
Cohesion: 1.0
Nodes (1): UI Implementation - 10 Task Build

### Community 109 - "Component 109"
Cohesion: 1.0
Nodes (1): Ferrari-Inspired Design System

### Community 110 - "Component 110"
Cohesion: 1.0
Nodes (1): Layer 3: ML Risk Scoring

### Community 111 - "Component 111"
Cohesion: 1.0
Nodes (1): Frontend: React 19 + TypeScript + Tailwind CSS

### Community 112 - "Component 112"
Cohesion: 1.0
Nodes (1): Simulation Engine using Anvil (Foundry)

### Community 113 - "Component 113"
Cohesion: 1.0
Nodes (1): Landing Page - Hero and Features

### Community 114 - "Component 114"
Cohesion: 1.0
Nodes (1): Module: Signals Engine (28 rules)

## Knowledge Gaps
- **16 isolated node(s):** `UI Implementation - 10 Task Build`, `Ferrari-Inspired Design System`, `Layer 2: Signals Engine (28 heuristic rules)`, `Layer 3: ML Risk Scoring`, `Frontend: React 19 + TypeScript + Tailwind CSS` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Component 10`** (8 nodes): `ForensicsAPI`, `.constructor()`, `.exportReport()`, `.getForensicRun()`, `.listRuns()`, `.sendChatMessage()`, `api.ts`, `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 30`** (4 nodes): `ingest_raw.js`, `main()`, `runCommand()`, `ingest_raw.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 31`** (4 nodes): `hexAddr()`, `seed()`, `AmbientLoop.tsx`, `AmbientLoop.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 32`** (4 nodes): `ShaderCanvas()`, `useShaderBackground()`, `animated-shader-hero.tsx`, `animated-shader-hero.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 33`** (4 nodes): `useForensicData.ts`, `useForensicData.ts`, `normalizeBundle()`, `useForensicData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 34`** (4 nodes): `go()`, `handler()`, `About.tsx`, `About.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 35`** (4 nodes): `GraphsPage.tsx`, `getAttackInfo()`, `truncAddr()`, `GraphsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 36`** (4 nodes): `storyboard_generator.js`, `storyboard_generator.js`, `main()`, `ollamaGenerate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 37`** (4 nodes): `Navbar.tsx`, `Navbar.tsx`, `handleOutside()`, `handleSelect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 38`** (4 nodes): `WordsPullUp.tsx`, `WordsPullUp.tsx`, `WordsPullUp()`, `WordsPullUpMultiStyle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 39`** (3 nodes): `handleSend()`, `AIChat.tsx`, `AIChat.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 40`** (3 nodes): `Button()`, `Button.tsx`, `Button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 41`** (3 nodes): `EvidencePanel()`, `EvidencePanel.tsx`, `EvidencePanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 42`** (3 nodes): `Footer()`, `Footer.tsx`, `Footer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 43`** (3 nodes): `Layout.tsx`, `Layout()`, `Layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 44`** (3 nodes): `Sidebar.tsx`, `Sidebar.tsx`, `Sidebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 45`** (3 nodes): `mapRange()`, `etheral-shadow.tsx`, `etheral-shadow.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 46`** (3 nodes): `horizon-hero-section.tsx`, `HorizonBackground()`, `horizon-hero-section.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 47`** (3 nodes): `interactive-thermodynamic-grid.tsx`, `ThermodynamicGrid()`, `interactive-thermodynamic-grid.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 48`** (3 nodes): `useAIChat.ts`, `useAIChat.ts`, `useAIChat()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 49`** (3 nodes): `Intro.tsx`, `handleEnter()`, `Intro.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 50`** (3 nodes): `ProductPitch.tsx`, `ProductPitch.tsx`, `CountUp()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 51`** (3 nodes): `Upcoming.tsx`, `Upcoming.tsx`, `NoiseOverlay()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 52`** (3 nodes): `Root.tsx`, `Root.tsx`, `RemotionRoot()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 53`** (2 nodes): `Backend: Express.js API Server`, `Module: Ingestion (RPC/raw file import)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 54`** (2 nodes): `Investigation Dashboard - Three-Panel Layout`, `Investigation Page - Three-Panel Analysis`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 55`** (2 nodes): `AI Chat Copilot - Ollama Integration`, `Module: AI Analyst (Ollama)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 108`** (1 nodes): `UI Implementation - 10 Task Build`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 109`** (1 nodes): `Ferrari-Inspired Design System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 110`** (1 nodes): `Layer 3: ML Risk Scoring`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 111`** (1 nodes): `Frontend: React 19 + TypeScript + Tailwind CSS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 112`** (1 nodes): `Simulation Engine using Anvil (Foundry)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 113`** (1 nodes): `Landing Page - Hero and Features`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component 114`** (1 nodes): `Module: Signals Engine (28 rules)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `Graph Building Pipeline` to `Component 27`, `Component 17`, `Component 26`, `Frontend Components`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `main()` connect `Simulation Infrastructure` to `Signal Detection Engine`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `collectRaw()` connect `Frontend Components` to `Graph Building Pipeline`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runScenario()` (e.g. with `fundAddress()` and `deployContract()`) actually correct?**
  _`runScenario()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `main()` (e.g. with `applyCliOverrides()` and `startAnvil()`) actually correct?**
  _`main()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `main()` (e.g. with `parseArgs()` and `resolveWindow()`) actually correct?**
  _`main()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `UI Implementation - 10 Task Build`, `Ferrari-Inspired Design System`, `Layer 2: Signals Engine (28 heuristic rules)` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._