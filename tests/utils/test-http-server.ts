import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';

/**
 * safeFetch testleri için yerel HTTP sunucusu (yalnızca 127.0.0.1). Testler bu adresi
 * `allowAddresses`/`SAFE_FETCH_TEST_ALLOW` ile bilinçli olarak politika dışı tutar.
 */
export type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void;

export type TestHttpServer = {
  readonly origin: string;
  readonly port: number;
  /** Yol başına gelen istek sayısı (önbellek testleri için). */
  readonly hits: Map<string, number>;
  /** Son isteğin başlıkları. */
  lastHeaders: IncomingMessage['headers'] | null;
  readonly route: (path: string, handler: RouteHandler) => void;
  readonly close: () => Promise<void>;
};

export const html = (
  body: string,
  { status = 200, contentType = 'text/html; charset=utf-8' } = {}
): RouteHandler => {
  return (_req, res) => {
    res.writeHead(status, { 'content-type': contentType });
    res.end(body);
  };
};

export const redirect = (location: string, status = 302): RouteHandler => {
  return (_req, res) => {
    res.writeHead(status, { location });
    res.end();
  };
};

export const startTestHttpServer = async (): Promise<TestHttpServer> => {
  const routes = new Map<string, RouteHandler>();
  const hits = new Map<string, number>();
  const sockets = new Set<Socket>();
  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    hits.set(path, (hits.get(path) ?? 0) + 1);
    state.lastHeaders = req.headers;
    const handler = routes.get(path);
    if (handler) {
      handler(req, res);
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  const state: TestHttpServer = {
    origin: `http://127.0.0.1:${port}`,
    port,
    hits,
    lastHeaders: null,
    route: (path, handler) => {
      routes.set(path, handler);
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        // Zaman aşımı testlerinde asılı kalan soketler kapanışı bekletmesin.
        for (const socket of sockets) socket.destroy();
        server.close(error => (error ? reject(error) : resolve()));
      }),
  };
  return state;
};
