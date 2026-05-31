import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}
export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});
