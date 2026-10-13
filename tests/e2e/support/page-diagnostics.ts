import type { BrowserContext, Page, TestInfo } from '@playwright/test';

/** Tarayıcı tarafında testin göremediği ama kök nedeni anlatan olay (ör. error.tsx'e düşüş). */
export type PageDiagnostic = {
  kind: 'pageerror' | 'console.error' | 'http.5xx' | 'requestfailed';
  /** Testin başından itibaren ms (olay sırasını sunucu günlüğüyle eşlemek için). */
  at: number;
  url: string;
  text: string;
};

/**
 * Bir bağlamdaki bütün sayfaların (açılan popup'lar dahil) yakalanmamış hatalarını,
 * `console.error` çıktılarını, 5xx yanıtlarını ve başarısız istekleri toplar.
 *
 * Neden: bir sayfa `[locale]/error.tsx`'e düştüğünde test yalnızca "eleman bulunamadı" der;
 * asıl hata (RSC 500, istemci istisnası) tarayıcıda kalır. Bu kayıt test çıktısına basılır.
 */
export const collectPageDiagnostics = (
  context: BrowserContext
): { entries: PageDiagnostic[]; dispose: () => void } => {
  const started = Date.now();
  const entries: PageDiagnostic[] = [];
  const push = (kind: PageDiagnostic['kind'], url: string, text: string): void => {
    entries.push({ kind, at: Date.now() - started, url, text });
  };
  const attach = (page: Page): void => {
    page.on('pageerror', error => push('pageerror', page.url(), error.stack ?? error.message));
    page.on('console', message => {
      if (message.type() === 'error') push('console.error', page.url(), message.text());
    });
    page.on('response', response => {
      if (response.status() >= 500) {
        push('http.5xx', response.url(), `${response.status()} ${response.statusText()}`);
      }
    });
    page.on('requestfailed', request => {
      const reason = request.failure()?.errorText ?? 'unknown';
      // Gezinme ve prefetch iptalleri normaldir; kayda girerse asıl hata gürültüde kaybolur
      if (reason !== 'net::ERR_ABORTED') push('requestfailed', request.url(), reason);
    });
  };
  for (const page of context.pages()) attach(page);
  context.on('page', attach);
  return { entries, dispose: () => context.off('page', attach) };
};

export const formatPageDiagnostics = (entries: readonly PageDiagnostic[]): string =>
  entries
    .map(entry => `  +${entry.at}ms [${entry.kind}] ${entry.url}\n    ${entry.text}`)
    .join('\n');

/**
 * Kayıtları her zaman ek (attachment) olarak saklar; test beklenenden farklı biterse (başarısız,
 * zaman aşımı) ayrıca stdout'a basar: CI günlüğünde trace açmadan görünsün.
 */
export const reportPageDiagnostics = async (
  entries: readonly PageDiagnostic[],
  testInfo: TestInfo
): Promise<void> => {
  if (entries.length === 0) return;
  await testInfo.attach('page-diagnostics.json', {
    body: JSON.stringify(entries, null, 2),
    contentType: 'application/json',
  });
  if (testInfo.status !== testInfo.expectedStatus) {
    console.log(
      `[page-diagnostics] ${testInfo.titlePath.join(' > ')} (${testInfo.project.name}, ` +
        `deneme ${testInfo.retry + 1}):\n${formatPageDiagnostics(entries)}`
    );
  }
};
