/**
 * manifest.js — Integrity Manifest
 * Writes manifest.json and sha256sums.txt for the entire output bundle.
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

function sha256File(filePath) {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
}

function walkDir(dir, baseDir, files = []) {
    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath, baseDir, files);
        } else {
            files.push({ path: fullPath, rel: relative(baseDir, fullPath) });
        }
    }
    return files;
}

export async function writeManifest(outputDir) {
    const files = walkDir(outputDir, outputDir);
    const entries = [];
    const sha256Lines = [];

    for (const { path, rel } of files) {
        if (rel === 'manifest.json' || rel === 'sha256sums.txt') continue;
        try {
            const hash = sha256File(path);
            const stat = statSync(path);
            entries.push({ path: rel, sha256: hash, size_bytes: stat.size });
            sha256Lines.push(`${hash}  ${rel}`);
        } catch (e) {
            entries.push({ path: rel, sha256: null, error: e.message });
        }
    }

    const manifest = {
        generated_at: new Date().toISOString(),
        file_count: entries.length,
        files: entries,
    };

    writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writeFileSync(join(outputDir, 'sha256sums.txt'), sha256Lines.join('\n') + '\n');

    console.log(`[manifest] ✓ manifest.json + sha256sums.txt written (${entries.length} files)`);
}
