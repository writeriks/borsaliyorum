import { randomBytes } from 'node:crypto';

import { expect, type Locator, type Page } from '@playwright/test';
import { Client } from 'pg';

import tr from '../../../messages/tr.json' with { type: 'json' };

import { AUTH_EMULATOR_HOST, E2E_PROJECT_ID, e2eDatabaseUrl } from './env';

/**
 * E2E auth yardımcıları (ADR-0003 Karar 4). Hesaplar emulator'ün REST API'siyle açılır
 * (`Authorization: Bearer owner` emulator'de yönetici yetkisidir); DB tarafı ya onboarding UI'ı
 * ile ya da `seedOnboardedUser` ile. Her test kendi benzersiz kullanıcısını kullanır.
 */
const EMULATOR = `http://${AUTH_EMULATOR_HOST}`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

export type TestAccount = {
  readonly uid: string;
  readonly email: string;
  readonly password: string;
  readonly username: string;
  readonly displayName: string;
};

export const uniqueSuffix = (): string => randomBytes(4).toString('hex');

/** Emulator'de e-posta/şifre hesabı açar. */
export const createFirebaseAccount = async ({
  emailVerified = true,
}: { emailVerified?: boolean } = {}): Promise<Omit<TestAccount, 'username' | 'displayName'>> => {
  const suffix = uniqueSuffix();
  const email = `e2e_${suffix}@example.test`;
  const password = `Sifre-${suffix}!`;
  const response = await fetch(
    `${EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${E2E_PROJECT_ID}/accounts`,
    { method: 'POST', headers: OWNER, body: JSON.stringify({ email, password, emailVerified }) }
  );
  expect(response.ok, await response.clone().text()).toBe(true);
  const { localId } = (await response.json()) as { localId: string };
  return { uid: localId, email, password };
};

export const withDb = async <T>(fn: (client: Client) => Promise<T>): Promise<T> => {
  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
};

/** Onboarding'i tamamlanmış kullanıcı (Firebase + DB satırı). */
export const seedOnboardedUser = async (): Promise<TestAccount> => {
  const account = await createFirebaseAccount();
  const username = `e2e_${uniqueSuffix()}`;
  const displayName = 'Ece Test';
  await withDb(client =>
    client.query(
      `INSERT INTO "User" ("firebaseUserId", username, "displayName", email, "isEmailVerified",
         "onboardedAt", "noticeAcknowledgedAt", "ageConfirmedAt")
       VALUES ($1, $2, $3, $4, true, now(), now(), now())`,
      [account.uid, username, displayName, account.email]
    )
  );
  return { ...account, username, displayName };
};

/** Gerçek giriş formu ile giriş (auth testleri için). */
export const loginViaUi = async (
  page: Page,
  account: Pick<TestAccount, 'email' | 'password'>,
  path = '/giris'
): Promise<void> => {
  await page.goto(path);
  await page.getByLabel(tr.auth.fields.email).fill(account.email);
  await page.getByLabel(tr.auth.fields.password).fill(account.password);
  await page.getByTestId('auth-submit').click();
};

/** Görünür hesap menüsü (masaüstü: sol menü, mobil: üst bar). */
export const accountMenu = (page: Page): Locator =>
  page.getByTestId('account-menu-trigger').filter({ visible: true });

export const signOutViaUi = async (page: Page): Promise<void> => {
  await accountMenu(page).click();
  await page.getByTestId('sign-out').click();
};
