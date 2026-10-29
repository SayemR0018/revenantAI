import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Ecosystem, Successor } from '@/lib/types';
import { getTombstone } from '@/lib/tombstones';
import { findSuccessors } from '@/lib/successors';
import { chatJson, providerFor } from '@/lib/llm';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ResurrectBody {
  eco?: Ecosystem;
  name?: string;
  successor?: string;
  versionSpec?: string;
}

function buildDeterministicPlan(
  eco: Ecosystem,
  name: string,
  target: Successor | null,
  deprecationMessage?: string,
): string[] {
  const steps: string[] = [];
  if (deprecationMessage) {
    steps.push(`Review official registry deprecation notice: "${deprecationMessage}".`);
  }
  if (!target) {
    if (name === 'left-pad') {
      steps.push(
        `Replace imports of "${name}" with native JavaScript String.prototype.padStart().`,
        `Remove "${name}" from your ${eco === 'npm' ? 'package.json' : 'requirements.txt'} and lockfile.`,
        `Run your test suite to confirm identical string padding behavior.`,
      );
      return steps;
    }
    steps.push(
      `Audit call sites importing "${name}" across your codebase.`,
      `Evaluate native runtime APIs or actively maintained forks before vendoring.`,
      `Remove "${name}" from your manifest once call sites are migrated and tests pass.`,
    );
    return steps;
  }

  if (eco === 'npm') {
    steps.push(
      `Uninstall "${name}" and install "${target.name}" (${target.reason}): npm uninstall ${name} && npm install ${target.name}`,
      `Update import/require statements from "${name}" to "${target.name}" and adapt call signatures where needed.`,
      `Run your typecheck and test suite to verify compatibility before opening an approval-gated pull request.`,
    );
  } else {
    steps.push(
      `Replace "${name}" with "${target.name}" (${target.reason}) in requirements.txt or pyproject.toml: pip uninstall -y ${name} && pip install ${target.name}`,
      `Update Python imports referencing "${name}" to "${target.name}" and run pytest.`,
      `Review the manifest diff below and approve before creating a pull request.`,
    );
  }
  return steps;
}

function buildManifestDiff(
  eco: Ecosystem,
  name: string,
  target: Successor | null,
  versionSpec?: string,
): string {
  const spec = versionSpec?.trim() || '^1.0.0';
  if (eco === 'npm') {
    const replacement = target
      ? `+    "${target.name}": "latest"`
      : `+    // "${name}" removed — replaced by built-in runtime API`;
    return [
      '--- a/package.json',
      '+++ b/package.json',
      '@@ -1,4 +1,4 @@',
      '   "dependencies": {',
      `-    "${name}": "${spec}"`,
      replacement,
      '   }',
    ].join('\n');
  }
  const pySpec = versionSpec?.trim() ? `${name}${versionSpec.trim()}` : name;
  const pyReplacement = target ? `+${target.name}` : `+# ${name} removed`;
  return [
    '--- a/requirements.txt',
    '+++ b/requirements.txt',
    '@@ -1,2 +1,2 @@',
    `-${pySpec}`,
    pyReplacement,
  ].join('\n');
}

export async function POST(req: NextRequest) {
  let body: ResurrectBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const eco = body.eco;
  const name = body.name?.trim();
  if ((eco !== 'npm' && eco !== 'pypi') || !name) {
    return NextResponse.json({ error: 'eco (npm|pypi) and name are required' }, { status: 400 });
  }

  const t = await getTombstone(eco, name).catch(() => null);
  const vitals = t?.vitals ?? {};
  const successors =
    t?.successors && t.successors.length > 0
      ? t.successors
      : await findSuccessors({ ecosystem: eco, name }, vitals).catch(() => []);

  const target =
    (body.successor ? successors.find((s) => s.name === body.successor) : undefined) ??
    successors[0] ??
    null;

  let plan = buildDeterministicPlan(eco, name, target, vitals.deprecationMessage);
  let generatedBy = 'deterministic-rules';

  const provider = providerFor('autopsy');
  if (provider && target) {
    try {
      const { data, result } = await chatJson(
        provider.id,
        [
          {
            role: 'system',
            content:
              'Return strict JSON: {"steps": string[]} with 3 to 4 concise, concrete migration steps to replace a deprecated/abandoned package with the chosen successor.',
          },
          {
            role: 'user',
            content: `Ecosystem: ${eco}\nPackage: ${name}\nChosen successor: ${target.name} (${target.reason})\nDeprecation note: ${vitals.deprecationMessage ?? 'none'}`,
          },
        ],
        z.object({ steps: z.array(z.string()).min(2).max(6) }),
      );
      if (data?.steps?.length) {
        plan = data.steps;
        generatedBy = `${result?.provider ?? provider.id}/${result?.model ?? 'default'}`;
      }
    } catch {
      /* keep deterministic plan */
    }
  }

  const diff = buildManifestDiff(eco, name, target, body.versionSpec);
  const auth0Configured = Boolean(
    process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET,
  );

  return NextResponse.json({
    eco,
    name,
    selectedSuccessor: target?.name ?? null,
    successors,
    plan,
    diff,
    generatedBy,
    auth0Configured,
  });
}
