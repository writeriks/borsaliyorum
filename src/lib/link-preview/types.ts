/** İstemciye giden önizleme DTO'su; düz metindir, render'da escape edilir. Görsel yok (K6). */
export type LinkPreviewDto = {
  /** Kartın link verdiği URL (kanonik, izleme parametresiz). */
  readonly url: string;
  /**
   * Kartta her zaman görünen kaynak alan adı (legal: kaynak host görünür). Aynı site içi
   * yönlendirmede içeriğin geldiği son adresin host'udur.
   */
  readonly host: string;
  readonly siteName: string | null;
  readonly title: string;
  readonly description: string | null;
};
