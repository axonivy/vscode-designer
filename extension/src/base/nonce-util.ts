import { randomBytes } from 'crypto';

export const createNonce = () => randomBytes(16).toString('hex');
