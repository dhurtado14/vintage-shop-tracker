"use client";

import { useEffect, useState } from "react";
import {
  loadData,
  saveData,
  getStorePlanMetrics,
  getMonthlyMetrics,
  getLast6MonthKeys,
  AppData,
  StorePlanConfig,
} from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Store, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function FieldRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="relative w-28 shrink-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
        <Input
          type="number"
          className="pl-6 text-right"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
    </div>
  );
}

export default function StorePlanPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [plan, setPlan] = useState<StorePlanConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const d = loadData();
    setData(d);
    setPlan({ ...d.storePlan });
  }, []);

  if (!data || !plan) return null;

  function updatePlan(key: keyof StorePlanConfig, value: number) {
    setPlan((p) => ({ ...p!, [key]: value }));
    setSaved(false);
  }

  function savePlan() {
    const updated = { ...data!, storePlan: plan! };
    saveData(updated);
    setData(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const { monthlyFixed, breakEvenRevenue } = getStorePlanMetrics(plan);

  // 3-month avg revenue
  const monthKeys = getLast6MonthKeys();
  const avg3Revenue =
    [monthKeys[3], monthKeys[4], monthKeys[5]]
      .map((k) => getMonthlyMetrics(data.sales, data.expenses, data.rentals, k).revenue)
      .reduce((a, b) => a + b, 0) / 3;

  const readinessPct = breakEvenRevenue > 0 ? Math.min((avg3Revenue / breakEvenRevenue) * 100, 100) : 0;
  const savingsPct =
    plan.savingsGoal > 0 ? Math.min((plan.currentSavings / plan.savingsGoal) * 100, 100) : 0;

  const gap = breakEvenRevenue - avg3Revenue;
  const isReady = gap <= 0;

  // What-if scenarios
  const scenarios = [
    { label: "Tight NYC space ($3.5k rent)", rent: 3500, staff: 1500 },
    { label: "Mid-size shop ($6k rent)", rent: 6000, staff: 2500 },
    { label: "Full boutique ($10k rent)", rent: 10000, staff: 4000 },
  ].map((s) => {
    const p = { ...plan, monthlyRent: s.rent, staffCost: s.staff };
    const { monthlyFixed: mf, breakEvenRevenue: ber } = getStorePlanMetrics(p);
    const readiness = ber > 0 ? Math.min((avg3Revenue / ber) * 100, 100) : 100;
    return { ...s, monthlyFixed: mf, breakEvenRevenue: ber, readiness };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Store Readiness Plan</h1>
        <p className="text-sm text-muted-foreground">
          Model out what a physical store costs and how close you are
        </p>
      </div>

      {/* Readiness banner */}
      <Card className={isReady ? "border-green-500/40 bg-green-50" : "border-primary/30 bg-accent/20"}>
        <CardContent className="py-4 flex items-start gap-3">
          <div className={`mt-0.5 ${isReady ? "text-green-600" : "text-primary"}`}>
            {isReady ? <CheckCircle2 className="w-5 h-5" /> : <Store className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {isReady
                ? "Your revenue already covers a store's break-even!"
                : `You need ${fmt(gap)} more/month to break even`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              3-month avg revenue: {fmt(avg3Revenue)} · Break-even needed:{" "}
              <span className="font-medium text-foreground">{fmt(breakEvenRevenue)}</span>
            </p>
            <Progress value={readinessPct} className="h-1.5 mt-2" />
          </div>
          <Badge variant={readinessPct >= 80 ? "default" : "secondary"}>
            {readinessPct.toFixed(0)}%
          </Badge>
        </CardContent>
      </Card>

      {/* Cost inputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Monthly Fixed Costs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldRow label="Rent" hint="NYC avg: $3k–$12k/mo for small retail" value={plan.monthlyRent} onChange={(v) => updatePlan("monthlyRent", v)} />
          <FieldRow label="Utilities" hint="Electric, internet, etc." value={plan.utilities} onChange={(v) => updatePlan("utilities", v)} />
          <FieldRow label="Insurance" hint="Business liability + property" value={plan.insurance} onChange={(v) => updatePlan("insurance", v)} />
          <FieldRow label="Staff" hint="Part-time help or yourself" value={plan.staffCost} onChange={(v) => updatePlan("staffCost", v)} />
          <FieldRow label="POS System" hint="Square, Shopify POS, etc." value={plan.posSystem} onChange={(v) => updatePlan("posSystem", v)} />
          <FieldRow label="Other fixed" hint="Cleaning, supplies, misc." value={plan.otherFixed} onChange={(v) => updatePlan("otherFixed", v)} />
          <div className="border-t pt-2 flex justify-between text-sm font-semibold">
            <span>Total Monthly Fixed</span>
            <span>{fmt(monthlyFixed)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">One-Time Buildout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldRow label="Buildout cost" hint="Fixtures, paint, racks — amortized over 24 months" value={plan.buildoutCost} onChange={(v) => updatePlan("buildoutCost", v)} />
          <p className="text-xs text-muted-foreground">
            Adds <span className="font-medium text-foreground">{fmt(plan.buildoutCost / 24)}/mo</span> to your break-even calculation
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Revenue Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Target gross margin (%)</Label>
              <p className="text-xs text-muted-foreground">For vintage, aim for 60–80%</p>
            </div>
            <div className="relative w-28 shrink-0">
              <Input
                type="number"
                className="text-right pr-6"
                value={plan.targetMargin || ""}
                onChange={(e) => updatePlan("targetMargin", parseFloat(e.target.value) || 0)}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
          <div className="bg-accent/30 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Break-even revenue needed</span>
              <span className="font-bold text-primary">{fmt(breakEvenRevenue)}/mo</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              = {fmt(monthlyFixed)} fixed costs ÷ {plan.targetMargin}% margin
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Savings goal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Opening Day Savings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldRow label="Savings goal" hint="Deposit + buildout + 3mo runway" value={plan.savingsGoal} onChange={(v) => updatePlan("savingsGoal", v)} />
          <FieldRow label="Current savings" hint="How much you have set aside today" value={plan.currentSavings} onChange={(v) => updatePlan("currentSavings", v)} />
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{fmt(plan.currentSavings)} saved of {fmt(plan.savingsGoal)}</span>
              <span className="font-medium text-foreground">{savingsPct.toFixed(0)}%</span>
            </div>
            <Progress value={savingsPct} className="h-2" />
          </div>
          {avg3Revenue > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              At your current profit rate, you could hit your goal in ~
              {Math.ceil((plan.savingsGoal - plan.currentSavings) / (avg3Revenue * 0.4))} months
            </p>
          )}
        </CardContent>
      </Card>

      <Button onClick={savePlan} className="w-full" variant={saved ? "secondary" : "default"}>
        {saved ? "Saved!" : "Save Plan"}
      </Button>

      {/* Scenarios */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            What-If Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scenarios.map((s) => (
            <div key={s.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground">
                  Break-even: <span className="font-semibold text-foreground">{fmt(s.breakEvenRevenue)}/mo</span>
                </span>
              </div>
              <Progress value={s.readiness} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                You&apos;re at {s.readiness.toFixed(0)}% of break-even with your current revenue
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
