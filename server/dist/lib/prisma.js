import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: env.databaseUrl
        }
    }
});
