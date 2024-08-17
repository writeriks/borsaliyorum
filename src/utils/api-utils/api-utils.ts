import { NextResponse } from 'next/server';

export enum ResponseStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

const ResponseStatusText = {
  [ResponseStatus.OK]: 'Success',
  [ResponseStatus.BAD_REQUEST]: 'Bad Request',
  [ResponseStatus.UNAUTHORIZED]: 'Unauthorized',
  [ResponseStatus.NOT_FOUND]: 'Not Found',
  [ResponseStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

/**
 * Creates a NextResponse object with JSON content based on the provided status and data.
 *
 * @param status - The HTTP status code for the response. Defaults to ResponseStatus.OK if not provided.
 * @param data - The data to be included in the response. Can be a string or an object.
 *
 * @returns A NextResponse object with JSON content and appropriate headers.
 *
 * @remarks
 * This function handles different HTTP status codes and formats the response data accordingly.
 *
 * @example
 * ```typescript
 * const response = createResponse(ResponseStatus.BAD_REQUEST, 'Invalid input');
 * // response.status === 400
 * // response.statusText === 'Bad Request'
 * // response.json() === { error: 'Invalid input' }
 * ```
 */
export const createResponse = (
  status: ResponseStatus,
  data?: string | Object,
  customHeaders?: Object
): NextResponse<any> => {
  const statusText = ResponseStatusText[status];
  let responseData = null;

  const commonHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
  };

  const headers = customHeaders
    ? {
        ...commonHeaders,
        ...customHeaders,
      }
    : commonHeaders;

  switch (status) {
    case ResponseStatus.OK:
      responseData = data ?? {};
      break;
    case ResponseStatus.BAD_REQUEST:
      responseData = {
        message: typeof data === 'string' ? data : 'Hatalı istek gönderildi.',
      };
      break;
    case ResponseStatus.UNAUTHORIZED:
      responseData = {
        message: typeof data === 'string' ? data : 'Erişim yetkisi yok.',
      };
      break;
    case ResponseStatus.NOT_FOUND:
      // we should not return anything here to not break client logic for user
      break;
    default:
      responseData = {
        message: typeof data === 'string' ? data : statusText,
      };
      break;
  }

  return NextResponse.json(responseData ?? '', {
    status,
    statusText,
    headers,
  });
};
