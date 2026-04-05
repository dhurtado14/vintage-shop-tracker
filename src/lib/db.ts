import { supabase } from "./supabase";
import {
  SaleEntry,
  ExpenseEntry,
  RentalEntry,
  InventoryItem,
  StorePlanConfig,
  AppData,
  DEFAULT_STORE_PLAN,
} from "./store";

// ---- Mappers: DB snake_case ↔ TS camelCase ----

function dbToSale(r: Record<string, unknown>): SaleEntry {
  return {
    id: r.id as string,
    date: r.date as string,
    channel: r.channel as SaleEntry["channel"],
    description: r.description as string,
    amount: Number(r.amount),
    itemCost: Number(r.item_cost),
  };
}

function saleToDb(s: SaleEntry) {
  return {
    id: s.id,
    date: s.date,
    channel: s.channel,
    description: s.description,
    amount: s.amount,
    item_cost: s.itemCost,
  };
}

function dbToExpense(r: Record<string, unknown>): ExpenseEntry {
  return {
    id: r.id as string,
    date: r.date as string,
    category: r.category as ExpenseEntry["category"],
    description: r.description as string,
    amount: Number(r.amount),
  };
}

function expenseToDb(e: ExpenseEntry) {
  return {
    id: e.id,
    date: e.date,
    category: e.category,
    description: e.description,
    amount: e.amount,
  };
}

function dbToRental(r: Record<string, unknown>): RentalEntry {
  return {
    id: r.id as string,
    date: r.date as string,
    channel: r.channel as RentalEntry["channel"],
    description: r.description as string,
    itemListingPrice: Number(r.item_listing_price),
    rentalFee: Number(r.rental_fee),
  };
}

function rentalToDb(r: RentalEntry) {
  return {
    id: r.id,
    date: r.date,
    channel: r.channel,
    description: r.description,
    item_listing_price: r.itemListingPrice,
    rental_fee: r.rentalFee,
  };
}

function dbToInventory(r: Record<string, unknown>): InventoryItem {
  return {
    id: r.id as string,
    name: r.name as string,
    code: (r.code as string | null) ?? undefined,
    purchaseDate: r.purchase_date as string,
    purchasePrice: Number(r.purchase_price),
    listingPrice: Number(r.listing_price),
    channel: r.channel as InventoryItem["channel"],
    status: r.status as InventoryItem["status"],
    soldDate: (r.sold_date as string | null) ?? undefined,
    soldPrice: r.sold_price != null ? Number(r.sold_price) : undefined,
  };
}

function inventoryToDb(i: InventoryItem) {
  return {
    id: i.id,
    name: i.name,
    code: i.code ?? null,
    purchase_date: i.purchaseDate,
    purchase_price: i.purchasePrice,
    listing_price: i.listingPrice,
    channel: i.channel,
    status: i.status,
    sold_date: i.soldDate ?? null,
    sold_price: i.soldPrice ?? null,
  };
}

function dbToStorePlan(r: Record<string, unknown>): StorePlanConfig {
  return {
    monthlyRent: Number(r.monthly_rent),
    utilities: Number(r.utilities),
    insurance: Number(r.insurance),
    staffCost: Number(r.staff_cost),
    posSystem: Number(r.pos_system),
    otherFixed: Number(r.other_fixed),
    buildoutCost: Number(r.buildout_cost),
    targetMargin: Number(r.target_margin),
    savingsGoal: Number(r.savings_goal),
    currentSavings: Number(r.current_savings),
  };
}

// ---- Load all data ----

export async function loadAllData(): Promise<AppData> {
  const [salesRes, expensesRes, rentalsRes, inventoryRes, planRes] = await Promise.all([
    supabase.from("sales").select("*").order("date", { ascending: false }),
    supabase.from("expenses").select("*").order("date", { ascending: false }),
    supabase.from("rentals").select("*").order("date", { ascending: false }),
    supabase.from("inventory").select("*").order("purchase_date", { ascending: false }),
    supabase.from("store_plan").select("*").eq("id", 1).maybeSingle(),
  ]);

  return {
    sales: (salesRes.data ?? []).map(dbToSale),
    expenses: (expensesRes.data ?? []).map(dbToExpense),
    rentals: (rentalsRes.data ?? []).map(dbToRental),
    inventory: (inventoryRes.data ?? []).map(dbToInventory),
    storePlan: planRes.data ? dbToStorePlan(planRes.data as Record<string, unknown>) : DEFAULT_STORE_PLAN,
  };
}

// ---- Sales ----

export async function insertSale(sale: SaleEntry): Promise<void> {
  await supabase.from("sales").insert(saleToDb(sale));
}

export async function deleteSale(id: string): Promise<void> {
  await supabase.from("sales").delete().eq("id", id);
}

// ---- Expenses ----

export async function insertExpense(expense: ExpenseEntry): Promise<void> {
  await supabase.from("expenses").insert(expenseToDb(expense));
}

export async function deleteExpense(id: string): Promise<void> {
  await supabase.from("expenses").delete().eq("id", id);
}

// ---- Rentals ----

export async function insertRental(rental: RentalEntry): Promise<void> {
  await supabase.from("rentals").insert(rentalToDb(rental));
}

export async function deleteRental(id: string): Promise<void> {
  await supabase.from("rentals").delete().eq("id", id);
}

// ---- Inventory ----

export async function insertInventoryItem(item: InventoryItem): Promise<void> {
  await supabase.from("inventory").insert(inventoryToDb(item));
}

export async function updateInventoryItem(item: InventoryItem): Promise<void> {
  await supabase.from("inventory").update(inventoryToDb(item)).eq("id", item.id);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await supabase.from("inventory").delete().eq("id", id);
}

// ---- Store plan ----

export async function upsertStorePlan(plan: StorePlanConfig): Promise<void> {
  await supabase.from("store_plan").upsert({
    id: 1,
    monthly_rent: plan.monthlyRent,
    utilities: plan.utilities,
    insurance: plan.insurance,
    staff_cost: plan.staffCost,
    pos_system: plan.posSystem,
    other_fixed: plan.otherFixed,
    buildout_cost: plan.buildoutCost,
    target_margin: plan.targetMargin,
    savings_goal: plan.savingsGoal,
    current_savings: plan.currentSavings,
  });
}
