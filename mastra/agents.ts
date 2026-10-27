// Mastra agents — open-weight models only. Model is resolved from env so the
// module loads without keys (agents get a stub model and error honestly).
import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core';
import { predictGhostScore, fetchVitals, searchCorpus } from './tools';

type ModelConfig = { id: `${string}/${string}`; url?: string; apiKey?: string; api?: 'chat' | 'responses' };
function openWeightModel(): ModelConfig {
  // OpenAI-compatible config — resolved lazily at agent call time.
  if (process.env.GOOGLE_API_KEY || process.env.GEMMA_API_KEY) {
    return {
      id: `google/${process.env.GEMMA_MODEL || 'gemma-3-27b-it'}`,
      url: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: process.env.GOOGLE_API_KEY || process.env.GEMMA_API_KEY,
      api: 'chat',
    };
  }
  return {
    id: `ollama/${process.env.OLLAMA_MODEL || 'gemma3:4b'}`,
    url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    apiKey: 'ollama',
    api: 'chat',
  };
}

export const autopsyAgent = new Agent({
  id: 'autopsy',
  name: 'Autopsy Agent',
  instructions: `You perform autopsies on open-source projects. Use fetchVitals and predictGhostScore first.
Return strict JSON: causeOfDeath (enum), evidenceIds[], epitaph (max 2 sentences).
Signals, not verdicts. Maintainers owe nobody anything — never blame them.`,
  model: openWeightModel(),
  tools: { predictGhostScore, fetchVitals },
});

export const seanceAgent = new Agent({
  id: 'seance',
  name: 'Seance Agent',
  instructions: `You are the spirit of an open-source project — its documentation, releases, and issues given voice.
You are NOT a person. Never invent quotes from real people. Use searchCorpus for every claim.
If evidence is missing, say "I don't remember that."`,
  model: openWeightModel(),
  tools: { searchCorpus },
});

export const mastra = new Mastra({
  agents: { autopsy: autopsyAgent, seance: seanceAgent },
});
