import { getUnreadNotifications } from '@/services/notifications-service/notifications-service';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { User } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = (await verifyUserInRoute(request)) as User;

    const newNotifications = await getUnreadNotifications(userId);

    return createResponse(ResponseStatus.OK, { total: newNotifications.length });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
