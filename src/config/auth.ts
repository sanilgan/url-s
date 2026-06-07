import dotenv from 'dotenv';

dotenv.config();

const configuredSecret = process.env.JWT_SECRET;

export function getJwtSecret(): string {
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return 'development-only-secret-change-me';
}
