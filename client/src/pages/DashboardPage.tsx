import React from 'react';
import { AppShell } from '../components/layout/AppShell';
import { WelcomeCard } from '../components/dashboard/WelcomeCard';
import { SpendingTrendChart } from '../components/dashboard/SpendingTrendChart';
import { CategorySpendingCard } from '../components/dashboard/CategorySpendingCard';
import { AiInsightCarouselCard } from '../components/dashboard/AiInsightCarouselCard';
import { RightPanelSummary } from '../components/dashboard/RightPanelSummary';
import {
  mockUser,
  mockExpenses,
  mockIncomes,
  mockCategories,
  mockInsights,
} from '../data/mockData';

export const DashboardPage: React.FC = () => {
  const totalIncome = mockIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = mockExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <AppShell
      rightPanel={
        <RightPanelSummary
          balance={balance}
          dateStr="Monday, 07 September 2026"
          recentExpenses={mockExpenses}
        />
      }
    >
      {/* Dashboard Top Title with Rocket Emoji matching reference */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight flex items-center gap-2">
          <span>My Dashboard</span>
          <span className="text-2xl">🚀</span>
        </h1>
      </div>

      {/* 2x2 Grid of Main Cards matching the reference layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Welcome Card with Illustrated Character */}
        <WelcomeCard name={mockUser.name} />

        {/* Card 2: Dispute Progress / Spending Trend Chart */}
        <SpendingTrendChart
          incomes={mockIncomes}
          expenses={mockExpenses}
        />

        {/* Card 3: Credit by Categories Card */}
        <CategorySpendingCard categories={mockCategories} expenses={mockExpenses} />

        {/* Card 4: Credit Reports / AI Insights Carousel */}
        <AiInsightCarouselCard insights={mockInsights} />
      </div>
    </AppShell>
  );
};
