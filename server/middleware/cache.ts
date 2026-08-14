import type { NextFunction, Request, Response } from 'express';

export function cacheControl(seconds: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.set('Cache-Control', `public, max-age=${seconds}`);
    next();
  };
}

export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.set('Cache-Control', 'no-store');
  next();
}
