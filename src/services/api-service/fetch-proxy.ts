import { auth } from '@/services/firebase-service/firebase-config';

export const apiFetchProxy = async (
  path: string,
  method?: string ,
  body?: BodyInit
): Promise<Response> => {
  const idToken = await auth.currentUser?.getIdToken();

  return fetch(`/api/${path}`, {
    method: method ?? 'GET',
    body: body,
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });
};
