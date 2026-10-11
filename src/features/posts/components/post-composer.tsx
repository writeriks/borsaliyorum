'use client';

import { useRouter } from 'next/navigation';
import { type ReactElement, useCallback, useMemo, useRef } from 'react';

import {
  type ComposerHandle,
  ComposerGate,
  ComposerLazy,
  createHttpComposerServices,
  type PostSubmitHandler,
  type PostSubmitInput,
  type SubmitResult,
} from '@/features/composer';
import { useActionResult } from '@/lib/client/action-result';
import { ErrorCode, ok, type Result } from '@/lib/errors';

import { createPost } from '../server/actions';

type CreatePostAction = (input: PostSubmitInput) => Promise<Result<{ postId: number }>>;

/**
 * Composer'ın `onSubmit`'i gerçek `createPost` action'ına bağlı (S10). Hata bandı ve tekrar dene
 * composer'da (`mapSubmitError`); oturum düştüyse ortak `useActionResult` taslağı kaydedip girişe
 * (`next` ile) yönlendirir. Başarıda sunucu verisi yenilenir (yeni kart listede görünür).
 */
export const PostComposer = ({
  viewerId,
  action = createPost,
}: {
  viewerId: number;
  /** Test/önizleme için action yerine geçer. */
  action?: CreatePostAction;
}): ReactElement => {
  const router = useRouter();
  const handleResult = useActionResult();
  const handleRef = useRef<ComposerHandle>(null);
  const services = useMemo(() => createHttpComposerServices(), []);

  const onSubmit = useCallback<PostSubmitHandler>(
    async (input): Promise<SubmitResult> => {
      const result = await action(input);
      if (result.ok) return ok({ id: result.data.postId });
      if (
        result.error === ErrorCode.UNAUTHENTICATED ||
        result.error === ErrorCode.ONBOARDING_REQUIRED
      ) {
        handleResult(result, { onSessionExpired: () => handleRef.current?.saveDraft() });
      }
      return result;
    },
    [action, handleResult]
  );

  return (
    <ComposerGate viewer={{ status: 'authenticated', userId: viewerId }} mode='post'>
      {userId => (
        <ComposerLazy
          mode='post'
          draftOwnerId={userId}
          services={services}
          onSubmit={onSubmit}
          onSubmitted={() => router.refresh()}
          handleRef={handleRef}
        />
      )}
    </ComposerGate>
  );
};
