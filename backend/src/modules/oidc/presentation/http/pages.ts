import type { Response } from 'express';

const PAGE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'",
};

export function sendPage(
  response: Response,
  status: number,
  html: string,
): void {
  response.status(status).set(PAGE_HEADERS).send(html);
}
