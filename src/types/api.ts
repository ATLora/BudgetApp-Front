// ============================================================
// Enums — using const objects (compatible with erasableSyntaxOnly)
// NOTE: Numeric values match the C# enum definitions.
// Verify against the backend source if behavior is unexpected.
// ============================================================

export const BudgetType = {
  Monthly: 'Monthly',
  Weekly: 'Weekly',
  Biweekly: 'Biweekly',
  Quarterly: 'Quarterly',
  Annual: 'Annual',
  Custom: 'Custom',
} as const;
export type BudgetType = (typeof BudgetType)[keyof typeof BudgetType];

export const CategoryType = {
  Income: 'Income',
  Expense: 'Expense',
  Savings: 'Savings',
} as const;
export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

export const TransactionType = {
  Income: 'Income',
  Expense: 'Expense',
  SavingsDeposit: 'SavingsDeposit',
  SavingsWithdrawal: 'SavingsWithdrawal',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const SavingsGoalStatus = {
  Active: 'Active',
  Completed: 'Completed',
  Paused: 'Paused',
} as const;
export type SavingsGoalStatus = (typeof SavingsGoalStatus)[keyof typeof SavingsGoalStatus];

export const TrendDirection = {
  Flat: 'Flat',
  Up: 'Up',
  Down: 'Down',
} as const;
export type TrendDirection = (typeof TrendDirection)[keyof typeof TrendDirection];

// ============================================================
// Auth
// ============================================================

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  userId: string;
  refreshToken: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfileDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ============================================================
// Categories
// ============================================================

export interface CategoryDto {
  id: string;
  name: string;
  categoryType: CategoryType;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  categoryType: CategoryType;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateCategoryRequest {
  name: string;
  categoryType: CategoryType;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
}

// ============================================================
// Budgets
// ============================================================

export interface BudgetSummaryDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budgetType: BudgetType;
  totalIncomePlanned: number;
  totalExpensesPlanned: number;
  totalSavingsPlanned: number;
  isRecurring: boolean;
  categoryCount: number;
  createdAt: string;
}

export interface BudgetCategoryDto {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  plannedAmount: number;
  notes: string | null;
}

export interface BudgetDetailDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budgetType: BudgetType;
  totalIncomePlanned: number;
  totalExpensesPlanned: number;
  totalSavingsPlanned: number;
  isRecurring: boolean;
  categories: BudgetCategoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetHealthDto {
  budgetId: string;
  budgetName: string;
  startDate: string;
  endDate: string;
  incomePlanned: number;
  incomeActual: number;
  expensesPlanned: number;
  expensesActual: number;
  savingsPlanned: number;
  savingsActual: number;
  overallBudgetVariance: number;
}

export interface CategoryActualDto {
  budgetCategoryId: string;
  categoryId: string;
  categoryName: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
}

export interface BudgetSummaryReportDto {
  budgetId: string;
  budgetName: string;
  startDate: string;
  endDate: string;
  totalIncomePlanned: number;
  totalIncomeActual: number;
  totalExpensesPlanned: number;
  totalExpensesActual: number;
  totalSavingsPlanned: number;
  totalSavingsActual: number;
  categoryBreakdown: CategoryActualDto[];
}

export interface CreateBudgetRequest {
  name: string;
  startDate: string;
  endDate: string;
  budgetType: BudgetType;
  totalIncomePlanned: number;
  totalExpensesPlanned: number;
  totalSavingsPlanned: number;
  isRecurring: boolean;
}

export interface UpdateBudgetRequest {
  name: string;
  startDate: string;
  endDate: string;
  budgetType: BudgetType;
  totalIncomePlanned: number;
  totalExpensesPlanned: number;
  totalSavingsPlanned: number;
  isRecurring: boolean;
}

export interface AddBudgetCategoryRequest {
  categoryId: string;
  plannedAmount: number;
  notes?: string | null;
}

export interface UpdateBudgetCategoryRequest {
  plannedAmount: number;
  notes?: string | null;
}

// ============================================================
// Transactions
// ============================================================

export interface TransactionDto {
  id: string;
  budgetId: string;
  budgetName: string;
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  amount: number;
  transactionType: TransactionType;
  description: string;
  transactionDate: string;
  notes: string | null;
  createdAt: string;
}

export interface TransactionDetailDto extends TransactionDto {
  updatedAt: string;
}

export interface TransactionSummaryByCategoryDto {
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  total: number;
  count: number;
}

export interface TransactionSummaryDto {
  totalIncome: number;
  totalExpenses: number;
  totalSavingsDeposits: number;
  totalSavingsWithdrawals: number;
  netSavings: number;
  netCashFlow: number;
  transactionCount: number;
  from: string | null;
  to: string | null;
  budgetId: string | null;
  byCategory: TransactionSummaryByCategoryDto[];
}

export interface CreateTransactionRequest {
  budgetId: string;
  categoryId: string;
  amount: number;
  transactionType: TransactionType;
  description: string;
  transactionDate: string;
  notes?: string | null;
}

export interface UpdateTransactionRequest {
  categoryId: string;
  amount: number;
  transactionType: TransactionType;
  description: string;
  transactionDate: string;
  notes?: string | null;
}

// ============================================================
// Savings Goals
// ============================================================

export interface ContributionDto {
  id: string;
  amount: number;
  contributionDate: string;
  notes: string | null;
  budgetId: string | null;
  budgetName: string | null;
  transactionId: string | null;
  createdAt: string;
}

export interface SavingsGoalSummaryDto {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  targetDate: string | null;
  description: string | null;
  status: SavingsGoalStatus;
  contributionCount: number;
  createdAt: string;
}

export interface SavingsGoalDetailDto {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  remainingAmount: number;
  targetDate: string | null;
  description: string | null;
  status: SavingsGoalStatus;
  contributions: ContributionDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoalProgressDto {
  goalId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  remainingAmount: number;
  targetDate: string | null;
  daysRemaining: number | null;
  isOverdue: boolean;
  requiredDailyAmount: number | null;
  status: SavingsGoalStatus;
  totalContributions: number;
  averageContributionAmount: number;
  lastContributionDate: string | null;
}

export interface SavingsGoalSnapshotDto {
  goalId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  remainingAmount: number;
  targetDate: string | null;
  daysRemaining: number | null;
  isOverdue: boolean;
  requiredMonthlyAmount: number | null;
  status: SavingsGoalStatus;
  lastContributionDate: string | null;
}

export interface CreateSavingsGoalRequest {
  name: string;
  targetAmount: number;
  targetDate?: string | null;
  description?: string | null;
}

export interface UpdateSavingsGoalRequest {
  name: string;
  targetAmount: number;
  targetDate?: string | null;
  description?: string | null;
}

export interface UpdateSavingsGoalStatusRequest {
  status: SavingsGoalStatus;
}

export interface AddContributionRequest {
  amount: number;
  contributionDate: string;
  notes?: string | null;
  budgetId?: string | null;
  transactionId?: string | null;
}

// ============================================================
// Dashboard
// ============================================================

export interface DashboardSummaryDto {
  from: string;
  to: string;
  totalIncome: number;
  totalExpenses: number;
  totalSavingsDeposits: number;
  totalSavingsWithdrawals: number;
  netCashFlow: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  activeBudgetCount: number;
  activeSavingsGoalCount: number;
  currentBudget: BudgetHealthDto | null;
}

export interface SpendingByCategoryDto {
  categoryId: string;
  categoryName: string;
  icon: string | null;
  color: string | null;
  categoryType: CategoryType;
  total: number;
  transactionCount: number;
  percentageOfTotal: number;
}

export interface SpendingComparisonDto {
  previousFrom: string;
  previousTo: string;
  previousTotalExpenses: number;
  previousTotalIncome: number;
  expensesChangeAmount: number;
  expensesChangePercent: number;
  incomeChangeAmount: number;
  incomeChangePercent: number;
}

export interface DashboardSpendingDto {
  from: string;
  to: string;
  totalExpenses: number;
  totalIncome: number;
  topCategories: SpendingByCategoryDto[];
  topIncomeCategories: SpendingByCategoryDto[];
  previousPeriodComparison: SpendingComparisonDto | null;
}

export interface DashboardSavingsDto {
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgressPercentage: number;
  activeGoalCount: number;
  completedGoalCount: number;
  overdueGoalCount: number;
  totalSavedThisMonth: number;
  goals: SavingsGoalSnapshotDto[];
}

export interface MonthlyTrendDto {
  year: number;
  month: number;
  monthLabel: string;
  income: number;
  expenses: number;
  savingsDeposits: number;
  savingsWithdrawals: number;
  netCashFlow: number;
  netSavings: number;
  transactionCount: number;
}

export interface DashboardTrendsDto {
  months: number;
  monthlyTrends: MonthlyTrendDto[];
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageMonthlyNetCashFlow: number;
  averageMonthlyNetSavings: number;
  incomeDirection: TrendDirection;
  expenseDirection: TrendDirection;
  savingsDirection: TrendDirection;
}

// ============================================================
// API query param types
// ============================================================

export interface BudgetListParams {
  budgetType?: BudgetType;
  from?: string;
  to?: string;
}

export interface CategoryListParams {
  categoryType?: CategoryType;
  includeInactive?: boolean;
}

export interface TransactionListParams {
  budgetId?: string;
  categoryId?: string;
  transactionType?: TransactionType;
  from?: string;
  to?: string;
}

export interface TransactionSummaryParams {
  budgetId?: string;
  from?: string;
  to?: string;
}

export interface DashboardSummaryParams {
  from?: string;
  to?: string;
}

export interface DashboardSpendingParams {
  from?: string;
  to?: string;
}

export interface DashboardTrendsParams {
  months?: number;
}
