import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  currencyCode: process.env.CURRENCY_CODE ?? 'IQD',
  uploadsDir: process.env.UPLOADS_DIR ?? 'server/uploads',
  databaseUrl: process.env.DATABASE_URL?.startsWith('file:') ? process.env.DATABASE_URL : 'file:./prisma/freshmart.db',
  initialAdminUsername: process.env.INITIAL_ADMIN_USERNAME ?? 'admin',
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD ?? 'ChangeMeNow!123',
  initialAdminName: process.env.INITIAL_ADMIN_NAME ?? 'Administrator'
};
