import { User } from '@/types';
import { ControlPlaneUser } from './types';

export function userFromControlPlane(user: ControlPlaneUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.displayName || user.email,
    groups: [],
    quota: user.quota
  };
}
