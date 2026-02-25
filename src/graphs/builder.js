/**
 * builder.js — Graph Builder
 * Produces execution graph, fund-flow graph, and incident subgraph.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

function ndjson(records) {
    return records.map(r => JSON.stringify(r)).join('\n') + '\n';
}

export async function runGraphBuilder(derived, incidents, outputDir) {
    const bundleDir = join(outputDir, '02_forensic_bundle');
    const graphsDir = join(bundleDir, '07_graphs');

    mkdirSync(join(graphsDir, 'execution_graph'), { recursive: true });
    mkdirSync(join(graphsDir, 'fund_flow_graph'), { recursive: true });
    mkdirSync(join(graphsDir, 'incident_subgraph'), { recursive: true });

    // ── Execution Graph ──────────────────────────────────────────
    const execNodes = new Map();
    const execEdges = derived.traceEdges || [];

    for (const edge of execEdges) {
        if (edge.from && !execNodes.has(edge.from)) {
            execNodes.set(edge.from, { id: edge.from, address: edge.from, node_type: 'address' });
        }
        if (edge.to && !execNodes.has(edge.to)) {
            execNodes.set(edge.to, { id: edge.to, address: edge.to, node_type: 'address' });
        }
    }

    writeFileSync(
        join(graphsDir, 'execution_graph', 'execution_nodes_000001.ndjson'),
        ndjson([...execNodes.values()])
    );
    writeFileSync(
        join(graphsDir, 'execution_graph', 'execution_edges_000001.ndjson'),
        ndjson(execEdges.map(e => ({
            from: e.from, to: e.to, tx_hash: e.tx_hash,
            call_type: e.call_type, depth: e.depth, selector: e.selector,
        })))
    );
    writeFileSync(
        join(graphsDir, 'execution_graph', 'execution_graph_summary.json'),
        JSON.stringify({ node_count: execNodes.size, edge_count: execEdges.length }, null, 2)
    );

    // ── Fund Flow Graph ──────────────────────────────────────────
    const flowEdges = derived.fundFlowEdges || [];
    const flowNodes = new Map();

    for (const edge of flowEdges) {
        if (edge.from && !flowNodes.has(edge.from)) {
            flowNodes.set(edge.from, { id: edge.from, address: edge.from });
        }
        if (edge.to && !flowNodes.has(edge.to)) {
            flowNodes.set(edge.to, { id: edge.to, address: edge.to });
        }
    }

    writeFileSync(
        join(graphsDir, 'fund_flow_graph', 'flow_nodes_000001.ndjson'),
        ndjson([...flowNodes.values()])
    );
    writeFileSync(
        join(graphsDir, 'fund_flow_graph', 'flow_edges_000001.ndjson'),
        ndjson(flowEdges)
    );
    writeFileSync(
        join(graphsDir, 'fund_flow_graph', 'flow_graph_summary.json'),
        JSON.stringify({ node_count: flowNodes.size, edge_count: flowEdges.length }, null, 2)
    );

    // ── Incident Subgraph ────────────────────────────────────────
    const incidentSubgraphs = incidents.map(incident => {
        const txSet = new Set(incident.tx_hashes);
        const subEdges = flowEdges.filter(e => txSet.has(e.tx_hash));
        const subAddresses = new Set(incident.suspect_addresses);
        return {
            incident_id: incident.incident_id,
            node_count: subAddresses.size,
            edge_count: subEdges.length,
            nodes: [...subAddresses].map(a => ({ address: a })),
            edges: subEdges,
        };
    });

    writeFileSync(
        join(graphsDir, 'incident_subgraph', 'incident_fund_flow_subgraph_000001.ndjson'),
        ndjson(incidentSubgraphs)
    );
    writeFileSync(
        join(graphsDir, 'incident_subgraph', 'incident_subgraph_summary.json'),
        JSON.stringify({ incident_count: incidents.length }, null, 2)
    );

    console.log(`[graphs] Execution: ${execNodes.size} nodes, ${execEdges.length} edges | Flow: ${flowNodes.size} nodes, ${flowEdges.length} edges`);
}
