/**
 * Tam sayfa geçişi (geçmişte mevcut girdinin yerine). Oturum değiştiğinde istemci router
 * önbelleği eski oturumla üretilmiş yanıtları (ör. anonimken alınmış `/akis → /giris`
 * yönlendirmesi) taşır; `router.refresh()` bunları temizlemez. Ayrı modül: testte taklit edilir
 * (jsdom gezinme desteklemez).
 */
export const hardNavigate = (url: string): void => {
  window.location.replace(url);
};
