/**
 * "Geri" butonunun kararı için: bu belge içinde uygulamanın kendi sayfasından istemci geçişiyle mi
 * gelindi? Modül durumu yalnızca aynı belgede yaşar (tam sayfa yükleme/yenilemede sıfırlanır).
 * İşaretliyse `router.back()` akışa döner ve tarayıcı kaydırma konumunu geri yükler; değilse
 * (doğrudan link, yeni sekme) geri gidilecek uygulama sayfası yoktur, sabit hedefe gidilir.
 * Saklanan hiçbir şey kişisel veri değildir ve depolamaya yazılmaz.
 */
let cameFromApp = false;

export const markInAppNavigation = (): void => {
  cameFromApp = true;
};

/** Okur ve sıfırlar: geri dönüldükten sonra aynı işaret ikinci kez kullanılmasın. */
export const consumeInAppNavigation = (): boolean => {
  const value = cameFromApp;
  cameFromApp = false;
  return value;
};

export const hasInAppNavigation = (): boolean => cameFromApp;
