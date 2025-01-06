import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { User } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { randomUUID } from 'crypto';
import { storageBucket } from '@/services/firebase-service/firebase-admin';
import { isValidDisplayName } from '@/utils/user-utils/user-utils';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const userData: User = body['user'];

    const currentUser = (await verifyUserInRoute(request)) as User;

    // Check if display name is valid
    if (
      !isValidDisplayName(userData.displayName ? userData.displayName : currentUser.displayName)
    ) {
      const message = 'Geçersiz ad soyad.';

      return createResponse(ResponseStatus.BAD_REQUEST, message);
    }

    let downloadUrl = currentUser.profilePhoto;
    if (userData.profilePhoto && userData.profilePhoto !== currentUser.profilePhoto) {
      // Image Upload Workflow
      const base64Data = userData.profilePhoto.split(',')[1];
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

      downloadUrl = imageUrl[0];
    }

    await prisma.user.update({
      where: {
        userId: currentUser.userId,
      },
      data: {
        displayName: userData.displayName ? userData.displayName : currentUser.displayName,
        birthday: userData.birthday ? new Date(userData.birthday) : currentUser.birthday,
        profilePhoto: downloadUrl,
        bio: userData.bio ? userData.bio : currentUser.bio,
        website: userData.website ? userData.website : currentUser.website,
        // TODO: Add location to the user model
        // location: userData.location ? userData.location : currentUser.location,
        updatedAt: new Date(),
      },
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
