import { NextResponse } from 'next/server';

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function rateLimit(
  req: Request,
  limit: number = 60, // max requests
  windowMs: number = 60 * 1000 // per window
) {
  // In Next.js App Router, extracting IP from headers
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  const now = Date.now();

  if (!store[ip]) {
    store[ip] = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  if (now > store[ip].resetTime) {
    store[ip].count = 0;
    store[ip].resetTime = now + windowMs;
  }

  store[ip].count++;

  if (store[ip].count > limit) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': Math.ceil((store[ip].resetTime - now) / 1000).toString() } }
    );
  }

  return null;
}
