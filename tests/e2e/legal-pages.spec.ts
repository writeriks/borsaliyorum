import { expect, type Page, test } from './support/test';

import en from '../../messages/en.json' with { type: 'json' };
import legalEn from '../../messages/legal/en.json' with { type: 'json' };
import legalTr from '../../messages/legal/tr.json' with { type: 'json' };
import tr from '../../messages/tr.json' with { type: 'json' };
import { LEGAL_DOCUMENTS, LEGAL_HREF } from '../../src/lib/legal/versions';

const FOOTER_LABEL = {
  disclaimer: 'disclaimerLink',
  privacy: 'privacy',
  cookies: 'cookies',
  terms: 'terms',
  community: 'community',
} as const;

/**
 * Görünen footer: lg+ sağ kolondaki (<aside> içinde → contentinfo rolü yok) ya da akış altındaki.
 */
const visibleFooter = (page: Page) => page.locator('footer').filter({ visible: true }).first();

test.describe('yasal sayfalar (herkese açık, sunucuda render)', () => {
  // X-Robots-Tag: production dışı ortamlar bilinçli olarak tümden noindex (next.config.ts);
  // burada sayfanın kendisinin noindex taşımadığı kontrol edilir.
  test('/yasal/kvkk ve /en/yasal/kvkk 200; sayfa noindex taşımaz; anonim erişim', async ({
    request,
  }) => {
    for (const path of ['/yasal/kvkk', '/en/yasal/kvkk']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
      const html = await response.text();
      expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+noindex/i);
    }
  });

  test('bilinmeyen belge 404', async ({ request }) => {
    expect((await request.get('/yasal/yok')).status()).toBe(404);
  });

  test("footer'dan her yasal sayfaya gidilir; sayfa doğru başlık ve sürümü gösterir", async ({
    page,
  }) => {
    await page.goto('/');
    for (const doc of LEGAL_DOCUMENTS) {
      const footer = visibleFooter(page);
      await footer
        .getByRole('navigation', { name: tr.shell.legalNav })
        .getByRole('link', { name: tr.shell.footer[FOOTER_LABEL[doc.key]] })
        .click();
      await expect(page).toHaveURL(new RegExp(`${LEGAL_HREF[doc.key]}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        legalTr.documents[doc.key].title
      );
      await expect(page.getByTestId('legal-version')).toContainText(doc.version);
      // Dahili onay notu sayfada görünmez
      await expect(page.getByText(/avukat onayı/i)).toHaveCount(0);
    }
  });

  test('/en: footer linkleri /en önekli; İngilizce içerik', async ({ page }) => {
    await page.goto('/en/yasal/cerez-politikasi');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      legalEn.documents.cookies.title
    );
    const table = page.getByRole('region', { name: 'Cookies and browser storage in use' });
    for (const name of ['__session (cookie)', '__Host-csrf (cookie)', 'theme (local storage)']) {
      await expect(table.getByRole('rowheader', { name })).toBeVisible();
    }
    const footer = visibleFooter(page);
    await expect(footer.getByRole('link', { name: en.shell.footer.terms })).toHaveAttribute(
      'href',
      '/en/yasal/kullanim-kosullari'
    );
  });

  test('yatırım uyarısı: tam SPK metni ana içerikte; composer "Ayrıntılar" hedefi', async ({
    page,
  }) => {
    const response = await page.goto('/yasal/yatirim-uyarisi');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('main').getByText(tr.legal.disclaimer.full)).toBeVisible();
  });

  test(
    'mobil: içindekiler bağlantısı bölüm başlığını yapışkan üst barın altında bırakır',
    { tag: '@mobile' },
    async ({ page }) => {
      await page.goto('/yasal/kullanim-kosullari');
      const section = legalTr.documents.terms.sections.find(s => s.id === 'yasakli-icerik');
      await page
        .getByRole('navigation', { name: legalTr.chrome.toc })
        .getByRole('link', { name: section?.heading ?? '' })
        .click();
      await expect(page).toHaveURL(/#yasakli-icerik$/);
      const topBar = await page.getByTestId('top-bar').boundingBox();
      const heading = page.locator('#yasakli-icerik-baslik');
      await expect(heading).toBeInViewport();
      await expect
        .poll(async () => (await heading.boundingBox())?.y ?? -1)
        .toBeGreaterThanOrEqual((topBar?.y ?? 0) + (topBar?.height ?? 0));
    }
  );
});
