export type Channel = "Depop" | "Etsy" | "Website" | "Instagram" | "In-Person" | "Other";
export type ExpenseCategory =
  | "Sourcing (COGS)"
  | "Platform Fees"
  | "Shipping"
  | "Packaging"
  | "Marketing"
  | "Subscriptions"
  | "Photography"
  | "Other";

export interface SaleEntry {
  id: string;
  date: string; // ISO date
  channel: Channel;
  description: string;
  amount: number;
  itemCost: number; // what you paid for the item
}

export interface ExpenseEntry {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  purchaseDate: string;
  purchasePrice: number;
  listingPrice: number;
  channel: Channel;
  status: "Listed" | "Sold" | "Held";
  soldDate?: string;
  soldPrice?: number;
}

export interface StorePlanConfig {
  monthlyRent: number;
  utilities: number;
  insurance: number;
  staffCost: number;
  posSystem: number;
  otherFixed: number;
  buildoutCost: number; // one-time, amortized over 24mo
  targetMargin: number; // % e.g. 65
  savingsGoal: number;
  currentSavings: number;
}

export interface AppData {
  sales: SaleEntry[];
  expenses: ExpenseEntry[];
  inventory: InventoryItem[];
  storePlan: StorePlanConfig;
}

const DEFAULT_STORE_PLAN: StorePlanConfig = {
  monthlyRent: 5000,
  utilities: 400,
  insurance: 300,
  staffCost: 2500,
  posSystem: 100,
  otherFixed: 300,
  buildoutCost: 20000,
  targetMargin: 65,
  savingsGoal: 30000,
  currentSavings: 0,
};

const STORAGE_KEY = "vintage-shop-data";

export function loadData(): AppData {
  if (typeof window === "undefined") {
    return { sales: [], expenses: [], inventory: [], storePlan: DEFAULT_STORE_PLAN };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sales: [], expenses: [], inventory: [], storePlan: DEFAULT_STORE_PLAN };
    const parsed = JSON.parse(raw);
    return {
      sales: parsed.sales ?? [],
      expenses: parsed.expenses ?? [],
      inventory: parsed.inventory ?? [],
      storePlan: { ...DEFAULT_STORE_PLAN, ...(parsed.storePlan ?? {}) },
    };
  } catch {
    return { sales: [], expenses: [], inventory: [], storePlan: DEFAULT_STORE_PLAN };
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---- Computed metrics ----

export function getMonthlyMetrics(sales: SaleEntry[], expenses: ExpenseEntry[], monthKey: string) {
  // monthKey: "2026-03"
  const monthlySales = sales.filter((s) => s.date.startsWith(monthKey));
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(monthKey));

  const revenue = monthlySales.reduce((sum, s) => sum + s.amount, 0);
  const cogs = monthlySales.reduce((sum, s) => sum + s.itemCost, 0);
  const operatingExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - operatingExpenses;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return { revenue, cogs, operatingExpenses, grossProfit, netProfit, grossMargin };
}

export function getLast6MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date(2026, 2, 9); // use today's date from context
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export function getStorePlanMetrics(plan: StorePlanConfig) {
  const monthlyFixed =
    plan.monthlyRent +
    plan.utilities +
    plan.insurance +
    plan.staffCost +
    plan.posSystem +
    plan.otherFixed +
    plan.buildoutCost / 24;

  const breakEvenRevenue = plan.targetMargin > 0 ? (monthlyFixed / (plan.targetMargin / 100)) : 0;
  return { monthlyFixed, breakEvenRevenue };
}
