import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppLayout } from '@/components/layout/AppLayout';

// Auth pages
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';

// App pages
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { BudgetListPage } from '@/features/budgets/BudgetListPage';
import { BudgetDetailPage } from '@/features/budgets/BudgetDetailPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { TransactionDetailPage } from '@/features/transactions/TransactionDetailPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { SavingsListPage } from '@/features/savings/SavingsListPage';
import { SavingsDetailPage } from '@/features/savings/SavingsDetailPage';

function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestOnly() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

export const router = createBrowserRouter([
  // Guest-only routes (redirect to / if already logged in)
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  // Authenticated routes (redirect to /login if not authenticated)
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/budgets', element: <BudgetListPage /> },
          { path: '/budgets/:id', element: <BudgetDetailPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
          { path: '/transactions/:id', element: <TransactionDetailPage /> },
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/savings', element: <SavingsListPage /> },
          { path: '/savings/:id', element: <SavingsDetailPage /> },
        ],
      },
    ],
  },
  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);
