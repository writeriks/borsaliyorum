// Composer'ın dışa açık yüzeyi (S11 akış, S12 detay). Çıkışta taslak temizliği `ComposerGate`
// içinde `SIGNED_OUT_EVENT` (src/lib/auth-events.ts) dinlenerek yapılır; `clearAllDrafts` yedek yol.
export {
  ComposerGate,
  ComposerLazy,
  ComposerSkeleton,
  type ComposerViewer,
} from './components/composer-lazy';
export type { ComposerHandle, ComposerProps } from './components/composer';
export { clearAllDrafts } from './lib/draft-storage';
export { createHttpComposerServices } from './services/http';
export type {
  CommentSubmitHandler,
  CommentSubmitInput,
  ComposerServices,
  PostSubmitHandler,
  PostSubmitInput,
  Sentiment,
  SubmitResult,
} from './types';
