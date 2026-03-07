import { TransactionDto } from '@/lib/types/transaction';
import { OverviewReportDto } from '@/lib/types/report';

const formatAmount = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
const formatDate = (s: string) => new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Xây dựng chuỗi context thu chi cho AI.
 * Chỉ gồm dữ liệu thu chi, KHÔNG chứa mật khẩu/tài khoản nhạy cảm.
 */
export function buildUserContextForAI(
  transactions: TransactionDto[],
  overview: OverviewReportDto | null,
  totalBalance?: number
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
