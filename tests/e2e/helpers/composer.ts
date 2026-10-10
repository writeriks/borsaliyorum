import { expect, type Locator, type Page, type Route } from '@playwright/test';

import tr from '../../../messages/tr.json' with { type: 'json' };
import {
  FIXTURE_FOLLOWED_TICKERS,
  FIXTURE_STOCKS,
} from '../../../src/features/composer/services/fixtures';
import { rankMockTags, rankMockUsers } from '../../../src/features/composer/services/mock';

export { tr };

type RouteBehaviour = { delayMs?: number; status?: number };

export type ComposerMocks = {
  users?: RouteBehaviour;
  tags?: RouteBehaviour;
  linkPreview?: RouteBehaviour;
};

/** Mock'lanan uçlara gelen istekler (yeniden deneme vb. sayımı için). */
export type RequestLog = { users: string[]; tags: string[]; linkPreview: string[] };

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const respond = async (
  route: Route,
  behaviour: RouteBehaviour | undefined,
  body: unknown
): Promise<void> => {
  if (behaviour?.delayMs) await sleep(behaviour.delayMs);
  const status = behaviour?.status ?? 200;
  // Sayfa kapanmış olabilir (test bitti); bekleyen yanıt sessizce düşer
  await route
    .fulfill(status === 200 ? { json: body } : { status, json: { error: 'INTERNAL' } })
    .catch(() => undefined);
};

/**
 * S7/S9 uçları henüz yok: sözleşmeye göre (ADR-0002 Karar 4, `features/composer/types.ts`)
 * Playwright route mock'ları. Veri tasarım spec'i §0 fixture'larıdır.
 */
export const mockComposerApis = async (
  page: Page,
  mocks: ComposerMocks = {}
): Promise<RequestLog> => {
  const log: RequestLog = { users: [], tags: [], linkPreview: [] };
  await page.route(
    url => url.pathname === '/api/autocomplete/stocks',
    route => respond(route, undefined, FIXTURE_STOCKS)
  );
  await page.route(
    url => url.pathname === '/api/autocomplete/stocks/default',
    route => respond(route, undefined, { source: 'following', tickers: FIXTURE_FOLLOWED_TICKERS })
  );
  await page.route(
    url => url.pathname === '/api/autocomplete/users',
    route => {
      const q = new URL(route.request().url()).searchParams.get('q') ?? '';
      log.users.push(q);
      return respond(route, mocks.users, rankMockUsers(q));
    }
  );
  await page.route(
    url => url.pathname === '/api/autocomplete/tags',
    route => {
      const q = new URL(route.request().url()).searchParams.get('q') ?? '';
      log.tags.push(q);
      return respond(route, mocks.tags, rankMockTags(q));
    }
  );
  await page.route(
    url => url.pathname === '/api/link-preview',
    route => {
      const target = new URL(route.request().url()).searchParams.get('url') ?? '';
      log.linkPreview.push(target);
      return respond(route, mocks.linkPreview, {
        status: 'ok',
        url: target,
        host: new URL(target).hostname,
        siteName: 'Örnek Haber',
        title: 'THYAO yeni hat açıyor',
        description: 'Örnek açıklama',
      });
    }
  );
  return log;
};

type OpenOptions = {
  variant?: 'inline' | 'dialog' | 'sheet' | 'comment';
  outcome?: string;
  delay?: number;
  postId?: number;
  auth?: 'authenticated' | 'unknown' | 'anonymous' | 'session';
  mocks?: ComposerMocks;
  /** Taslakları temizlemeden aç (yeniden yükleme senaryoları). */
  keepStorage?: boolean;
};

export const openComposer = async (page: Page, options: OpenOptions = {}): Promise<RequestLog> => {
  const log = await mockComposerApis(page, options.mocks);
  const params = new URLSearchParams({ services: 'http' });
  if (options.variant) params.set('variant', options.variant);
  if (options.outcome) params.set('outcome', options.outcome);
  params.set('delay', String(options.delay ?? 50));
  if (options.postId) params.set('postId', String(options.postId));
  if (options.auth) params.set('auth', options.auth);
  await page.goto(`/dev/composer?${params.toString()}`);
  return log;
};

export const editor = (page: Page, mode: 'post' | 'comment' = 'post'): Locator =>
  page.getByRole('textbox', {
    name: mode === 'post' ? tr.composer.label.post : tr.composer.label.comment,
  });

/** Editörü odaklar ve metni klavyeyle yazar. */
export const typeInEditor = async (
  page: Page,
  text: string,
  mode: 'post' | 'comment' = 'post'
): Promise<void> => {
  const box = editor(page, mode);
  await box.click();
  await page.keyboard.type(text);
};

/** Panoya düz metin (ve isteğe bağlı HTML) koyup editöre yapıştırır. */
export const pasteInEditor = async (
  page: Page,
  text: string,
  html?: string,
  mode: 'post' | 'comment' = 'post'
): Promise<void> => {
  const box = editor(page, mode);
  await box.click();
  await box.evaluate(
    (node, payload) => {
      const data = new DataTransfer();
      data.setData('text/plain', payload.text);
      if (payload.html) data.setData('text/html', payload.html);
      node.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
      );
    },
    { text, html }
  );
};

/** Editöre dışarıdan (başka sekme/uygulama) sürükle-bırak: `DataTransfer` ile `drop` olayı. */
export const dropInEditor = async (
  page: Page,
  data: { text?: string; html?: string },
  mode: 'post' | 'comment' = 'post'
): Promise<void> => {
  const box = editor(page, mode);
  await box.click();
  await box.evaluate((node, payload) => {
    const transfer = new DataTransfer();
    if (payload.text !== undefined) transfer.setData('text/plain', payload.text);
    if (payload.html !== undefined) transfer.setData('text/html', payload.html);
    const target = node.querySelector('p') ?? node;
    const rect = target.getBoundingClientRect();
    const init = {
      dataTransfer: transfer,
      bubbles: true,
      cancelable: true,
      clientX: rect.right - 1,
      clientY: rect.top + rect.height / 2,
    };
    node.dispatchEvent(new DragEvent('dragenter', init));
    node.dispatchEvent(new DragEvent('dragover', init));
    node.dispatchEvent(new DragEvent('drop', init));
  }, data);
};

export const editorText = (page: Page, mode: 'post' | 'comment' = 'post'): Promise<string> =>
  editor(page, mode).evaluate(node =>
    [...node.querySelectorAll('p')].map(p => p.textContent ?? '').join('\n')
  );

export const listbox = (page: Page, name: string): Locator => page.getByRole('listbox', { name });

export const stocksListbox = (page: Page): Locator => listbox(page, tr.ac.listbox.stocks);

export const submitButton = (page: Page): Locator => page.getByTestId('composer-submit');

/**
 * Açık liste editörün `aria-controls` → listbox bağıyla doğrulanır (tasarım §2.5, [AC-01]);
 * `aria-expanded` ARIA 1.2'de `textbox` rolünde geçersiz olduğu için kullanılmaz ([AC-23]).
 */
export const expectOpenList = async (page: Page): Promise<void> => {
  const controls = await editor(page).getAttribute('aria-controls');
  expect(controls).toBeTruthy();
  await expect(page.locator(`[id="${controls}"][role="listbox"]`)).toBeVisible();
  await expect(editor(page)).toHaveAttribute('data-ac-open', 'true');
};

export const expectCollapsedList = async (page: Page): Promise<void> => {
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(editor(page)).not.toHaveAttribute('aria-controls', /.+/);
  await expect(editor(page)).not.toHaveAttribute('aria-activedescendant', /.+/);
};

/** Bir token'ın (CSS değişkeninden) çözülmüş rengi; hesaplanan stille karşılaştırmak için. */
export const resolveTokenColor = (page: Page, token: string): Promise<string> =>
  page.evaluate(name => {
    const probe = document.createElement('span');
    probe.style.color = `hsl(var(${name}))`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
