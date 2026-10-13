/**
 * Gönderi silindiğinde `window` üzerinde yayınlanan olay. İstemcide tutulan listeler (akışın
 * sonsuz kaydırma önbelleği) kartı sayfa yenilemesi beklemeden çıkarır; sunucu tarafı veri
 * `router.refresh()` ile ayrıca tazelenir. Yayınlayan `PostOwnerMenu`, dinleyen `FeedList`.
 */
export const POST_DELETED_EVENT = 'borsaliyorum:post-deleted';

export type PostDeletedDetail = { readonly postId: number };

export const dispatchPostDeleted = (postId: number): void => {
  window.dispatchEvent(
    new CustomEvent<PostDeletedDetail>(POST_DELETED_EVENT, { detail: { postId } })
  );
};

/** Dinleyici ekler; dönüş aboneliği kaldırır (`useEffect` temizliği). */
export const onPostDeleted = (handler: (postId: number) => void): (() => void) => {
  const listener = (event: Event): void => {
    const detail = (event as CustomEvent<PostDeletedDetail>).detail;
    if (typeof detail?.postId === 'number') handler(detail.postId);
  };
  window.addEventListener(POST_DELETED_EVENT, listener);
  return () => window.removeEventListener(POST_DELETED_EVENT, listener);
};
