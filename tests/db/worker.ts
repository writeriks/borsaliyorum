import { inject } from 'vitest';

import { templateDatabaseName, workerDatabaseNameFor } from './config';

/**
 * Worker tarafı DB adları (yalnızca integration testlerinde, globalSetup'ın `provide` ettiği
 * koşu kimliğiyle). Test dosyası ek DB açacaksa adı `workerDatabaseName()` önekiyle kurmalı ki
 * koşu sonunda teardown onu da düşürsün.
 */
const runId = (): string => inject('testDbRunId');

export const workerDatabaseName = (): string =>
  workerDatabaseNameFor(runId(), process.env.VITEST_POOL_ID ?? '1');

export const templateDatabase = (): string => templateDatabaseName(runId());
