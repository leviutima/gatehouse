import type { Request } from 'express';
import type { Principal } from '../../application/auth/principal.js';

export interface AuthenticatedRequest extends Request {
  principal?: Principal;
}
