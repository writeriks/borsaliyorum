import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';

/**
 * İstek meta verisi (5651 erişim izi için IP/port + log ilişkilendirme için requestId).
 * Vercel kenar katmanı `x-real-ip` ve `x-forwarded-for`'u istemcinin değeriyle ezer; Vercel
 * dışında (yerel `next start`) Next'in eklediği `x-forwarded-for` kullanılır.
 *
 * Kaynak port: Vercel istemci kaynak portunu bir başlıkla iletmiyor; bu yüzden şimdilik null
 * (legal L2 "alınabildiğinde"). `x-forwarded-port` sunucu portudur (443), kullanılmaz.
 * User-Agent toplanmaz (veri minimizasyonu).
 */
export type RequestMeta = {
  readonly ip: string | null;
  readonly port: number | null;
  readonly requestId: string;
};

type HeaderReader = { get(name: string): string | null };

const normalizeIp = (raw: string | null | undefined): string | null => {
  const value = raw?.trim();
  if (!value) return null;
  // "1.2.3.4:5678" ve "[::1]:5678" biçimleri (bazı proxy'ler portu ekler)
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(value);
  if (bracketed?.[1] && isIP(bracketed[1]) === 6) return bracketed[1];
  if (isIP(value) !== 0) return value;
  const v4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(value);
  if (v4WithPort?.[1] && isIP(v4WithPort[1]) === 4) return v4WithPort[1];
  return null;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9:_-]{1,64}$/;

export const readRequestMeta = (headers: HeaderReader): RequestMeta => {
  const forwardedFor = headers.get('x-forwarded-for')?.split(',')[0];
  const ip = normalizeIp(headers.get('x-real-ip')) ?? normalizeIp(forwardedFor);
  const incomingId = headers.get('x-vercel-id') ?? headers.get('x-request-id');
  const requestId = incomingId && REQUEST_ID_PATTERN.test(incomingId) ? incomingId : randomUUID();
  return { ip, port: null, requestId };
};
