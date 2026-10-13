/**
 * Bir feature başka bir feature'ın `server/` katmanını import edemez (coding-standards):
 * ortak sunucu ihtiyacı `src/lib/`'e çıkar. Aynı feature içi ve feature dışındaki
 * dosyalar (ör. `app/` sayfaları) serbesttir.
 */
import path from 'node:path';

const FEATURE_RE = /\/src\/features\/([^/]+)\//;
const FEATURE_SERVER_RE = /\/src\/features\/([^/]+)\/server(?:\/|$)/;

const toPosix = filePath => filePath.split(path.sep).join('/');

const srcRootOf = (filename, cwd) => {
  const index = filename.lastIndexOf('/src/');
  return index === -1 ? `${toPosix(cwd)}/src` : filename.slice(0, index + '/src'.length);
};

const resolveTarget = (source, filename, cwd) => {
  if (source.startsWith('@/')) return `${srcRootOf(filename, cwd)}/${source.slice(2)}`;
  if (source.startsWith('.'))
    return toPosix(path.posix.resolve(path.posix.dirname(filename), source));
  return null;
};

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: { description: "Bir feature başka bir feature'ın server/ katmanını import edemez." },
    schema: [],
    messages: {
      crossFeatureServer:
        "'{{importer}}' özelliği '{{target}}' özelliğinin server/ katmanını import edemez; ortak ihtiyacı src/lib/'e taşı.",
    },
  },
  create(context) {
    const filename = toPosix(context.filename);
    const importer = FEATURE_RE.exec(filename)?.[1];
    if (!importer) return {};

    const check = node => {
      const source = node.source;
      if (!source || source.type !== 'Literal' || typeof source.value !== 'string') return;
      const target = resolveTarget(source.value, filename, context.cwd);
      const targetFeature = target && FEATURE_SERVER_RE.exec(`${target}/`)?.[1];
      if (targetFeature && targetFeature !== importer) {
        context.report({
          node: source,
          messageId: 'crossFeatureServer',
          data: { importer, target: targetFeature },
        });
      }
    };

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};

export default rule;
