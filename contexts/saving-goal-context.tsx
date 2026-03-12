import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useGoalService } from '@/lib/services/goalService';
import { goalDtoToSavingGoal } from '@/lib/utils/goalMapper';
import type { ContributionEntry, SavingGoalData } from '@/lib/types/saving-goal';

export type { ContributionEntry, SavingGoalData };

function buildDescription(extra: {
  salary: number;
  category: string;
  daysToAchieve: number;
  dailyEssential: number;
  startDate: string;
  contributions: ContributionEntry[];
}): string {
  return JSON.stringify(extra);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Trả về chuỗi ISO UTC (YYYY-MM-DDTHH:mm:ss.sssZ) để backend PostgreSQL không báo lỗi Kind=Unspecified */
function toUtcIsoDateTime(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

interface SavingGoalContextValue {
  goals: SavingGoalData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addGoal: (g: Omit<SavingGoalData, 'id' | 'currentAmount' | 'startDate' | 'contributions'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<SavingGoalData>) => Promise<void>;
  addContribution: (id: string, amount: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

const SavingGoalContext = createContext<SavingGoalContextValue | null>(null);

export function SavingGoalProvider({ children }: { children: React.ReactNode }) {
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const { isSignedIn } = useAuth();
  const [goals, setGoals] = useState<SavingGoalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const goalService = useGoalService();
  const goalServiceRef = useRef(goalService);
  goalServiceRef.current = goalService;

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dtos = await goalServiceRef.current.getAll();
      setGoals(dtos.map(goalDtoToSavingGoal));
      if (__DEV__ && dtos.length === 0) {
        console.log('[Goals] Backend trả về 0 mục tiêu - kiểm tra BE có lưu DB đúng userId không');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể tải mục tiêu';
      setError(msg);
      setGoals([]);
      if (__DEV__) console.error('[Goals] Lỗi tải:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      setGoals([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    fetchGoals();
  }, [isSignedIn, fetchGoals]);

  const addGoal = useCallback(
    async (g: Omit<SavingGoalData, 'id' | 'currentAmount' | 'startDate' | 'contributions'>) => {
      const startDate = new Date().toISOString();
      const targetDate = addDays(todayStr(), g.daysToAchieve);
      const description = buildDescription({
        salary: g.salary,
        category: g.category,
        daysToAchieve: g.daysToAchieve,
        dailyEssential: g.dailyEssential,
        startDate,
        contributions: [],
      });
      await goalService.create({
        title: g.title,
        targetAmount: g.targetAmount,
        currentAmount: 0,
        targetDate: toUtcIsoDateTime(targetDate),
        description,
        currency: 'VND',
        icon: 'flag',
        color: '#51A2FF',
      });
      await fetchGoals();
    },
    [goalService, fetchGoals]
  );

  const updateGoal = useCallback(
    async (id: string, updates: Partial<SavingGoalData>) => {
      const current = goals.find((x) => x.id === id);
      if (!current) return;
      const merged = { ...current, ...updates };
      const targetDate = addDays(merged.startDate.slice(0, 10), merged.daysToAchieve);
      const description = buildDescription({
        salary: merged.salary,
        category: merged.category,
        daysToAchieve: merged.daysToAchieve,
        dailyEssential: merged.dailyEssential,
        startDate: merged.startDate,
        contributions: merged.contributions,
      });
      await goalService.update(id, {
        title: merged.title,
        targetAmount: merged.targetAmount,
        currentAmount: merged.currentAmount,
        targetDate: toUtcIsoDateTime(targetDate),
        description,
      });
      setGoals((prev) => prev.map((g) => (g.id === id ? merged : g)));
    },
    [goalService, goals]
  );

  const addContribution = useCallback(
    async (id: string, amount: number) => {
      const g = goals.find((x) => x.id === id);
      if (!g || amount <= 0) return;
      const room = g.targetAmount - g.currentAmount;
      const actualAdd = Math.min(amount, room);
      if (actualAdd <= 0) return;
      const date = todayStr();
      const contribs = g.contributions ?? [];
      const last = contribs[contribs.length - 1];
      const newContributions =
        last?.date === date
          ? [...contribs.slice(0, -1), { date, amount: last.amount + actualAdd }]
          : [...contribs, { date, amount: actualAdd }];
      const newCurrent = g.currentAmount + actualAdd;
      const merged: SavingGoalData = { ...g, currentAmount: newCurrent, contributions: newContributions };
      const targetDate = addDays(g.startDate.slice(0, 10), g.daysToAchieve);
      const description = buildDescription({
        salary: g.salary,
        category: g.category,
        daysToAchieve: g.daysToAchieve,
        dailyEssential: g.dailyEssential,
        startDate: g.startDate,
        contributions: newContributions,
      });
      await goalService.update(id, {
        currentAmount: newCurrent,
        targetDate: toUtcIsoDateTime(targetDate),
        description,
      });
      setGoals((prev) => prev.map((x) => (x.id === id ? merged : x)));
    },
    [goalService, goals]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      await goalService.remove(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    },
    [goalService]
  );

  return (
    <SavingGoalContext.Provider
      value={{
        goals,
        isLoading,
        error,
        refetch: fetchGoals,
        addGoal,
        updateGoal,
        addContribution,
        deleteGoal,
      }}
    >
      {children}
    </SavingGoalContext.Provider>
  );
}

export function useSavingGoal() {
  const ctx = useContext(SavingGoalContext);
  if (!ctx) throw new Error('useSavingGoal must be used within SavingGoalProvider');
  return ctx;
}
