import type { RichTextContent, StockLookup } from '@/components/rich-text';

/** Yorumun yazarı (PublicUser alt kümesi; e-posta/uid yok). */
export type CommentAuthor = { username: string; displayName: string; avatarUrl: string | null };

/**
 * Girişli görüntüleyene özel durum. `canDelete`: sahibi ya da moderatör/admin (K-A); yalnızca UI
 * içindir, yetki `deleteComment`'te DB'den yeniden kontrol edilir.
 */
export type CommentViewerState = { liked: boolean; isOwner: boolean; canDelete: boolean };

/** Yorum satırının tek girdisi; serileştirilebilir (API yanıtı ve istemci bileşeni). */
export type CommentData = {
  id: number;
  postId: number;
  author: CommentAuthor;
  createdAt: string;
  body: RichTextContent;
  stocks: StockLookup;
  likes: number;
  viewer?: CommentViewerState;
};

/** Yorum sayfası (artan sıra). `nextCursor` null → son sayfa. */
export type CommentsPage = { items: CommentData[]; nextCursor: string | null };
