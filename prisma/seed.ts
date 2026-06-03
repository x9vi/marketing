import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcryptjs';

loadEnv({ path: path.resolve(process.cwd(), '.env'), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const { PrismaClient, Role, Unit, CouponType, PromotionType } = await import('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const adminPin = await bcrypt.hash('1234', 10);

  // ── Users ──────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@store.com' },
    update: { pin: adminPin },
    create: {
      email: 'admin@store.com',
      name: 'Admin User',
      passwordHash,
      role: Role.ADMIN,
      pin: adminPin
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

  // ── Tax Categories ─────────────────────────────
  const standardTax = await prisma.taxCategory.upsert({
    where: { name: 'Standard' },
    update: {},
    create: { name: 'Standard', rate: 0.15 }
  });

  const reducedTax = await prisma.taxCategory.upsert({
    where: { name: 'Reduced' },
    update: {},
    create: { name: 'Reduced', rate: 0.05 }
  });

  const zeroTax = await prisma.taxCategory.upsert({
    where: { name: 'Zero-rated' },
    update: {},
    create: { name: 'Zero-rated', rate: 0 }
  });

  // ── Categories ─────────────────────────────────
  const categories = [
    { name: 'Fresh Produce', slug: 'fresh-produce' },
    { name: 'Bakery', slug: 'bakery' },
    { name: 'Beverages', slug: 'beverages' },
    { name: 'Household', slug: 'household' },
    { name: 'Dairy', slug: 'dairy' },
    { name: 'Snacks', slug: 'snacks' },
    { name: 'Meat & Poultry', slug: 'meat-poultry' },
    { name: 'Alcohol', slug: 'alcohol' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category
    });
  }

  const produce = await prisma.category.findUnique({ where: { slug: 'fresh-produce' } });
  const beverages = await prisma.category.findUnique({ where: { slug: 'beverages' } });
  const bakery = await prisma.category.findUnique({ where: { slug: 'bakery' } });
  const dairy = await prisma.category.findUnique({ where: { slug: 'dairy' } });
  const snacks = await prisma.category.findUnique({ where: { slug: 'snacks' } });
  const household = await prisma.category.findUnique({ where: { slug: 'household' } });
  const alcohol = await prisma.category.findUnique({ where: { slug: 'alcohol' } });
  if (!produce || !beverages || !bakery || !dairy || !snacks || !household || !alcohol) return;

  // ── Products ───────────────────────────────────
  await prisma.product.upsert({
    where: { sku: 'APL-001' },
    update: { taxCategoryId: reducedTax.id },
    create: {
      name: 'Apple', sku: 'APL-001', barcode: '100000000001',
      categoryId: produce.id, taxCategoryId: reducedTax.id,
      price: 1.99, costPrice: 1.15, stockQuantity: 160,
      lowStockThreshold: 30, unit: Unit.KG, imageUrl: '/uploads/apple.jpg', expiryTracked: true
    }
  });

  await prisma.product.upsert({
    where: { sku: 'BAN-001' },
    update: {},
    create: {
      name: 'Banana', sku: 'BAN-001', barcode: '100000000002',
      categoryId: produce.id, taxCategoryId: reducedTax.id,
      price: 0.99, costPrice: 0.55, stockQuantity: 200,
      lowStockThreshold: 40, unit: Unit.KG, imageUrl: '/uploads/banana.jpg'
    }
  });

  await prisma.product.upsert({
    where: { sku: 'TOM-001' },
    update: {},
    create: {
      name: 'Tomato', sku: 'TOM-001', barcode: '100000000003',
      categoryId: produce.id, taxCategoryId: reducedTax.id,
      price: 2.49, costPrice: 1.40, stockQuantity: 90,
      lowStockThreshold: 20, unit: Unit.KG
    }
  });

  await prisma.product.upsert({
    where: { sku: 'MILK-01' },
    update: { taxCategoryId: zeroTax.id },
    create: {
      name: 'Whole Milk', sku: 'MILK-01', barcode: '200000000001',
      categoryId: dairy.id, taxCategoryId: zeroTax.id,
      price: 3.49, costPrice: 2.1, stockQuantity: 42,
      lowStockThreshold: 12, unit: Unit.LITER, imageUrl: '/uploads/milk.jpg', expiryTracked: true
    }
  });

  await prisma.product.upsert({
    where: { sku: 'BRD-001' },
    update: {},
    create: {
      name: 'White Bread', sku: 'BRD-001', barcode: '300000000001',
      categoryId: bakery.id, taxCategoryId: zeroTax.id,
      price: 2.29, costPrice: 1.20, stockQuantity: 55,
      lowStockThreshold: 15, unit: Unit.PIECE, expiryTracked: true
    }
  });

  await prisma.product.upsert({
    where: { sku: 'CHZ-001' },
    update: {},
    create: {
      name: 'Cheddar Cheese', sku: 'CHZ-001', barcode: '400000000001',
      categoryId: dairy.id, taxCategoryId: standardTax.id,
      price: 4.99, costPrice: 3.20, stockQuantity: 35,
      lowStockThreshold: 10, unit: Unit.PIECE
    }
  });

  await prisma.product.upsert({
    where: { sku: 'CHP-001' },
    update: {},
    create: {
      name: 'Potato Chips', sku: 'CHP-001', barcode: '500000000001',
      categoryId: snacks.id, taxCategoryId: standardTax.id,
      price: 3.29, costPrice: 1.80, stockQuantity: 80,
      lowStockThreshold: 20, unit: Unit.PIECE
    }
  });

  await prisma.product.upsert({
    where: { sku: 'NUT-001' },
    update: {},
    create: {
      name: 'Nutella Spread 400g', sku: 'NUT-001', barcode: '700000000002',
      categoryId: snacks.id, taxCategoryId: standardTax.id,
      price: 4.99, costPrice: 2.90, stockQuantity: 50,
      lowStockThreshold: 15, unit: Unit.PIECE
    }
  });

  await prisma.product.upsert({
    where: { sku: 'COLA-01' },
    update: {},
    create: {
      name: 'Cola 500ml', sku: 'COLA-01', barcode: '600000000001',
      categoryId: beverages.id, taxCategoryId: standardTax.id,
      price: 1.49, costPrice: 0.80, stockQuantity: 120,
      lowStockThreshold: 25, unit: Unit.PIECE
    }
  });

  await prisma.product.upsert({
    where: { sku: 'WTR-001' },
    update: {},
    create: {
      name: 'Water 1L', sku: 'WTR-001', barcode: '600000000002',
      categoryId: beverages.id, taxCategoryId: zeroTax.id,
      price: 0.89, costPrice: 0.30, stockQuantity: 200,
      lowStockThreshold: 50, unit: Unit.PIECE
    }
  });

  await prisma.product.upsert({
    where: { sku: 'DTGN-01' },
    update: {},
    create: {
      name: 'Dish Detergent', sku: 'DTGN-01', barcode: '700000000001',
      categoryId: household.id, taxCategoryId: standardTax.id,
      price: 3.99, costPrice: 2.20, stockQuantity: 45,
      lowStockThreshold: 10, unit: Unit.PIECE
    }
  });

  await prisma.product.upsert({
    where: { sku: 'BEER-01' },
    update: {},
    create: {
      name: 'Craft Beer 330ml', sku: 'BEER-01', barcode: '800000000001',
      categoryId: alcohol.id, taxCategoryId: standardTax.id,
      price: 5.99, costPrice: 3.50, stockQuantity: 60,
      lowStockThreshold: 15, unit: Unit.PIECE,
      ageRestricted: true, minAge: 21
    }
  });

  await prisma.product.upsert({
    where: { sku: 'WINE-01' },
    update: {},
    create: {
      name: 'Red Wine 750ml', sku: 'WINE-01', barcode: '800000000002',
      categoryId: alcohol.id, taxCategoryId: standardTax.id,
      price: 12.99, costPrice: 7.50, stockQuantity: 25,
      lowStockThreshold: 8, unit: Unit.PIECE,
      ageRestricted: true, minAge: 21
    }
  });

  // ── Customers ──────────────────────────────────
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

  // ── Suppliers ──────────────────────────────────
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

  // ── Sample Coupons ─────────────────────────────
  await prisma.coupon.upsert({
    where: { code: 'SAVE10' },
    update: {},
    create: {
      code: 'SAVE10',
      type: CouponType.PERCENT,
      value: 10,
      minPurchase: 20,
      active: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: 'FLAT5' },
    update: {},
    create: {
      code: 'FLAT5',
      type: CouponType.FIXED,
      value: 5,
      minPurchase: 30,
      active: true
    }
  });

  // ── Sample Promotions ──────────────────────────
  await prisma.promotion.upsert({
    where: { id: 'promo-bogo-chips' },
    update: {},
    create: {
      id: 'promo-bogo-chips',
      name: 'Buy 1 Get 1 Free Chips',
      type: PromotionType.BOGO,
      config: { buy: 1, free: 1 },
      productIds: [],
      categoryIds: [snacks.id],
      active: true,
      priority: 10
    }
  });

  await prisma.promotion.upsert({
    where: { id: 'promo-water-multibuy' },
    update: {},
    create: {
      id: 'promo-water-multibuy',
      name: '3 Waters for $2',
      type: PromotionType.MULTI_BUY,
      config: { quantity: 3, price: 2 },
      productIds: [],
      categoryIds: [beverages.id],
      active: true,
      priority: 5
    }
  });

  // ── Activity Log ───────────────────────────────
  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: 'seed.completed',
      entity: 'system',
      metadata: { message: 'Initial demo data created with POS upgrade' }
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
