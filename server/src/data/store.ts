import bcrypt from 'bcrypt';

export interface DBUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  currency: string;
  monthlyIncome: number;
  isVerified: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  verificationToken?: string | null;
  resetToken?: string | null;
  resetExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBCategory {
  id: string;
  name: string;
  isDefault: boolean;
  userId: string | null;
  color: string;
  icon: string;
  createdAt: Date;
}

export interface DBIncome {
  id: string;
  userId: string;
  source: string;
  amount: number;
  date: Date;
  description?: string | null;
  recurring: 'NONE' | 'WEEKLY' | 'MONTHLY';
  createdAt: Date;
}

export interface DBExpense {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  amount: number;
  date: Date;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'OTHER';
  description?: string | null;
  recurring: 'NONE' | 'WEEKLY' | 'MONTHLY';
  receiptId?: string | null;
  createdAt: Date;
}

export interface DBReceipt {
  id: string;
  expenseId?: string | null;
  fileUrl: string;
  fileKey?: string | null;
  ocrVendor?: string | null;
  ocrDate?: Date | null;
  ocrAmount?: number | null;
  ocrStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawOcrText?: string | null;
  uploadedAt: Date;
}

export interface DBBudget {
  id: string;
  userId: string;
  categoryId: string | null;
  month: string; // YYYY-MM
  amount: number;
  createdAt: Date;
}

export interface DBSavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: Date;
  color: string;
  createdAt: Date;
}

export interface DBNotification {
  id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface DBInsight {
  id: string;
  userId: string;
  period: string;
  text: string;
  source: 'AI' | 'RULE';
  createdAt: Date;
}

class InMemoryDataStore {
  public users: DBUser[] = [];
  public refreshTokens: { id: string; userId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null }[] = [];
  public categories: DBCategory[] = [];
  public incomes: DBIncome[] = [];
  public expenses: DBExpense[] = [];
  public receipts: DBReceipt[] = [];
  public budgets: DBBudget[] = [];
  public savingsGoals: DBSavingsGoal[] = [];
  public notifications: DBNotification[] = [];
  public insights: DBInsight[] = [];

  private initialized = false;

  public init() {
    if (this.initialized) return;

    // Seed default categories (FR-12)
    const defaultCategoryDefs = [
      { name: 'Food & Dining', color: '#FF7675', icon: 'Utensils' },
      { name: 'Transportation', color: '#74B9FF', icon: 'Car' },
      { name: 'Entertainment', color: '#A29BFE', icon: 'Film' },
      { name: 'Education', color: '#FDCB6E', icon: 'GraduationCap' },
      { name: 'Utilities & Bills', color: '#00CEC9', icon: 'Zap' },
      { name: 'Healthcare', color: '#E17055', icon: 'HeartPulse' },
      { name: 'Shopping & Tech', color: '#6C5CE7', icon: 'ShoppingBag' },
      { name: 'Other', color: '#B2BEC3', icon: 'MoreHorizontal' },
    ];

    defaultCategoryDefs.forEach((cat, idx) => {
      this.categories.push({
        id: `cat_0${idx + 1}`,
        name: cat.name,
        isDefault: true,
        userId: null,
        color: cat.color,
        icon: cat.icon,
        createdAt: new Date('2026-06-01T00:00:00Z'),
      });
    });

    // Seed Admin User
    const adminPassHash = bcrypt.hashSync('Admin123!', 10);
    const adminUser: DBUser = {
      id: 'usr_admin_01',
      name: 'System Admin',
      email: 'admin@expenseai.local',
      passwordHash: adminPassHash,
      role: 'ADMIN',
      currency: 'USD',
      monthlyIncome: 8000.0,
      isVerified: true,
      status: 'ACTIVE',
      createdAt: new Date('2026-06-01T00:00:00Z'),
      updatedAt: new Date('2026-06-01T00:00:00Z'),
    };
    this.users.push(adminUser);

    // Seed Demo User
    const demoPassHash = bcrypt.hashSync('Demo123!', 10);
    const demoUser: DBUser = {
      id: 'usr_demo_01',
      name: 'Jonathan W.',
      email: 'demo@expenseai.local',
      passwordHash: demoPassHash,
      role: 'USER',
      currency: 'USD',
      monthlyIncome: 6500.0,
      isVerified: true,
      status: 'ACTIVE',
      createdAt: new Date('2026-06-01T00:00:00Z'),
      updatedAt: new Date('2026-06-01T00:00:00Z'),
    };
    this.users.push(demoUser);

    // Seed 3 months of transactions for demo user (Jul, Aug, Sep 2026)
    // Month 1: July 2026
    this.incomes.push({
      id: 'inc_jul_01',
      userId: demoUser.id,
      source: 'Tech Salary Deposit',
      amount: 5200.0,
      date: new Date('2026-07-01T09:00:00Z'),
      description: 'July Payroll',
      recurring: 'MONTHLY',
      createdAt: new Date('2026-07-01T09:00:00Z'),
    });
    this.expenses.push(
      {
        id: 'exp_jul_01',
        userId: demoUser.id,
        categoryId: 'cat_01',
        title: 'Supermarket Groceries',
        amount: 320.5,
        date: new Date('2026-07-05T12:00:00Z'),
        paymentMethod: 'DEBIT_CARD',
        recurring: 'NONE',
        createdAt: new Date('2026-07-05T12:00:00Z'),
      },
      {
        id: 'exp_jul_02',
        userId: demoUser.id,
        categoryId: 'cat_05',
        title: 'Electricity & Fiber',
        amount: 145.0,
        date: new Date('2026-07-10T15:00:00Z'),
        paymentMethod: 'BANK_TRANSFER',
        recurring: 'MONTHLY',
        createdAt: new Date('2026-07-10T15:00:00Z'),
      }
    );

    // Month 2: August 2026
    this.incomes.push({
      id: 'inc_aug_01',
      userId: demoUser.id,
      source: 'Tech Salary Deposit',
      amount: 5200.0,
      date: new Date('2026-08-01T09:00:00Z'),
      description: 'August Payroll',
      recurring: 'MONTHLY',
      createdAt: new Date('2026-08-01T09:00:00Z'),
    });
    this.expenses.push(
      {
        id: 'exp_aug_01',
        userId: demoUser.id,
        categoryId: 'cat_01',
        title: 'Whole Foods Market',
        amount: 410.2,
        date: new Date('2026-08-08T18:00:00Z'),
        paymentMethod: 'DEBIT_CARD',
        recurring: 'NONE',
        createdAt: new Date('2026-08-08T18:00:00Z'),
      },
      {
        id: 'exp_aug_02',
        userId: demoUser.id,
        categoryId: 'cat_02',
        title: 'RideShare & Transit',
        amount: 98.4,
        date: new Date('2026-08-14T20:00:00Z'),
        paymentMethod: 'CREDIT_CARD',
        recurring: 'NONE',
        createdAt: new Date('2026-08-14T20:00:00Z'),
      }
    );

    // Month 3: September 2026 (matching Comet Wallet dashboard screenshot!)
    this.incomes.push(
      {
        id: 'inc_sep_01',
        userId: demoUser.id,
        source: 'Tech Salary Deposit',
        amount: 5200.0,
        date: new Date('2026-09-01T09:00:00Z'),
        description: 'September Payroll',
        recurring: 'MONTHLY',
        createdAt: new Date('2026-09-01T09:00:00Z'),
      },
      {
        id: 'inc_sep_02',
        userId: demoUser.id,
        source: 'Marco Ruiz Consulting',
        amount: 450.5,
        date: new Date('2026-09-07T09:00:00Z'),
        description: 'Sprint milestone consulting',
        recurring: 'NONE',
        createdAt: new Date('2026-09-07T09:00:00Z'),
      },
      {
        id: 'inc_sep_03',
        userId: demoUser.id,
        source: 'UI Asset Royalties',
        amount: 185.0,
        date: new Date('2026-09-04T12:00:00Z'),
        description: 'Marketplace license sales',
        recurring: 'MONTHLY',
        createdAt: new Date('2026-09-04T12:00:00Z'),
      }
    );

    this.expenses.push(
      {
        id: 'exp_sep_01',
        userId: demoUser.id,
        categoryId: 'cat_07', // Shopping & Tech
        title: 'Hunter Macbook Pro',
        amount: 1280.5,
        date: new Date('2026-09-07T14:20:00Z'),
        paymentMethod: 'DEBIT_CARD',
        description: 'New workstation hardware',
        recurring: 'NONE',
        createdAt: new Date('2026-09-07T14:20:00Z'),
      },
      {
        id: 'exp_sep_02',
        userId: demoUser.id,
        categoryId: 'cat_07',
        title: 'Hexagon Software',
        amount: 240.0,
        date: new Date('2026-09-07T11:05:00Z'),
        paymentMethod: 'CREDIT_CARD',
        description: 'Design software license',
        recurring: 'MONTHLY',
        createdAt: new Date('2026-09-07T11:05:00Z'),
      },
      {
        id: 'exp_sep_03',
        userId: demoUser.id,
        categoryId: 'cat_01',
        title: 'Organic Food Market',
        amount: 85.3,
        date: new Date('2026-09-06T18:30:00Z'),
        paymentMethod: 'DEBIT_CARD',
        description: 'Weekly grocery run',
        recurring: 'NONE',
        createdAt: new Date('2026-09-06T18:30:00Z'),
      },
      {
        id: 'exp_sep_04',
        userId: demoUser.id,
        categoryId: 'cat_02',
        title: 'Metro Rail Monthly Pass',
        amount: 75.0,
        date: new Date('2026-09-05T09:15:00Z'),
        paymentMethod: 'DEBIT_CARD',
        description: 'Transit card reload',
        recurring: 'MONTHLY',
        createdAt: new Date('2026-09-05T09:15:00Z'),
      },
      {
        id: 'exp_sep_05',
        userId: demoUser.id,
        categoryId: 'cat_05',
        title: 'Electric & High-Speed Internet',
        amount: 142.5,
        date: new Date('2026-09-03T16:00:00Z'),
        paymentMethod: 'BANK_TRANSFER',
        description: 'Home utilities invoice',
        recurring: 'MONTHLY',
        createdAt: new Date('2026-09-03T16:00:00Z'),
      },
      {
        id: 'exp_sep_06',
        userId: demoUser.id,
        categoryId: 'cat_03',
        title: 'Cinema & Concert Tickets',
        amount: 64.0,
        date: new Date('2026-09-02T20:45:00Z'),
        paymentMethod: 'CREDIT_CARD',
        description: 'Weekend leisure entertainment',
        recurring: 'NONE',
        createdAt: new Date('2026-09-02T20:45:00Z'),
      }
    );

    // Budgets for September
    this.budgets.push(
      {
        id: 'bud_overall_sep',
        userId: demoUser.id,
        categoryId: null,
        month: '2026-09',
        amount: 3200.0,
        createdAt: new Date('2026-09-01T00:00:00Z'),
      },
      {
        id: 'bud_tech_sep',
        userId: demoUser.id,
        categoryId: 'cat_07',
        month: '2026-09',
        amount: 1600.0,
        createdAt: new Date('2026-09-01T00:00:00Z'),
      },
      {
        id: 'bud_food_sep',
        userId: demoUser.id,
        categoryId: 'cat_01',
        month: '2026-09',
        amount: 500.0,
        createdAt: new Date('2026-09-01T00:00:00Z'),
      },
      {
        id: 'bud_trans_sep',
        userId: demoUser.id,
        categoryId: 'cat_02',
        month: '2026-09',
        amount: 250.0,
        createdAt: new Date('2026-09-01T00:00:00Z'),
      }
    );

    // Savings Goals
    this.savingsGoals.push(
      {
        id: 'goal_01',
        userId: demoUser.id,
        name: 'Trip to Tokyo',
        targetAmount: 5000.0,
        savedAmount: 3850.0,
        targetDate: new Date('2026-12-20T00:00:00Z'),
        color: '#6C5CE7',
        createdAt: new Date('2026-08-01T00:00:00Z'),
      },
      {
        id: 'goal_02',
        userId: demoUser.id,
        name: 'Emergency Fund',
        targetAmount: 10000.0,
        savedAmount: 8200.0,
        targetDate: new Date('2027-04-01T00:00:00Z'),
        color: '#00CEC9',
        createdAt: new Date('2026-06-01T00:00:00Z'),
      },
      {
        id: 'goal_03',
        userId: demoUser.id,
        name: 'New M4 Studio',
        targetAmount: 2500.0,
        savedAmount: 1150.0,
        targetDate: new Date('2026-11-15T00:00:00Z'),
        color: '#FF7675',
        createdAt: new Date('2026-08-15T00:00:00Z'),
      }
    );

    // Notifications
    this.notifications.push(
      {
        id: 'notif_01',
        userId: demoUser.id,
        type: 'BUDGET_80',
        message: 'Your Shopping & Tech category budget reached 95% threshold ($1,520.50 of $1,600.00).',
        isRead: false,
        createdAt: new Date('2026-09-07T14:22:00Z'),
      },
      {
        id: 'notif_02',
        userId: demoUser.id,
        type: 'OCR_PROCESSED',
        message: 'Hunter Macbook Pro receipt verified and categorized successfully.',
        isRead: false,
        createdAt: new Date('2026-09-07T14:21:00Z'),
      }
    );

    // Insights
    this.insights.push({
      id: 'ins_01',
      userId: demoUser.id,
      period: '2026-09',
      text: 'Hardware spending rose 65% this week with your MacBook Pro acquisition. Total monthly discretionary limit is still safe at 59% utilized.',
      source: 'AI',
      createdAt: new Date('2026-09-07T08:00:00Z'),
    });

    this.initialized = true;
  }
}

export const dbStore = new InMemoryDataStore();
dbStore.init();
