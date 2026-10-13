// sync-stocks.mjs'in TS'ten (prisma/seed.ts) kullanılan dışa aktarımları.
export declare const parseStockCsv: (text: string) => {
  stocks: Map<string, string>;
  invalid: string[];
};
