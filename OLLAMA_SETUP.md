# How to Setup Ollama for AI Analysis

This tool uses [Ollama](https://ollama.ai) to generate the "AI Executive Summary" in the forensic report. This allows for local, private AI analysis of the blockchain data without sending keys or data to the cloud.

## 1. Install Ollama

- **Windows**: Download and install from [ollama.ai/download/windows](https://ollama.ai/download/windows).
- **Mac/Linux**: Follow instructions on [ollama.ai](https://ollama.ai).

## 2. Pull the AI Model

Open your terminal (PowerShell or Command Prompt) and run:

```powershell
ollama pull phi3:mini
```

*Note: `phi3:mini` is a 2.3GB model. It is the recommended balance between speed and reasoning quality for forensics.*

If you have very limited RAM (e.g., <8GB), use a smaller model:
```powershell
ollama pull tinyllama
```
(If you use `tinyllama`, update `sim.config.js` to set `model: 'tinyllama'`)

## 3. Start the Server

Before running the forensic tool, you must have Ollama running in the background.
Open a separate terminal window and run:

```powershell
ollama serve
```

## 4. Run the Pipeline

Now you can run the full automation:

```powershell
npm run go
```

The tool will detect the running Ollama instance and generate `06_ai/ai_executive_summary.md`.

## Troubleshooting

- **"Connection Refused"**: Ensure `ollama serve` is running in a separate window.
- **"Model not found"**: Ensure you ran `ollama pull [model_name]` and that the name matches what is in `sim.config.js`.
