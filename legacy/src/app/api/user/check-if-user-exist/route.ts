import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { isValidUsername, isValidEmail, isValidDisplayName } from '@/utils/user-utils/user-utils';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const username = body['username'] as string;
    const email = body['email'] as string;
    const displayName = body['displayName'] as string;

    // Check if username is valid
    if (!isValidUsername(username)) {
      const message = 'Geçersiz kullanıcı adı.';

      return createResponse(ResponseStatus.BAD_REQUEST, message);
    }

    // Check if email is valid
    if (!isValidEmail(email)) {
      const message = 'Geçersiz e-posta.';

      return createResponse(ResponseStatus.BAD_REQUEST, message);
    }

    // Check if display name is valid
    if (!isValidDisplayName(displayName)) {
      const message = 'Geçersiz ad soyad.';

      return createResponse(ResponseStatus.BAD_REQUEST, message);
    }

    // check if email is taken
    const emailUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (emailUser && emailUser.email === email) {
      const message = 'Bu e-posta adresi ile bir kullanıcı zaten mevcut.';

      return createResponse(ResponseStatus.BAD_REQUEST, message);
    }

    // check if email is taken
    const userByUsername = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (userByUsername) {
      const message =
        'Bu kullanıcı adı daha önce alınmış. Lütfen farklı bir kullanıcı adı ile tekrar deneyin.';

      return createResponse(ResponseStatus.BAD_REQUEST, message);
    }

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.BAD_REQUEST, error as any);
  }
}
