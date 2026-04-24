/**
 * storyboard_generator.js
 *
 * Generates a "Manager's Storyboard" explaining the full attack lifecycle:
 * 1. Vulnerability (The Flaw)
 * 2. Exploitation (The Attack)
 * 3. Detection (The Forensic Evidence)
 *
 * Usage:
 *   node src/ai/storyboard_generator.js --bundle-dir <path>
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'gemma3:1b';

async function ollamaGenerate(model, prompt) {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: { temperature: 0.3, num_predict: 1200 }
            }),
        });
        if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
        const data = await res.json();
        return data.response;
    } catch (err) {
        return `[Error generating storyboard: ${err.message}]`;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const bundleDirIdx = args.indexOf('--bundle-dir');
    const bundleDir = bundleDirIdx !== -1 ? args[bundleDirIdx + 1] : null;

    if (!bundleDir) {
        console.error('Usage: node src/ai/storyboard_generator.js --bundle-dir <path>');
        process.exit(1);
    }

    const reportPath = join(bundleDir, '02_forensic_bundle', '05_reports', 'forensic_report.json');
    if (!existsSync(reportPath)) {
        console.error('Report not found. Run forensics first.', reportPath);
        process.exit(1);
    }

    // Read the main signal alerts because report.json might summarize them
    // We want the raw signals to find the juicy details.
    const signalsPath = join(bundleDir, '02_forensic_bundle', '03_signals', 'signals_000001.ndjson');
    let signals = [];
    if (existsSync(signalsPath)) {
        signals = readFileSync(signalsPath, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map(l => JSON.parse(l));
    }

    // Filter for HIGH/CRITICAL confidence signals (Signals have 'confidence' not severity)
    const criticalSignals = signals.filter(s => s.confidence === 'HIGH' || s.confidence === 'MEDIUM');

    if (criticalSignals.length === 0) {
        console.log('No significant signals found to storyboard.');
        return;
    }

    // Group by rule_id to find the attack pattern
    const rules = [...new Set(criticalSignals.map(s => s.rule_id))];
    const victim = criticalSignals[0].to_address || 'Unknown Contract'; // simplified
    const attacker = criticalSignals[0].from_address || 'Unknown Attacker';

    // Prepare context for the AI
    const prompt = `
    You are a cybersecurity expert explaining a blockchain hack to a non-technical executive manager.
    Create a "Security Incident Storyboard" based on this data:

    DATA:
    - Attack Type Detected: ${rules.join(', ')}
    - Target Victim Address: ${victim}
    - Attacker Address: ${attacker}
    - Key Forensic Signals (Raw Evidence):
    ${criticalSignals.slice(0, 5).map(s => `- ${s.rule_id}: ${JSON.stringify(s.details)}`).join('\n')}

    STORYBOARD STRUCTURE (Use these headers):
    
    # 1. The Vulnerability (The Open Door)
    Explain simply: What mistake allowed this? (e.g., "The smart contract forgot to lock the door before giving money.") Use an analogy. No code.

    # 2. The Capitalization (The Heist)
    Narrative: How did the attacker use this flaw? Step-by-step simple walkthrough (e.g., "1. Attacker asked for loan. 2. Before updating balance, they asked again..."). Mention if they used a flashloan or specific trick.

    # 3. The Detection (How We Caught Them)
    Explain which of our forensic sensors tripped. Specifically mention the role of the signals detected (e.g., "Our 'Reentrancy' sensor noticed the contract was called twice in the same transaction.").
    
    # 4. Impact & Next Steps
    Briefly state the damage (simulated) and what fixes would prevent this (e.g., "Add ReentrancyGuard").

    Tone: Professional, clear, authoritative, but accessible to a manager. No code snippets, just logic.
    `;

    console.log(`[storyboard] Generating storyboard for incident: ${rules[0]}...`);
    const narrative = await ollamaGenerate('gemma3:1b', prompt);

    const decodedDir = join(bundleDir, 'decoded');
    mkdirSync(decodedDir, { recursive: true });

    const outputPath = join(decodedDir, 'manager_storyboard.md');

    const intro = `# Executive Storyboard: Decoding the Attack\n\nGenerated for: Run ID (from path)\nDate: ${new Date().toISOString()}\n\n`;

    writeFileSync(outputPath, intro + narrative);

    console.log(`[storyboard] ✓ Generated: ${outputPath}`);
}

main().catch(console.error);
