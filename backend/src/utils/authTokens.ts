import { createHash, randomBytes } from 'crypto';

export const createOpaqueToken = (): string => randomBytes(32).toString('hex');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
