CREATE UNIQUE INDEX "Budget_userId_month_categoryId_key"
ON "Budget" ("userId", "month", "categoryId");

CREATE UNIQUE INDEX "Budget_userId_month_overall_key"
ON "Budget" ("userId", "month")
WHERE "categoryId" IS NULL;
