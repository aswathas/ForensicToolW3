# Features Added

## 1. Standalone Data Ingestion (`ingest_raw.js`)
-   **Problem**: You sometimes get raw data from clients and need to run the analysis without a simulation.
-   **Solution**: Created `ingest_raw.js`.
-   **Usage**: `node ingest_raw.js --input <path_to_folder>`
-   **Result**: It runs Forensics + AI Analyst + Storyboard Generator automatically.

## 2. Graph Visualization
-   **Problem**: You wanted to know how to see the generated graphs.
-   **Solution**: Added a guide for viewing `.dot` files.
-   **VS Code**: Use "Graphviz Preview" extension.
-   **Online**: Paste `.dot` content into `viz-js.com`.

## 3. Automation Update
-   `npm run go` now runs the Manager Storyboard generator automatically.

You are all set!
