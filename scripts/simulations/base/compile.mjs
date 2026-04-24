/**
 * compile.mjs
 * Compiles all Solidity contracts using solc-js.
 * Outputs ABI + bytecode to artifacts/ directory.
 * Handles imports by resolving relative paths.
 */
import solc from 'solc';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function compileContracts(contractsDir, artifactsDir) {
    console.log(`[compile] Compiling contracts from: ${contractsDir}`);
    mkdirSync(artifactsDir, { recursive: true });

    // Collect all .sol files
    const { readdirSync } = await import('fs');
    const solFiles = readdirSync(contractsDir).filter(f => f.endsWith('.sol'));

    // Build solc input
    const sources = {};
    for (const file of solFiles) {
        sources[file] = { content: readFileSync(join(contractsDir, file), 'utf8') };
    }

    const input = {
        language: 'Solidity',
        sources,
        settings: {
            outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
            optimizer: { enabled: false },
        },
    };

    // Import resolver for relative imports
    function findImports(importPath) {
        const fullPath = join(contractsDir, importPath);
        if (existsSync(fullPath)) {
            return { contents: readFileSync(fullPath, 'utf8') };
        }
        return { error: `File not found: ${importPath}` };
    }

    const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

    if (output.errors) {
        const errors = output.errors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
            console.error('[compile] Errors:');
            errors.forEach(e => console.error(' ', e.formattedMessage));
            throw new Error('Compilation failed');
        }
        const warnings = output.errors.filter(e => e.severity === 'warning');
        warnings.forEach(w => console.warn('[compile] Warning:', w.message));
    }

    const artifacts = {};
    for (const [file, contracts] of Object.entries(output.contracts || {})) {
        for (const [name, data] of Object.entries(contracts)) {
            const artifact = {
                contractName: name,
                sourceFile: file,
                abi: data.abi,
                bytecode: '0x' + data.evm.bytecode.object,
            };
            const outPath = join(artifactsDir, `${name}.json`);
            writeFileSync(outPath, JSON.stringify(artifact, null, 2));
            artifacts[name] = artifact;
            console.log(`[compile] ✓ ${name}`);
        }
    }

    console.log(`[compile] Done. ${Object.keys(artifacts).length} contracts compiled.`);
    return artifacts;
}

/**
 * compileAll — compile from multiple contract directories.
 * All .sol files from all dirs are merged into one solc input.
 */
export async function compileAll(contractDirs, artifactsDir) {
    const { readdirSync } = await import('fs');
    mkdirSync(artifactsDir, { recursive: true });

    const sources = {};
    const dirMap = {};

    for (const dir of contractDirs) {
        if (!existsSync(dir)) { console.warn(`[compile] Skipping missing dir: ${dir}`); continue; }
        console.log(`[compile] Scanning: ${dir}`);
        const files = readdirSync(dir).filter(f => f.endsWith('.sol'));
        for (const file of files) {
            sources[file] = { content: readFileSync(join(dir, file), 'utf8') };
            dirMap[file] = dir;
        }
    }

    console.log(`[compile] Compiling ${Object.keys(sources).length} contracts...`);

    const input = {
        language: 'Solidity',
        sources,
        settings: {
            outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
            optimizer: { enabled: false },
        },
    };

    function findImports(importPath) {
        for (const dir of contractDirs) {
            const fullPath = join(dir, importPath);
            if (existsSync(fullPath)) return { contents: readFileSync(fullPath, 'utf8') };
        }
        if (dirMap[importPath]) return { contents: readFileSync(join(dirMap[importPath], importPath), 'utf8') };
        return { error: `File not found: ${importPath}` };
    }

    const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

    if (output.errors) {
        const errors = output.errors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
            errors.forEach(e => console.error('[compile]', e.formattedMessage));
            throw new Error('Compilation failed');
        }
        output.errors.filter(e => e.severity === 'warning').forEach(w =>
            console.warn('[compile] Warning:', w.message.slice(0, 100))
        );
    }

    const artifacts = {};
    for (const [file, contracts] of Object.entries(output.contracts || {})) {
        for (const [name, data] of Object.entries(contracts)) {
            const artifact = { contractName: name, sourceFile: file, abi: data.abi, bytecode: '0x' + data.evm.bytecode.object };
            writeFileSync(join(artifactsDir, `${name}.json`), JSON.stringify(artifact, null, 2));
            artifacts[name] = artifact;
            console.log(`[compile] ✓ ${name}`);
        }
    }

    console.log(`[compile] Done. ${Object.keys(artifacts).length} contracts compiled.`);
    return artifacts;
}
