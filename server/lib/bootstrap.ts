import { execSync } from 'node:child_process';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';

const SETTINGS_KEY = 'system';

export const defaultSystemSettings = {
  store: {
    name: 'FreshMart',
    address: '',
    phone: '',
    email: '',
    taxNumber: '',
    currency: env.currencyCode,
    timezone: 'UTC'
  },
  pos: {
    receiptWidth: '80mm',
    autoPrintReceipt: true,
    defaultPaymentMethod: 'CASH'
  },
  taxes: {
    inclusivePricing: false,
    defaultRate: 0
  },
  receipt: {
    header: 'Thank you for shopping with us',
    footer: 'Please come again'
  },
  security: {
    rememberMeDays: 7
  }
} as const;

export async function ensureDatabaseSchema() {
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    cwd: path.resolve(process.cwd()),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: env.databaseUrl
    }
  });
}

async function ensureAdminUser() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (existingAdmin) {
    return;
  }

  const passwordHash = await bcrypt.hash(env.initialAdminPassword, 12);
  await prisma.user.create({
    data: {
      username: env.initialAdminUsername,
      name: env.initialAdminName,
      role: Role.ADMIN,
      passwordHash,
      active: true
    }
  });
}

async function ensureSettings() {
  await prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: {},
    create: {
      key: SETTINGS_KEY,
      value: defaultSystemSettings as unknown as Prisma.InputJsonValue
    }
  });
}

async function ensureDefaultTaxCategory() {
  await prisma.taxCategory.upsert({
    where: { name: 'Default' },
    update: {},
    create: {
      name: 'Default',
      rate: 0
    }
  });
}

export async function bootstrapSystem() {
  await ensureDatabaseSchema();
  await ensureAdminUser();
  await ensureSettings();
  await ensureDefaultTaxCategory();
}
