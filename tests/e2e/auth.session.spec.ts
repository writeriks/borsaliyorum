import { expect, test } from '@playwright/test';

import { loginViaUi, seedOnboardedUser } from './support/auth';

const decodeJwtPayload = (jwt: string): { iat: number; exp: number } => {
  const [, payload = ''] = jwt.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    iat: number;
    exp: number;
  };
};

test('__session çerezi HttpOnly/Secure/SameSite=Lax ve 14 günlük (1 saatlik ID token değil)', async ({
  page,
  context,
}) => {
  const account = await seedOnboardedUser();
  await loginViaUi(page, account);
  await page.waitForURL('**/akis');

  const cookies = await context.cookies();
  const session = cookies.find(cookie => cookie.name === '__session');
  expect(session).toBeDefined();
  expect(session).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });

  const { iat, exp } = decodeJwtPayload(session?.value ?? '');
  expect(exp - iat).toBeGreaterThanOrEqual(13 * 24 * 60 * 60);
  // Tarayıcı çerezi de ~14 gün tutar
  expect((session?.expires ?? 0) - Date.now() / 1000).toBeGreaterThan(13 * 24 * 60 * 60);

  // İstemcide token/PII saklanmaz
  const storage = await page.evaluate(() => JSON.stringify({ ...window.localStorage }));
  expect(storage).not.toContain(account.email);
  expect(storage).not.toContain(session?.value ?? '__none__');
  expect(cookies.find(cookie => cookie.name === '__Host-csrf')).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
  });
});
