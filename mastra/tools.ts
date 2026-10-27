// Mastra tools — each maps to a real capability of the pipeline.
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { featureVector, ghostScore } from '../lib/score';
import { fetchSignals } from '../lib/pipeline';
import { buildCorpus, retrieve } from '../lib/corpus';
import { DepRef } from '../lib/types';

const depSchema = z.object({
  ecosystem: z.enum(['npm', 'pypi']),
  name: z.string(),
});

export const predictGhostScore = createTool({
  id: 'predictGhostScore',
  description: 'Predict P(project abandoned within 12 months) via the TabPFN ghost-risk model (heuristic fallback). Returns 0-100 score + band.',
  inputSchema: depSchema,
  outputSchema: z.object({
    score: z.number(),
    band: z.string(),
    confidence: z.string(),
    model: z.string(),
  }),
  execute: async (inputData) => {
    const { vitals } = await fetchSignals(inputData as DepRef);
    void featureVector(vitals);
    const s = await ghostScore(vitals);
    return { score: s.score, band: s.band, confidence: s.confidence, model: s.model };
  },
});

export const fetchVitals = createTool({
  id: 'fetchVitals',
  description: 'Fetch vital signs for a package: commit pulse, release gap, bus factor, issue response, downloads.',
  inputSchema: depSchema,
  outputSchema: z.object({ vitals: z.any(), repoUrl: z.string().optional() }),
  execute: async (inputData) => {
    const { vitals, repo } = await fetchSignals(inputData as DepRef);
    return { vitals, repoUrl: repo?.url };
  },
});

export const searchCorpus = createTool({
  id: 'searchCorpus',
  description: 'Retrieve grounded excerpts from the project corpus (README, releases, issues).',
  inputSchema: depSchema.extend({ query: z.string() }),
  outputSchema: z.object({ chunks: z.array(z.object({ source: z.string(), text: z.string(), url: z.string().optional() })) }),
  execute: async (inputData) => {
    const { ecosystem, name, query } = inputData as { ecosystem: 'npm' | 'pypi'; name: string; query: string };
    const chunks = await buildCorpus({ ecosystem, name });
    return { chunks: retrieve(chunks, query, 5).map((c) => ({ source: c.source, text: c.text, url: c.url })) };
  },
});
