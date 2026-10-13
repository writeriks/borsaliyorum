import type { Editor } from '@tiptap/core';
import type { Transaction } from '@tiptap/pm/state';

/**
 * React effect'lerinden (ProseMirror'ın kendi olay akışı dışından) işlem göndermenin güvenli yolu.
 *
 * Neden: tarayıcının yerel silmesi (Backspace) DOM'u değiştirir, ProseMirror bunu bir
 * `MutationObserver` mikro görevinde okur. Aradaki pencerede (ör. React'in `input` olayında
 * bekleyen effect'leri koşturması) dışarıdan gelen bir işlem, görünümü eski modele göre çizer
 * ve seçimi DOM'a yazarken `IndexSizeError` fırlatır; effect içinde olduğundan sayfa
 * `error.tsx`'e düşer (S13, ENT-E02 kararsızlığının kök nedeni).
 *
 * Mikro göreve ertelemek, gözlemcinin bekleyen kaydı önce işlemesini sağlar (sıra FIFO: gözlemci
 * mikro görevi mutasyonda, bu ise sonrasında kuyruğa girer). İşlem erteleme anındaki güncel
 * durumdan üretilir; bu yüzden `build` durum yerine editörü alır.
 */
export const dispatchAfterDomSync = (
  editor: Editor,
  build: (current: Editor) => Transaction
): void => {
  queueMicrotask(() => {
    if (editor.isDestroyed) return;
    editor.view.dispatch(build(editor));
  });
};
