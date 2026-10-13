import { randomUUID } from 'crypto';
import { storageBucket } from '@/services/firebase-service/firebase-admin';

/**
 * Uploads an image to a storage bucket and returns the download URL.
 *
 * @param imageData - The base64 encoded image data.
 * @returns A promise that resolves to the download URL of the uploaded image.
 */
export const uploadImage = async (imageData: string): Promise<string> => {
  const base64Data = imageData.split(',')[1];
  const fileName = `${randomUUID()}_${Date.now()}.jpg`;

  const file = storageBucket.file(`images/${fileName}`);

  await file.save(Buffer.from(base64Data, 'base64'), {
    contentType: 'image/jpeg',
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: randomUUID(),
      },
    },
  });

  // Get the download URL for the uploaded image
  const imageUrl = await file.getSignedUrl({
    action: 'read',
    expires: '01-01-2100',
  });

  return imageUrl[0];
};
