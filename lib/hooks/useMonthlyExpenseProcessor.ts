import { useCallback, useRef } from 'react';
import {
  loadMonthlyExpenses,
  getLastProcessedMonth,
  setLastProcessedMonth,
  addDeductionNotification,
} from '@/lib/storage/monthlyExpenseStorage';
import { useTransactionService } from '@/lib/services/transactionService';
import { useTransactionTypeService } from '@/lib/services/transactionTypeService';
import { useCategoryService } from '@/lib/services/categoryService';
import { useTransactionRefresh } from '@/contexts/transaction-refresh-context';

function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function useMonthlyExpenseProcessor() {
  const { createTransaction } = useTransactionService();
  const { getTransactionTypes } = useTransactionTypeService();
  const { getCategories } = useCategoryService();
  const { refreshTransactions } = useTransactionRefresh();
  const processingRef = useRef(false);

  const processIfNeeded = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const now = new Date();
      const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastProcessed = await getLastProcessedMonth();
      if (lastProcessed && lastProcessed >= currentYm) return;

      const expenses = await loadMonthlyExpenses();
      if (expenses.length === 0) {
        await setLastProcessedMonth(currentYm);
        return;
      }

      const types = await getTransactionTypes();
      const expenseType = types.find((t) => normalizeText(t.name) === 'chi tieu')
        || types.find((t) => !t.isIncome)
        || types[0];
      if (!expenseType) {
        await setLastProcessedMonth(currentYm);
        return;
      }

      const categories = await getCategories(expenseType.id);
      const category = categories.find((c) =>
        normalizeText(c.name).includes('chi phi') || normalizeText(c.name).includes('khac')
      ) || categories[0];
      if (!category) {
        await setLastProcessedMonth(currentYm);
        return;
      }

      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`;

      for (const me of expenses) {
        try {
          await createTransaction({
            transactionTypeId: expenseType.id,
            moneySourceId: me.moneySourceId,
            categoryId: category.id,
            amount: me.amount,
            transactionDate: firstDay,
            description: me.description || `Chi phí hàng tháng - ${me.moneySourceName}`,
            isBorrowingForThis: false,
            isFee: false,
            excludeFromReport: false,
          });
          await addDeductionNotification({
            message: `Đã trừ ${formatCurrency(me.amount)} từ ${me.moneySourceName} (chi phí hàng tháng)`,
            amount: me.amount,
            moneySourceName: me.moneySourceName,
            processedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error('[MonthlyExpense] Lỗi trừ:', me.id, err);
        }
      }

      refreshTransactions();
      await setLastProcessedMonth(currentYm);
    } finally {
      processingRef.current = false;
    }
  }, [createTransaction, getTransactionTypes, getCategories, refreshTransactions]);

  return { processIfNeeded };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}
