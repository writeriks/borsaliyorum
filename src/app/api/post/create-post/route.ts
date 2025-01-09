import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { MAX_CHARACTERS } from '@/services/api-service/post-api-service/constants';
import { auth } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import tagService from '@/services/tag-service/tag-service';
import { Post } from '@prisma/client';
import { NextResponse } from 'next/server';
import { TagsEnum } from '@/services/firebase-service/types/db-types/tag';
import { uploadImage } from '@/services/api-service/api-service-helper';

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
    const stockTickers = cashtags.map(cashtag => cashtag.replace('$', ''));
    const strippedHashtags = hashtags.map(hashtag => hashtag.replace(TagsEnum.HASHTAG, ''));

    const stocksByCashtags = await prisma.stock.findMany({
      where: {
        ticker: {
          in: stockTickers,
        },
      },
    });

    if (!cashtags.length) {
      return createResponse(
        ResponseStatus.BAD_REQUEST,
        'İçerkte herhangi bir hisse bulunamadı. Lütfen hisse etiketleyin.'
      );
    }

    const isAnyCashtagInvalid = stockTickers.some(
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
      downloadUrl = await uploadImage(imageData);
    }

    const postStocks = await prisma.stock.findMany({
      where: {
        ticker: {
          in: stockTickers,
        },
      },
    });

    const postHashtags = await tagService.createHashtags(strippedHashtags);

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
