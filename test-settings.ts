import { prisma } from './server/lib/prisma.js';

async function main() {
  const current = await prisma.appSetting.findUnique({ where: { key: 'system' } });
  console.log("Current Settings:", JSON.stringify(current, null, 2));
}

main().catch(console.error);
