import { UserRole } from '../enums';

export interface AuthenticatedUser {
  id: string;
  // null só para SUPERADMIN — ver src/types/enums.ts.
  tenantId: string | null;
  role: UserRole;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenantId?: string;
    }
  }
}

export {};
