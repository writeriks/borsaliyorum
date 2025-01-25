import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { User } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { isValidDisplayName, isValidUsername } from '@/utils/user-utils/user-utils';
import { uploadImage } from '@/services/api-service/api-service-helper';

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

    // Check if username is valid or already taken
    if (userData.username) {
      if (!isValidUsername(userData.username)) {
        const message = 'Geçersiz kullanıcı adı.';

        return createResponse(ResponseStatus.BAD_REQUEST, message);
      }

      const usernameUser = await prisma.user.findUnique({
        where: {
          username: userData.username,
        },
      });

      if (usernameUser) {
        const message =
          'Bu kullanıcı adı daha önce alınmış. Lütfen farklı bir kullanıcı adı ile tekrar deneyin.';

        return createResponse(ResponseStatus.BAD_REQUEST, message);
      }
    }

    let downloadUrl = currentUser.profilePhoto;
    if (userData.profilePhoto && userData.profilePhoto !== currentUser.profilePhoto) {
      downloadUrl = await uploadImage(userData.profilePhoto);
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
        location: userData.location ? userData.location : currentUser.location,
        email: userData.email ? userData.email : currentUser.email,
        username: userData.username ? userData.username : currentUser.username,
        updatedAt: new Date(),
      },
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
