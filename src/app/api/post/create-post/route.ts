import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { MAX_CHARACTERS } from '@/services/api-service/post-api-service/constants';
import { auth, storageBucket } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import tagService from '@/services/tag-service/tag-service';
import { Post } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const imageData: string = body['imageData'];
    const post: Post = body['post'];

    if (post.content.length > MAX_CHARACTERS) {
      return createResponse(
        ResponseStatus.BAD_REQUEST,
        'İzin verilenden fazla karakter girdiniz. Lütfen daha kısa bir içerik girin.'
      );
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    const idToken = await auth.verifyIdToken(token);

    const { cashtags, hashtags, mentions } = tagService.getTagsFromContent(post.content);

    const stocksByCashtags = await prisma.stock.findMany({
      where: {
        ticker: {
          in: cashtags,
        },
      },
    });

    if (!cashtags.length) {
      return createResponse(
        ResponseStatus.BAD_REQUEST,
        'İçerkte herhangi bir hisse bulunamadı. Lütfen hisse etiketleyin.'
      );
    }

    const isAnyCashtagInvalid = cashtags.some(
      cashtag => !stocksByCashtags.find(stock => stock.ticker === cashtag)
    );

    if (isAnyCashtagInvalid) {
      return createResponse(
        ResponseStatus.BAD_REQUEST,
        'İçerikte geçen hisselerden en az biri geçersiz. Lütfen geçerli hisse etiketleyin.'
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        firebaseUserId: idToken.uid,
      },
    });

    if (!user) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    let downloadUrl: string | undefined;
    if (imageData) {
      // Image Upload Workflow
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

      downloadUrl = imageUrl[0];
    }

    const postStocks = await prisma.stock.findMany({
      where: {
        ticker: {
          in: cashtags,
        },
      },
    });

    const postHashtags = await tagService.createHashtags(hashtags);

    const newPost = await prisma.post.create({
      data: {
        userId: user.userId,
        content: post.content,
        mediaUrl: downloadUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
        sentiment: post.sentiment,
        stocks: {
          connect: postStocks.map(stock => ({ stockId: stock.stockId })),
        },
        tags: {
          connect: postHashtags.map(tag => ({ tagId: tag.tagId })),
        },
      },
    });

    // TODO: Handle Mentions

    return createResponse(ResponseStatus.OK, { newPost });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
