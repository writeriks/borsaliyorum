import { classifyKey, maskIp, maskText, REDACTED } from './mask';

/**
 * Küçük yapılandırılmış logger: her kayıt tek satır JSON (Vercel log'larında aranabilir).
 * Bağlamdaki kişisel veri ve gizli değerler yazılmadan önce maskelenir.
 */

export const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 } as const;
export type LogLevel = Exclude<keyof typeof LOG_LEVELS, 'silent'>;
export type LogThreshold = keyof typeof LOG_LEVELS;

export type LogContext = Readonly<Record<string, unknown>>;

export type Logger = {
  readonly debug: (msg: string, context?: LogContext) => void;
  readonly info: (msg: string, context?: LogContext) => void;
  readonly warn: (msg: string, context?: LogContext) => void;
  readonly error: (msg: string, context?: LogContext) => void;
  /** Sabit alanlar (ör. `requestId`, `module`) taşıyan alt logger. */
  readonly child: (bindings: LogContext) => Logger;
};

export type LogSink = (level: LogLevel, line: string) => void;

const MAX_DEPTH = 6;

/**
 * `ancestors` yalnızca o anki yolun üzerindeki nesneleri tutar: aynı nesne döngüsüz olarak
 * iki kez geçerse (ör. `{ a: x, b: x }`) ikisi de yazılır; yalnızca gerçek döngü `[Circular]`.
 */
const sanitizeValue = (value: unknown, depth: number, ancestors: WeakSet<object>): unknown => {
  if (typeof value === 'string') return maskText(value);
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value !== 'object') {
    return typeof value === 'function' || typeof value === 'symbol' ? String(value) : value;
  }
  if (ancestors.has(value)) return '[Circular]';
  if (depth >= MAX_DEPTH) return '[Truncated]';
  if (value instanceof Date) return value.toISOString();

  ancestors.add(value);
  try {
    return sanitizeComposite(value, depth, ancestors);
  } finally {
    ancestors.delete(value);
  }
};

const sanitizeComposite = (value: object, depth: number, ancestors: WeakSet<object>): unknown => {
  if (value instanceof Error) {
    const code = (value as { code?: unknown }).code;
    return {
      name: value.name,
      message: maskText(value.message),
      ...(code === undefined ? {} : { code: sanitizeValue(code, depth + 1, ancestors) }),
      ...(value.stack ? { stack: maskText(value.stack) } : {}),
      ...(value.cause === undefined
        ? {}
        : { cause: sanitizeValue(value.cause, depth + 1, ancestors) }),
    };
  }
  if (Array.isArray(value)) return value.map(item => sanitizeValue(item, depth + 1, ancestors));
  return sanitizeObject(value as Record<string, unknown>, depth + 1, ancestors);
};

const sanitizeObject = (
  object: Readonly<Record<string, unknown>>,
  depth: number,
  ancestors: WeakSet<object>
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(object)) {
    switch (classifyKey(key)) {
      case 'secret':
        out[key] = raw === undefined || raw === null ? raw : REDACTED;
        break;
      case 'ip':
        out[key] = typeof raw === 'string' ? maskIp(raw) : REDACTED;
        break;
      case 'email':
        out[key] = typeof raw === 'string' ? maskText(raw) : sanitizeValue(raw, depth, ancestors);
        break;
      default:
        out[key] = sanitizeValue(raw, depth, ancestors);
    }
  }
  return out;
};

/** Bağlamı loglanabilir hale getirir (test ve hata raporları için dışa açık). */
export const sanitizeContext = (context: LogContext): Record<string, unknown> =>
  sanitizeObject(context, 0, new WeakSet());

const defaultSink: LogSink = (level, line) => {
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
};

const resolveLogThreshold = (value: string | undefined): LogThreshold => {
  if (value && value in LOG_LEVELS) return value as LogThreshold;
  return process.env.NODE_ENV === 'test' ? 'silent' : 'info';
};

type LoggerOptions = {
  readonly level?: LogThreshold;
  readonly sink?: LogSink;
  readonly bindings?: LogContext;
  readonly now?: () => Date;
};

export const createLogger = (options: LoggerOptions = {}): Logger => {
  const threshold = options.level ?? resolveLogThreshold(process.env.LOG_LEVEL);
  const sink = options.sink ?? defaultSink;
  const bindings = options.bindings ?? {};
  const now = options.now ?? ((): Date => new Date());

  const write =
    (level: LogLevel) =>
    (msg: string, context: LogContext = {}): void => {
      if (LOG_LEVELS[level] < LOG_LEVELS[threshold]) return;
      const record = {
        ...sanitizeContext({ ...bindings, ...context }),
        level,
        time: now().toISOString(),
        msg: maskText(msg),
      };
      sink(level, JSON.stringify(record));
    };

  return {
    debug: write('debug'),
    info: write('info'),
    warn: write('warn'),
    error: write('error'),
    child: extra =>
      createLogger({ level: threshold, sink, now, bindings: { ...bindings, ...extra } }),
  };
};

export const logger: Logger = createLogger();
