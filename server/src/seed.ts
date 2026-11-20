import { prisma } from './config/prisma';
import { hashPassword } from './utils/hash';

const defaultCategories = [
  { name: 'Food & Dining', color: '#F17D9A', icon: 'Utensils' },
  { name: 'Transportation', color: '#647FEA', icon: 'Car' },
  { name: 'Entertainment', color: '#B49AFF', icon: 'Film' },
  { name: 'Education', color: '#F3BD65', icon: 'GraduationCap' },
  { name: 'Utilities & Bills', color: '#4BC9A2', icon: 'Zap' },
  { name: 'Healthcare', color: '#65A9F5', icon: 'HeartPulse' },
  { name: 'Shopping & Tech', color: '#9275F5', icon: 'ShoppingBag' },
  { name: 'Other', color: '#A5A5BE', icon: 'MoreHorizontal' },
];

const seed = async () => {
  try {
    await prisma.category.createMany({
      data: defaultCategories.map((category, index) => ({
        id: `cat_0${index + 1}`,
        ...category,
        isDefault: true,
        userId: null,
      })),
      skipDuplicates: true,
    });

    console.log(`[ExpenseAI Seed] Ensured ${defaultCategories.length} default categories`);

    await prisma.user.upsert({
      where: { email: 'admin@expenseai.local' },
      update: {},
      create: {
        id: 'usr_admin_01',
        name: 'System Admin',
        email: 'admin@expenseai.local',
        passwordHash: await hashPassword('Admin123!'),
        role: 'ADMIN',
        currency: 'USD',
        monthlyIncome: 8000,
        isVerified: true,
      },
    });

    await prisma.user.upsert({
      where: { email: 'demo@expenseai.local' },
      update: {},
      create: {
        id: 'usr_demo_01',
        name: 'Jonathan W.',
        email: 'demo@expenseai.local',
        passwordHash: await hashPassword('Demo123!'),
        role: 'USER',
        currency: 'USD',
        monthlyIncome: 6500,
        isVerified: true,
      },
    });

    console.log('[ExpenseAI Seed] Ensured local demo and admin accounts');
  } catch (error) {
    console.error('[ExpenseAI Seed] Failed to seed default categories:', error);
    process.exitCode = 1;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error('[ExpenseAI Seed] Failed to disconnect from database:', error);
      process.exitCode = 1;
    }
  }
};

void seed();
