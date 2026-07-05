import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({where: {username: 'admin'}}).then(console.log).finally(() => prisma.$disconnect());
