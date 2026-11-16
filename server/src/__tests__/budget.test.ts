describe('Budget & Threshold Service Logic (FR-14, FR-15, FR-16)', () => {
  const calculateBudgetStatus = (budgetAmount: number, expenses: number[]) => {
    const totalSpent = expenses.reduce((sum, val) => sum + val, 0);
    const percentage = budgetAmount > 0 ? Math.min(Math.round((totalSpent / budgetAmount) * 100), 100) : 0;
    const remaining = Math.max(0, budgetAmount - totalSpent);

    let thresholdAlert: '50%' | '80%' | '100%' | null = null;
    if (totalSpent >= budgetAmount) {
      thresholdAlert = '100%';
    } else if (totalSpent / budgetAmount >= 0.8) {
      thresholdAlert = '80%';
    } else if (totalSpent / budgetAmount >= 0.5) {
      thresholdAlert = '50%';
    }

    return { totalSpent, remaining, percentage, thresholdAlert };
  };

  test('calculates spent, remaining, and percentage correctly below 50%', () => {
    const status = calculateBudgetStatus(1000, [150, 200]);
    expect(status.totalSpent).toBe(350);
    expect(status.remaining).toBe(650);
    expect(status.percentage).toBe(35);
    expect(status.thresholdAlert).toBeNull();
  });

  test('triggers 50% threshold notification when spending reaches 50%', () => {
    const status = calculateBudgetStatus(1000, [250, 250]);
    expect(status.totalSpent).toBe(500);
    expect(status.percentage).toBe(50);
    expect(status.thresholdAlert).toBe('50%');
  });

  test('triggers 80% warning threshold when spending reaches 80% to 99%', () => {
    const status = calculateBudgetStatus(1000, [500, 320]);
    expect(status.totalSpent).toBe(820);
    expect(status.percentage).toBe(82);
    expect(status.thresholdAlert).toBe('80%');
  });

  test('triggers 100% exceeded threshold and prevents negative remaining', () => {
    const status = calculateBudgetStatus(1000, [600, 450]);
    expect(status.totalSpent).toBe(1050);
    expect(status.remaining).toBe(0);
    expect(status.percentage).toBe(100);
    expect(status.thresholdAlert).toBe('100%');
  });
});
