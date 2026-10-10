// Eski react-mentions markup'ı: `$(THYAO)`, `#(bist100)`, `@(ali)` (legacy content-input).
const LEGACY_MARKUP_RE = /([$#@])\(([^()\n]+)\)/g;

/** `contentFormat=1` metni düz metne çevirir; sonuç aynı parser'dan geçirilir (ADR-0002 Karar 1). */
export const fromLegacyMarkup = (legacy: string): string =>
  legacy.replace(LEGACY_MARKUP_RE, '$1$2');
