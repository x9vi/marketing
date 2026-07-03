import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const p = await prisma.product.findFirst({ where: { name: 'hjh' } });
  if (!p) {
    console.log('Product not found');
    return;
  }
  console.log('Found product', p.id);
  
  try {
    // Delete any dependent records if any exist (like inventory movements, etc.)
    await prisma.inventoryMovement.deleteMany({ where: { productId: p.id } });
    await prisma.refundItem.deleteMany({ where: { productId: p.id } });
    await prisma.saleItem.deleteMany({ where: { productId: p.id } });

    // Now delete the product
    await prisma.product.delete({ where: { id: p.id } });
    console.log('Deleted product ' + p.id);
  } catch(e) {
    console.error('Delete failed:', e);
  }
}

main().finally(() => prisma.$disconnect());
