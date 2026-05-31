import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcryptjs';

loadEnv({ path: path.resolve(process.cwd(), '..', '.env'), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const { PrismaClient, Role, Unit } = await import('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@store.com' },
    update: {},
    create: {
      email: 'admin@store.com',
      name: 'Admin User',
      passwordHash,
      role: Role.ADMIN
    }
  });

  await prisma.user.upsert({
    where: { email: 'cashier@store.com' },
    update: {},
    create: {
      email: 'cashier@store.com',
      name: 'Cashier User',
      passwordHash,
      role: Role.CASHIER
    }
  });

  await prisma.user.upsert({
    where: { email: 'stock@store.com' },
    update: {},
    create: {
      email: 'stock@store.com',
      name: 'Stock Manager',
      passwordHash,
      role: Role.STOCK_MANAGER
    }
  });

  const categories = [
    { name: 'Fresh Produce', slug: 'fresh-produce' },
    { name: 'Bakery', slug: 'bakery' },
    { name: 'Beverages', slug: 'beverages' },
    { name: 'Household', slug: 'household' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category
    });
  }

  const produce = await prisma.category.findUnique({ where: { slug: 'fresh-produce' } });
  if (!produce) return;

  await prisma.product.upsert({
    where: { sku: 'APL-001' },
    update: {},
    create: {
      name: 'Apple',
      sku: 'APL-001',
      barcode: '100000000001',
      categoryId: produce.id,
      price: 1.99,
      costPrice: 1.15,
      stockQuantity: 160,
      lowStockThreshold: 30,
      unit: Unit.KG,
      imageUrl: '/uploads/apple.jpg',
      expiryTracked: true
    }
  });

  await prisma.product.upsert({
    where: { sku: 'MILK-01' },
    update: {},
    create: {
      name: 'Whole Milk',
      sku: 'MILK-01',
      barcode: '200000000001',
      categoryId: (await prisma.category.findUniqueOrThrow({ where: { slug: 'beverages' } })).id,
      price: 3.49,
      costPrice: 2.1,
      stockQuantity: 42,
      lowStockThreshold: 12,
      unit: Unit.LITER,
      imageUrl: '/uploads/milk.jpg',
      expiryTracked: true
    }
  });

  await prisma.customer.upsert({
    where: { phone: '+1555000101' },
    update: {},
    create: {
      name: 'Walk-in Customer',
      phone: '+1555000101',
      email: 'customer@example.com',
      loyaltyPoints: 85
    }
  });

  await prisma.supplier.upsert({
    where: { name: 'Fresh Farms Ltd' },
    update: {},
    create: {
      name: 'Fresh Farms Ltd',
      contact: 'Mia Carter',
      email: 'orders@freshfarms.test',
      phone: '+1555000200',
      address: '12 Market Road'
    }
  });

  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: 'seed.completed',
      entity: 'system',
      metadata: { message: 'Initial demo data created' }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
