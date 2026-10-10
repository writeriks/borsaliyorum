import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { z } from 'zod';

/**
 * Lazy (`next/dynamic`) chunk bütçeleri. `react-loadable-manifest.json` her dinamik import'un
 * yüklediği dosyaları listeler; bütçe bu dosyaların gzip toplamına uygulanır. Bir bütçe,
 * chunk'ın içinde geçen benzersiz bir işaret dizesiyle bulunur (hash'li dosya adları değişir).
 */
export type LazyBudget = {
  name: string;
  /** Yalnızca bu modül grafiğinde geçen dize (ör. bir ProseMirror `PluginKey` adı). */
  marker: string;
  maxGzipBytes: number;
};

export const LAZY_BUDGETS: readonly LazyBudget[] = [
  // ADR-0002 Karar 3. Hedef 100 KB gz; ölçülen 102,5 KB (TipTap çekirdeği + ProseMirror ≈ 82 KB).
  // Kalan fark `@tiptap/core`'u bırakmayı gerektiriyor (ADR kararı). O zamana kadar gerileme
  // kapısı: ölçüm + ~1,5 KB pay. Bütçeyi büyütmek ADR-0002 güncellemesi ister.
  { name: 'composer', marker: 'ac-resolve-cashtag', maxGzipBytes: 104 * 1024 },
];

export type LoadableEntry = { id: string; files: readonly string[] };

export type MeasuredEntry = LoadableEntry & { gzipBytes: number; text: string };

export type BudgetResult = {
  budget: LazyBudget;
  /** `null`: işaretli chunk build'de bulunamadı (bütçe ölçülemedi → başarısız sayılır). */
  gzipBytes: number | null;
  files: readonly string[];
  ok: boolean;
};

const manifestSchema = z.record(z.string(), z.object({ files: z.array(z.string()) }));

/** Manifestteki benzersiz giriş kümesi (aynı chunk birden çok sayfanın manifestinde olabilir). */
export const collectLoadableEntries = (manifests: readonly unknown[]): LoadableEntry[] => {
  const byKey = new Map<string, LoadableEntry>();
  for (const manifest of manifests) {
    const parsed = manifestSchema.safeParse(manifest);
    if (!parsed.success) continue;
    for (const [id, { files }] of Object.entries(parsed.data)) {
      const js = files.filter(file => file.endsWith('.js'));
      if (js.length === 0) continue;
      const key = [...js].sort().join('|');
      if (!byKey.has(key)) byKey.set(key, { id, files: js });
    }
  }
  return [...byKey.values()];
};

export const evaluateBudgets = (
  entries: readonly MeasuredEntry[],
  budgets: readonly LazyBudget[] = LAZY_BUDGETS
): BudgetResult[] =>
  budgets.map(budget => {
    const matches = entries.filter(entry => entry.text.includes(budget.marker));
    if (matches.length === 0) return { budget, gzipBytes: null, files: [], ok: false };
    // Aynı işaret birden çok girişte varsa en büyüğü bütçeyi belirler
    const largest = matches.reduce((a, b) => (b.gzipBytes > a.gzipBytes ? b : a));
    return {
      budget,
      gzipBytes: largest.gzipBytes,
      files: largest.files,
      ok: largest.gzipBytes <= budget.maxGzipBytes,
    };
  });

/** Bir girişin dosyalarını okuyup gzip (varsayılan seviye, CDN'e yakın) boyutunu ölçer. */
export const measureEntry = async (
  distDir: string,
  entry: LoadableEntry
): Promise<MeasuredEntry> => {
  let gzipBytes = 0;
  let text = '';
  for (const file of entry.files) {
    const content = await readFile(path.join(distDir, file));
    gzipBytes += gzipSync(content).length;
    text += content.toString('utf8');
  }
  return { ...entry, gzipBytes, text };
};

export const formatKb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;
