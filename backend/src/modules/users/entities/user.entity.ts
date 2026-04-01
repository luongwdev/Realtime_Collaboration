export class User {
  id: string;
  email: string;
  fullName: string;
  displayName: string;
  timezone?: string;
  avatarUrl?: string;
  passwordHash: string;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}
