import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Current users:', users.map(u => ({ username: u.username, role: u.role })));
  
  if (users.length > 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    for (const u of users) {
      await prisma.user.update({
        where: { id: u.id },
        data: { passwordHash: hashedPassword }
      });
    }
    console.log('Successfully reset all user passwords to: admin123');
  } else {
    console.log('No users found in database!');
    
    // Seed an admin if missing
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        name: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log('Created new admin user with password: admin123');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
