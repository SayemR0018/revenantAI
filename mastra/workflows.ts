// Mastra workflow: Resurrection — rank successors, draft a migration plan and
// manifest diff. The PR step is gated on explicit human approval (Auth0).
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { findSuccessors } from '../lib/successors';
import { fetchSignals } from '../lib/pipeline';
import { chatJson, providerFor } from '../lib/llm';

const inSchema = z.object({ ecosystem: z.enum(['npm', 'pypi']), name: z.string(), manifestExcerpt: z.string().optional() });

const rankStep = createStep({
  id: 'rank-successors',
  inputSchema: inSchema,
  outputSchema: z.object({ successors: z.array(z.object({ name: z.string(), reason: z.string(), url: z.string().optional() })) }),
  execute: async ({ inputData }) => {
    const { vitals } = await fetchSignals({ ecosystem: inputData.ecosystem, name: inputData.name });
    const successors = await findSuccessors({ ecosystem: inputData.ecosystem, name: inputData.name }, vitals);
    return { successors: successors.map((s) => ({ name: s.name, reason: s.reason, url: s.url })) };
  },
});

const planStep = createStep({
  id: 'migration-plan',
  inputSchema: rankStep.outputSchema,
  outputSchema: z.object({ plan: z.string(), diff: z.string().optional() }),
  execute: async ({ inputData, getInitData }) => {
    const init = await getInitData<z.infer<typeof inSchema>>();
    const provider = providerFor('autopsy');
    const list = inputData.successors.map((s) => `- ${s.name} (${s.reason})`).join('\n');
    if (provider) {
      const { data } = await chatJson(
        provider.id,
        [
          { role: 'system', content: 'Output JSON: {"plan": numbered migration steps, "diff": unified-diff-style manifest change or empty}. Be concrete and minimal.' },
          { role: 'user', content: `Replace ${init.ecosystem}/${init.name} with a living successor.\nCandidates:\n${list}\nManifest excerpt: ${init.manifestExcerpt ?? '(not provided)'}` },
        ],
        z.object({ plan: z.string(), diff: z.string().optional() }),
      );
      if (data) return data;
    }
    const top = inputData.successors[0];
    return {
      plan: top
        ? `1. Install ${top.name}\n2. Replace imports of ${init.name}\n3. Run the test suite\n4. Open a PR — requires your approval before any write.`
        : `No successor found for ${init.name}. Consider vendoring or internal maintenance.`,
    };
  },
});

export const resurrectionWorkflow = createWorkflow({
  id: 'resurrection',
  inputSchema: inSchema,
  outputSchema: z.object({ plan: z.string(), diff: z.string().optional() }),
})
  .then(rankStep)
  .then(planStep)
  .commit();
