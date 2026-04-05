"use client";

import { useEffect, useState } from "react";
import {
  getMonthlyMetrics,
  getLast6MonthKeys,
  getStorePlanMetrics,
  AppData,
} from "@/lib/store";
import { loadAllData } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Package, Store, Target } from "lucide-react";
import { format, parse } from "date-fns";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const pct = (n: number) => `${n.toFixed(1)}%`;

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/40 bg-accent/30" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                {trend === "up" && <TrendingUp className="w-3 h-3 text-green-600" />}
                {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
                {sub}
              </p>
            )}
          </div>
          <div className="bg-primary/10 p-2 rounded-lg">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    loadAllData().then(setData);
  }, []);

  if (!data) return null;

  const monthKeys = getLast6MonthKeys();
  const currentMonth = monthKeys[monthKeys.length - 1];
  const prevMonth = monthKeys[monthKeys.length - 2];

  const curr = getMonthlyMetrics(data.sales, data.expenses, data.rentals, currentMonth);
  const prev = getMonthlyMetrics(data.sales, data.expenses, data.rentals, prevMonth);

  const revTrend = curr.revenue > prev.revenue ? "up" : curr.revenue < prev.revenue ? "down" : "neutral";
  const profitTrend = curr.netProfit > prev.netProfit ? "up" : curr.netProfit < prev.netProfit ? "down" : "neutral";

  const chartData = monthKeys.map((key) => {
    const m = getMonthlyMetrics(data.sales, data.expenses, data.rentals, key);
    const label = format(parse(key, "yyyy-MM", new Date()), "MMM");
    return { month: label, Revenue: m.revenue, "Net Profit": m.netProfit, "Gross Profit": m.grossProfit };
  });

  const { monthlyFixed, breakEvenRevenue } = getStorePlanMetrics(data.storePlan);

  // Store readiness: how close is avg monthly revenue to break-even?
  const avg3Revenue =
    [monthKeys[3], monthKeys[4], monthKeys[5]]
      .map((k) => getMonthlyMetrics(data.sales, data.expenses, data.rentals, k).revenue)
      .reduce((a, b) => a + b, 0) / 3;

  const readinessPct = breakEvenRevenue > 0 ? Math.min((avg3Revenue / breakEvenRevenue) * 100, 100) : 0;
  const savingsPct =
    data.storePlan.savingsGoal > 0
      ? Math.min((data.storePlan.currentSavings / data.storePlan.savingsGoal) * 100, 100)
      : 0;

  // Inventory summary
  const listedCount = data.inventory.filter((i) => i.status === "Listed").length;
  const soldThisMonth = data.inventory.filter(
    (i) => i.status === "Sold" && i.soldDate?.startsWith(currentMonth)
  ).length;

  // Channel breakdown this month
  const channelData = data.sales
    .filter((s) => s.date.startsWith(currentMonth))
    .reduce(
      (acc, s) => {
        acc[s.channel] = (acc[s.channel] || 0) + s.amount;
        return acc;
      },
      {} as Record<string, number>
    );
  const channelChartData = Object.entries(channelData)
    .map(([channel, Revenue]) => ({ channel, Revenue }))
    .sort((a, b) => b.Revenue - a.Revenue);

  const hasData = data.sales.length > 0 || data.expenses.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {format(parse(currentMonth, "yyyy-MM", new Date()), "MMMM yyyy")} overview
        </p>
      </div>

      {!hasData && (
        <Card className="border-dashed border-primary/30 bg-accent/20">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No data yet — start by logging a sale or expense in the{" "}
              <span className="font-medium text-foreground">P&L</span> tab, or add items in{" "}
              <span className="font-medium text-foreground">Inventory</span>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Revenue"
          value={fmt(curr.revenue)}
          sub={`${revTrend === "up" ? "↑" : "↓"} vs last month`}
          icon={DollarSign}
          trend={revTrend}
          accent
        />
        <StatCard
          title="Net Profit"
          value={fmt(curr.netProfit)}
          sub={`${profitTrend === "up" ? "↑" : "↓"} vs last month`}
          icon={TrendingUp}
          trend={profitTrend}
        />
        <StatCard
          title="Gross Margin"
          value={pct(curr.grossMargin)}
          sub="Revenue minus item cost"
          icon={Target}
        />
        <StatCard
          title="Items Listed"
          value={String(listedCount)}
          sub={`${soldThisMonth} sold this month`}
          icon={Package}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue & Profit (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#revGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Net Profit"
                  stroke="hsl(var(--chart-3))"
                  fill="url(#profGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales by Channel (this month)</CardTitle>
          </CardHeader>
          <CardContent>
            {channelChartData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                No sales logged yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={channelChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="channel" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Bar dataKey="Revenue" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Store Readiness */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              Store Readiness
            </CardTitle>
            <Badge
              variant={readinessPct >= 80 ? "default" : readinessPct >= 50 ? "secondary" : "outline"}
            >
              {readinessPct >= 80 ? "Almost ready!" : readinessPct >= 50 ? "Getting there" : "Building up"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Revenue vs Break-even ({fmt(avg3Revenue)} avg / {fmt(breakEvenRevenue)} needed)</span>
              <span className="font-medium text-foreground">{pct(readinessPct)}</span>
            </div>
            <Progress value={readinessPct} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Savings goal ({fmt(data.storePlan.currentSavings)} / {fmt(data.storePlan.savingsGoal)})</span>
              <span className="font-medium text-foreground">{pct(savingsPct)}</span>
            </div>
            <Progress value={savingsPct} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">
            Based on your store plan, you need{" "}
            <span className="font-semibold text-foreground">{fmt(breakEvenRevenue)}/month</span> to cover{" "}
            <span className="font-semibold text-foreground">{fmt(monthlyFixed)}/month</span> in fixed costs.
            Adjust in the <span className="font-medium">Store Plan</span> tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
