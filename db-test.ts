import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const holds = await prisma.heldTransaction.findMany({
    include: { cashier: true }
  });
  console.log('Total held transactions in database:', holds.length);
  console.log(JSON.stringify(holds, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
