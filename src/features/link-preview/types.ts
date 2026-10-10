/** İstemciye giden önizleme DTO'su; düz metindir, render'da escape edilir. Görsel yok (K6). */
export type LinkPreviewDto = {
  /** Kartın link verdiği URL (kanonik, izleme parametresiz). */
  readonly url: string;
  /** Kartta her zaman görünen kaynak alan adı (legal: kaynak host görünür). */
  readonly host: string;
  readonly siteName: string | null;
  readonly title: string;
  readonly description: string | null;
};

/** `GET /api/link-preview` başarılı gövdesi: önizleme yoksa (engelli, hata, başlıksız) null. */
export type LinkPreviewResponse = { readonly preview: LinkPreviewDto | null };
