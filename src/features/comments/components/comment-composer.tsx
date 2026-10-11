'use client';

import { type ReactElement, useCallback, useMemo, useRef } from 'react';

import {
  type CommentSubmitHandler,
  type CommentSubmitInput,
  type ComposerHandle,
  ComposerGate,
  ComposerLazy,
  createHttpComposerServices,
  type SubmitResult,
} from '@/features/composer';
import { useActionResult } from '@/lib/client/action-result';
import { ErrorCode, ok, type Result } from '@/lib/errors';

import { createComment } from '../server/actions';

/** Ortak `useActionResult` taslağı kaydedip yönlendirir (gönderi composer'ıyla aynı kodlar). */
const REDIRECTING_ERRORS: ReadonlySet<ErrorCode> = new Set([
  ErrorCode.UNAUTHENTICATED,
  ErrorCode.ONBOARDING_REQUIRED,
  ErrorCode.LEGAL_ACCEPTANCE_REQUIRED,
]);

export type CreateCommentAction = (
  input: CommentSubmitInput
) => Promise<Result<{ commentId: number }>>;

type CommentComposerProps = {
  postId: number;
  /** Girişli görüntüleyenin iç kimliği; `null` → anonim (giriş çağrısı). */
  viewerId: number | null;
  /** "Yanıtlanan: @…" satırı (composer genişleyince). */
  replyToUsername: string;
  /** Anonim için giriş hedefi (`/giris?next=<bu sayfa>`). */
  loginHref: string;
  signupHref: string;
  onSubmitted: (commentId: number) => void;
  /** Test/önizleme için action yerine geçer. */
  action?: CreateCommentAction;
};

/**
 * Yorum composer'ı (S8 `mode: 'comment'`, gerçek `createComment`'e bağlı). Auth durumu sunucudan
 * geldiği için "bilinmiyor" hali yoktur (flash yok): anonime giriş çağrısı, girişliye composer.
 * Kısa yatırım uyarısı composer odaklanınca görünür ([LEG-06], `legal.disclaimer.comment`).
 */
export const CommentComposer = ({
  postId,
  viewerId,
  replyToUsername,
  loginHref,
  signupHref,
  onSubmitted,
  action = createComment,
}: CommentComposerProps): ReactElement => {
  const handleResult = useActionResult();
  const handleRef = useRef<ComposerHandle>(null);
  const services = useMemo(() => createHttpComposerServices(), []);

  const onSubmit = useCallback<CommentSubmitHandler>(
    async (input): Promise<SubmitResult> => {
      const result = await action(input);
      if (result.ok) return ok({ id: result.data.commentId });
      if (REDIRECTING_ERRORS.has(result.error)) {
        handleResult(result, { onSessionExpired: () => handleRef.current?.saveDraft() });
      }
      return result;
    },
    [action, handleResult]
  );

  return (
    <ComposerGate
      viewer={
        viewerId === null ? { status: 'anonymous' } : { status: 'authenticated', userId: viewerId }
      }
      mode='comment'
      loginHref={loginHref}
      signupHref={signupHref}
    >
      {userId => (
        <ComposerLazy
          mode='comment'
          postId={postId}
          replyToUsername={replyToUsername}
          draftOwnerId={userId}
          services={services}
          onSubmit={onSubmit}
          onSubmitted={onSubmitted}
          loginHref={loginHref}
          handleRef={handleRef}
        />
      )}
    </ComposerGate>
  );
};
