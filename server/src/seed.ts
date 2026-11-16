import { prisma } from './config/prisma';

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
