#!/usr/bin/env node
// Firebase Auth emulator'ünü E2E için başlatır (ADR-0003 Karar 4). `firebase-tools` bağımlılık
// olarak eklenmez (çok büyük); sabit sürümle npx üzerinden çalışır. `demo-` önekli proje
// gerçek bir Firebase projesine bağlanmaz ve kimlik bilgisi istemez.
//
// Port `E2E_AUTH_EMULATOR_PORT` ile değiştirilebilir (paralel worktree koşuları için); yapılandırma
// .tmp/ altına yazılır, kökteki firebase.json elle kullanım içindir.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FIREBASE_TOOLS_VERSION = '15.33.0';
const PROJECT_ID = 'demo-borsaliyorum';
const port = Number(process.env.E2E_AUTH_EMULATOR_PORT ?? 9099);

const configDir = path.resolve('.tmp/firebase-e2e');
mkdirSync(configDir, { recursive: true });
const configPath = path.join(configDir, 'firebase.json');
writeFileSync(
  configPath,
  JSON.stringify({
    emulators: {
      auth: { host: '127.0.0.1', port },
      ui: { enabled: false },
      hub: { host: '127.0.0.1', port: port + 300 },
      logging: { host: '127.0.0.1', port: port + 400 },
      singleProjectMode: true,
    },
  })
);

const child = spawn(
  'npx',
  [
    '-y',
    `firebase-tools@${FIREBASE_TOOLS_VERSION}`,
    'emulators:start',
    '--only',
    'auth',
    '--project',
    PROJECT_ID,
    '--config',
    configPath,
  ],
  {
    stdio: 'inherit',
    cwd: configDir,
    env: { ...process.env, FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true' },
  }
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', code => process.exit(code ?? 0));
