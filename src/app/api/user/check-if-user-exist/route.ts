import {
  isValidDisplayName,
  isValidEmail,
  isValidUsername,
} from '@/app/utils/user-utils/user-utils';
import { PrismaClient } from '@prisma/client';

import { NextResponse } from 'next/server';

const prisma = new PrismaClient();
export async function POST(request: Request): Promise<Response> {
  // Check if email or username is already taken
  try {
    const body = await request.json();
    const username = body['username'] as string;
    const email = body['email'] as string;
    const displayName = body['displayName'] as string;

    const badRequestProps = {
      status: 400,
      statusText: 'Bad Request',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    };

    // Check if username is valid
    if (!isValidUsername(username)) {
      const message = 'Geçersiz kullanıcı adı.';

      return NextResponse.json({ error: message }, badRequestProps);
    }

    // Check if email is valid
    if (!isValidEmail(email)) {
      const message = 'Geçersiz e-posta.';

      return NextResponse.json({ error: message }, badRequestProps);
    }

    // Check if display name is valid
    if (!isValidDisplayName(displayName)) {
      const message = 'Geçersiz ad soyad.';

      return NextResponse.json({ error: message }, badRequestProps);
    }

    // check if email is taken
    const emailUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (emailUser && emailUser.email === email) {
      const message = 'Bu e-posta adresi ile bir kullanıcı zaten mevcut.';

      return NextResponse.json({ error: message }, badRequestProps);
    }

    // check if email is taken
    const usernameUser = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (usernameUser) {
      const message =
        'Bu kullanıcı adı daha önce alınmış. Lütfen farklı bir kullanıcı adı ile tekrar deneyin.';

      return NextResponse.json({ error: message }, badRequestProps);
    }

    return new Response(null, {
      status: 200,
      statusText: 'SUCCESS',
    });
  } catch (error) {
    return new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
