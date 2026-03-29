"use client";

import { useEffect, useState } from "react";
import {
  loadData,
  saveData,
  generateId,
  getMonthlyMetrics,
  getLast6MonthKeys,
  AppData,
  SaleEntry,
  ExpenseEntry,
  RentalEntry,
  Channel,
  RentalChannel,
  ExpenseCategory,
  RENTAL_FEE_RATES,
} from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { format, parse } from "date-fns";

const CHANNELS: Channel[] = [
  "Shopify Site",
  "7wonders - Sale",
  "Instagram",
  "In-Person - Venmo",
  "In-Person - Zelle",
  "In-Person - POS",
  "In-Person",
  "Website",
  "Other",
];

const RENTAL_CHANNELS: RentalChannel[] = ["7wonders", "Other"];

const EXPENSE_CATS: ExpenseCategory[] = [
  "Sourcing (COGS)",
  "Platform Fees",
  "Shipping",
  "Packaging",
  "Marketing",
  "Market Costs",
  "Travel",
  "Subscriptions",
  "Photography",
  "Other",
];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtDec = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TODAY = "2026-03-09";

function PLSummary({ data, monthKey }: { data: AppData; monthKey: string }) {
  const m = getMonthlyMetrics(data.sales, data.expenses, data.rentals, monthKey);
  const label = format(parse(monthKey, "yyyy-MM", new Date()), "MMMM yyyy");
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{label} Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm">
          <Row label="Sales Revenue" value={fmt(m.salesRevenue)} />
          {m.rentalIncome > 0 && (
            <Row label="Rental Income" value={fmt(m.rentalIncome)} />
          )}
          <Row label="Total Revenue" value={fmt(m.revenue)} bold />
          <Row label="Item Cost (COGS)" value={`−${fmt(m.cogs)}`} muted />
          <div className="border-t pt-1 mt-1">
            <Row label="Gross Profit" value={fmt(m.grossProfit)} bold />
            <Row label="Gross Margin" value={`${m.grossMargin.toFixed(1)}%`} muted />
          </div>
          <Row label="Operating Expenses" value={`−${fmt(m.operatingExpenses)}`} muted />
          <div className="border-t pt-1 mt-1">
            <Row
              label="Net Profit"
              value={fmt(m.netProfit)}
              bold
              color={m.netProfit >= 0 ? "text-green-700" : "text-red-600"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`${bold ? "font-semibold" : ""} ${color ?? ""}`}>{value}</span>
    </div>
  );
}

export default function PLPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getLast6MonthKeys()[5]);

  // Sale form
  const [sDate, setSDate] = useState(TODAY);
  const [sChannel, setSChannel] = useState<Channel>("Shopify Site");
  const [sDesc, setSDesc] = useState("");
  const [sAmount, setSAmount] = useState("");
  const [sCost, setSCost] = useState("");

  // Rental form
  const [rDate, setRDate] = useState(TODAY);
  const [rChannel, setRChannel] = useState<RentalChannel>("7wonders");
  const [rDesc, setRDesc] = useState("");
  const [rListingPrice, setRListingPrice] = useState("");

  // Expense form
  const [eDate, setEDate] = useState(TODAY);
  const [eCat, setECat] = useState<ExpenseCategory>("Platform Fees");
  const [eDesc, setEDesc] = useState("");
  const [eAmount, setEAmount] = useState("");

  useEffect(() => {
    setData(loadData());
  }, []);

  if (!data) return null;

  function addSale() {
    if (!sDesc || !sAmount) return;
    const entry: SaleEntry = {
      id: generateId(),
      date: sDate,
      channel: sChannel,
      description: sDesc,
      amount: parseFloat(sAmount),
      itemCost: parseFloat(sCost) || 0,
    };
    const updated = { ...data!, sales: [entry, ...data!.sales] };
    saveData(updated);
    setData(updated);
    setSDesc("");
    setSAmount("");
    setSCost("");
  }

  function addRental() {
    if (!rDesc || !rListingPrice) return;
    const listingPrice = parseFloat(rListingPrice);
    const rate = RENTAL_FEE_RATES[rChannel];
    const rentalFee = listingPrice * rate;
    const entry: RentalEntry = {
      id: generateId(),
      date: rDate,
      channel: rChannel,
      description: rDesc,
      itemListingPrice: listingPrice,
      rentalFee,
    };
    const updated = { ...data!, rentals: [entry, ...data!.rentals] };
    saveData(updated);
    setData(updated);
    setRDesc("");
    setRListingPrice("");
  }

  function addExpense() {
    if (!eDesc || !eAmount) return;
    const entry: ExpenseEntry = {
      id: generateId(),
      date: eDate,
      category: eCat,
      description: eDesc,
      amount: parseFloat(eAmount),
    };
    const updated = { ...data!, expenses: [entry, ...data!.expenses] };
    saveData(updated);
    setData(updated);
    setEDesc("");
    setEAmount("");
  }

  function deleteSale(id: string) {
    const updated = { ...data!, sales: data!.sales.filter((s) => s.id !== id) };
    saveData(updated);
    setData(updated);
  }

  function deleteRental(id: string) {
    const updated = { ...data!, rentals: data!.rentals.filter((r) => r.id !== id) };
    saveData(updated);
    setData(updated);
  }

  function deleteExpense(id: string) {
    const updated = { ...data!, expenses: data!.expenses.filter((e) => e.id !== id) };
    saveData(updated);
    setData(updated);
  }

  const monthKeys = getLast6MonthKeys();
  const filteredSales = data.sales.filter((s) => s.date.startsWith(selectedMonth));
  const filteredRentals = data.rentals.filter((r) => r.date.startsWith(selectedMonth));
  const filteredExpenses = data.expenses.filter((e) => e.date.startsWith(selectedMonth));

  const rentalFeePreview =
    rListingPrice && !isNaN(parseFloat(rListingPrice))
      ? parseFloat(rListingPrice) * RENTAL_FEE_RATES[rChannel]
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">P&L Tracker</h1>
          <p className="text-sm text-muted-foreground">Log income and expenses, see your bottom line</p>
        </div>
        <Select value={selectedMonth} onValueChange={(v) => { if (v) setSelectedMonth(v); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthKeys.map((k) => (
              <SelectItem key={k} value={k}>
                {format(parse(k, "yyyy-MM", new Date()), "MMM yyyy")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PLSummary data={data} monthKey={selectedMonth} />

      <Tabs defaultValue="sales">
        <TabsList className="w-full">
          <TabsTrigger value="sales" className="flex-1">
            Sales ({filteredSales.length})
          </TabsTrigger>
          <TabsTrigger value="rentals" className="flex-1">
            Rentals ({filteredRentals.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1">
            Expenses ({filteredExpenses.length})
          </TabsTrigger>
        </TabsList>

        {/* Sales tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Log a Sale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Channel</Label>
                  <Select value={sChannel} onValueChange={(v) => setSChannel(v as Channel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Item description</Label>
                <Input
                  placeholder="e.g. Vintage Levi's 501, Size 30"
                  value={sDesc}
                  onChange={(e) => setSDesc(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Sale price ($)</Label>
                  <Input
                    type="number"
                    placeholder="45"
                    value={sAmount}
                    onChange={(e) => setSAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">What you paid ($)</Label>
                  <Input
                    type="number"
                    placeholder="8"
                    value={sCost}
                    onChange={(e) => setSCost(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={addSale} className="w-full gap-2">
                <Plus className="w-4 h-4" /> Add Sale
              </Button>
            </CardContent>
          </Card>

          {filteredSales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sales for this month yet.</p>
          ) : (
            <div className="space-y-2">
              {filteredSales.map((s) => {
                const margin = s.amount > 0 ? ((s.amount - s.itemCost) / s.amount) * 100 : 0;
                return (
                  <Card key={s.id}>
                    <CardContent className="py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{s.description}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">{s.channel}</Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{s.date}</span>
                          <span>Cost: {fmt(s.itemCost)}</span>
                          <span className="flex items-center gap-0.5">
                            {margin >= 60 ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-amber-500" />}
                            {margin.toFixed(0)}% margin
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-sm">{fmt(s.amount)}</span>
                        <button onClick={() => deleteSale(s.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Rentals tab */}
        <TabsContent value="rentals" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Log a Rental</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Rental fee is automatically calculated — 35% at 7wonders, 30% elsewhere. Item stays in your inventory.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Venue</Label>
                  <Select value={rChannel} onValueChange={(v) => setRChannel(v as RentalChannel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RENTAL_CHANNELS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Item description</Label>
                <Input
                  placeholder="e.g. Vintage YSL blazer"
                  value={rDesc}
                  onChange={(e) => setRDesc(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Item listing price ($)</Label>
                <Input
                  type="number"
                  placeholder="200"
                  value={rListingPrice}
                  onChange={(e) => setRListingPrice(e.target.value)}
                />
              </div>
              {rentalFeePreview !== null && (
                <div className="bg-accent/40 rounded-md px-3 py-2 text-sm flex justify-between">
                  <span className="text-muted-foreground">
                    Rental fee ({(RENTAL_FEE_RATES[rChannel] * 100).toFixed(0)}% of listing price)
                  </span>
                  <span className="font-semibold">{fmtDec(rentalFeePreview)}</span>
                </div>
              )}
              <Button onClick={addRental} className="w-full gap-2">
                <Plus className="w-4 h-4" /> Add Rental
              </Button>
            </CardContent>
          </Card>

          {filteredRentals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No rentals for this month yet.</p>
          ) : (
            <div className="space-y-2">
              {filteredRentals.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{r.description}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">{r.channel}</Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{r.date}</span>
                        <span>Listing: {fmt(r.itemListingPrice)}</span>
                        <span>{(RENTAL_FEE_RATES[r.channel] * 100).toFixed(0)}% fee</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-sm">{fmtDec(r.rentalFee)}</span>
                      <button onClick={() => deleteRental(r.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expenses tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Log an Expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={eCat} onValueChange={(v) => setECat(v as ExpenseCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  placeholder="e.g. Depop monthly fee"
                  value={eDesc}
                  onChange={(e) => setEDesc(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="25"
                  value={eAmount}
                  onChange={(e) => setEAmount(e.target.value)}
                />
              </div>
              <Button onClick={addExpense} className="w-full gap-2">
                <Plus className="w-4 h-4" /> Add Expense
              </Button>
            </CardContent>
          </Card>

          {filteredExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No expenses for this month yet.</p>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((e) => (
                <Card key={e.id}>
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{e.description}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{e.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{e.date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-sm text-red-600">−{fmt(e.amount)}</span>
                      <button onClick={() => deleteExpense(e.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
