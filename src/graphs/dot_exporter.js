/**
 * dot_exporter.js
 *
 * Converts NDJSON graph edges into Graphviz DOT format for visualization.
 * Can process:
 * - fund_flow_graph
 * - execution_graph
 * - incident_subgraph
 *
 * Usage:
 *   node src/graphs/dot_exporter.js --input <dir> --output <dir>
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';

function loadNdjson(path) {
    if (!existsSync(path)) return [];
    return readFileSync(path, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(l => JSON.parse(l))
        .flatMap(item => {
            // If the item itself has an 'edges' array (incident subgraph format), return those edges
            if (item.edges && Array.isArray(item.edges)) return item.edges;
            // Otherwise assume the item IS the edge (fund flow format)
            return item;
        });
}

function convertToDot(edges, name) {
    let dot = `digraph "${name}" {\n`;
    dot += '    rankdir=LR;\n';
    dot += '    node [shape=box, style=filled, fillcolor="#f0f0f0", fontname="Arial"];\n';
    dot += '    edge [fontname="Arial", fontsize=10];\n';

    // Track nodes to declare them properly? Not strictly needed for basic dot
    for (const edge of edges) {
        // edge format depends on the graph type
        // fund_flow: { from, to, value_wei, ... }
        // incident: { source, target, relationship, ... }

        const from = edge.from || edge.source;
        const to = edge.to || edge.target;

        let label = '';
        if (edge.value_wei) {
            const eth = (BigInt(edge.value_wei) / 10n ** 18n).toString();
            label = `${eth} ETH`;
        } else if (edge.relationship) {
            label = edge.relationship;
        } else if (edge.call_type) {
            label = edge.call_type;
        }

        if (from && to) {
            // Shorten addresses for label readability
            const labelAttr = label ? ` [label="${label}"]` : '';
            const fShort = from.slice(0, 10);
            const tShort = to.slice(0, 10);

            dot += `    "${from}" -> "${to}"${labelAttr};\n`;
        } else if (edge.id || edge.address) {
            // Node (isolated)
            const id = edge.id || edge.address;
            const label = edge.node_type ? `\\n(${edge.node_type})` : '';
            dot += `    "${id}" [label="${id.slice(0, 10)}...${label}"];\n`;
        }
    }

    dot += '}\n';
    return dot;
}

function processDir(inputDir, outputDir) {
    mkdirSync(outputDir, { recursive: true });

    const files = readdirSync(inputDir).filter(f => f.endsWith('.ndjson'));

    for (const file of files) {
        const path = join(inputDir, file);
        console.log(`[dot] Processing ${file}...`);

        if (files.length === 0) continue;

        const edges = loadNdjson(path);
        if (edges.length === 0) {
            console.log(`[dot] Skipping ${file} (empty)`);
            continue;
        }

        // Check if empty (already done above, but careful with flatMap results)
        if (edges.length === 0) {
            console.log(`[dot] Skipping ${file} (empty items)`);
            continue;
        }

        const name = basename(file, '.ndjson');
        const dotContent = convertToDot(edges, name);

        const outPath = join(outputDir, `${name}.dot`);
        writeFileSync(outPath, dotContent);
        console.log(`[dot] Wrote ${outPath}`);
    }
}

const args = process.argv.slice(2);
const inIdx = args.indexOf('--input');
const outIdx = args.indexOf('--output');

if (inIdx === -1 || outIdx === -1) {
    console.error('Usage: node src/graphs/dot_exporter.js --input <dir> --output <dir>');
    process.exit(1);
}

processDir(args[inIdx + 1], args[outIdx + 1]);
