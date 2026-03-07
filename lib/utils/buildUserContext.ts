import { TransactionDto } from '@/lib/types/transaction';
import { OverviewReportDto } from '@/lib/types/report';
import type { SavingGoalData } from '@/lib/types/saving-goal';

const formatAmount = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
const formatDate = (s: string) => new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Xây dựng chuỗi context thu chi + mục tiêu tiết kiệm cho AI.
 * Chỉ gồm dữ liệu thu chi và mục tiêu, KHÔNG chứa mật khẩu/tài khoản nhạy cảm.
 */
export function buildUserContextForAI(
  transactions: TransactionDto[],
  overview: OverviewReportDto | null,
  totalBalance?: number,
  goals?: SavingGoalData[]
): string {
  const parts: string[] = [];

  if (overview) {
    parts.push('=== BÁO CÁO TỔNG QUAN (tháng hiện tại) ===');
    parts.push(`Tổng thu: ${formatAmount(overview.totalIncome)}`);
    parts.push(`Tổng chi: ${formatAmount(overview.totalExpense)}`);
    parts.push(`Chênh lệch: ${formatAmount(overview.difference)}`);
    if (overview.categoryStats?.length) {
      parts.push('Chi theo danh mục:');
      overview.categoryStats.slice(0, 15).forEach((c) => {
        parts.push(`  - ${c.categoryName}: ${formatAmount(c.amount)} (${c.percentage.toFixed(1)}%)`);
      });
    }
    parts.push('');
  }

  if (totalBalance != null) {
    parts.push(`Tổng số dư hiện tại: ${formatAmount(totalBalance)}`);
    parts.push('');
  }

  if (goals && goals.length > 0) {
    const completed = goals.filter((g) => g.currentAmount >= g.targetAmount);
    const active = goals.filter((g) => g.currentAmount < g.targetAmount);
    parts.push('=== MỤC TIÊU TIẾT KIỆM ===');
    parts.push(`Tổng số mục tiêu: ${goals.length}`);
    parts.push(`Đã hoàn thành: ${completed.length}`);
    parts.push(`Đang theo đuổi: ${active.length}`);
    parts.push('Chi tiết:');
    goals.forEach((g) => {
      const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
      const status = g.currentAmount >= g.targetAmount ? 'HOÀN THÀNH' : `${pct}%`;
      parts.push(`  - "${g.title}": ${formatAmount(g.currentAmount)}/${formatAmount(g.targetAmount)} (${status})`);
    });
    parts.push('');
  }

  if (transactions.length > 0) {
    parts.push('=== GIAO DỊCH GẦN ĐÂY (90 ngày) ===');
    transactions.slice(0, 100).forEach((t) => {
      const type = t.isIncome ? 'Thu' : 'Chi';
      const date = formatDate(t.transactionDate);
      const cat = t.categoryName || 'Khác';
      const desc = t.description ? ` | ${t.description}` : '';
      const src = t.moneySourceName || '';
      parts.push(`[${date}] ${type}: ${formatAmount(t.amount)} - ${cat} (${src})${desc}`);
    });
    if (transactions.length > 100) {
      parts.push(`... và ${transactions.length - 100} giao dịch khác.`);
    }
  }

  return parts.join('\n').trim() || '';
}
