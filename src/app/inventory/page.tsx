"use client";

import { useEffect, useState } from "react";
import {
  generateId,
  AppData,
  InventoryItem,
  Channel,
} from "@/lib/store";
import {
  loadAllData,
  insertInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Clock } from "lucide-react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

const CHANNELS: Channel[] = ["Shopify Site", "7wonders - Sale", "Instagram", "In-Person - Venmo", "In-Person - Zelle", "In-Person - POS", "In-Person", "Other"];
const TODAY = new Date().toISOString().slice(0, 10);

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

const statusColor: Record<InventoryItem["status"], string> = {
  Listed: "bg-blue-100 text-blue-700",
  Sold: "bg-green-100 text-green-700",
  Held: "bg-amber-100 text-amber-700",
};

export default function InventoryPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [filterStatus, setFilterStatus] = useState<"All" | InventoryItem["status"]>("All");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(TODAY);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [channel, setChannel] = useState<Channel>("Shopify Site");

  useEffect(() => {
    loadAllData().then(setData);
  }, []);

  if (!data) return <LoadingSkeleton />;

  async function addItem() {
    if (!name || !purchasePrice || !listingPrice) return;
    const item: InventoryItem = {
      id: generateId(),
      name,
      ...(code ? { code } : {}),
      purchaseDate,
      purchasePrice: parseFloat(purchasePrice),
      listingPrice: parseFloat(listingPrice),
      channel,
      status: "Listed",
    };
    setData((d) => d && { ...d, inventory: [item, ...d.inventory] });
    setName("");
    setCode("");
    setPurchasePrice("");
    setListingPrice("");
    await insertInventoryItem(item);
  }

  async function markSold(id: string) {
    let soldItem: InventoryItem | undefined;
    setData((d) => {
      if (!d) return d;
      const inventory = d.inventory.map((i) => {
        if (i.id === id) {
          soldItem = { ...i, status: "Sold" as const, soldDate: TODAY, soldPrice: i.listingPrice };
          return soldItem;
        }
        return i;
      });
      return { ...d, inventory };
    });
    // Persist after state update — use the item from current data
    const item = data!.inventory.find((i) => i.id === id);
    if (item) {
      await updateInventoryItem({ ...item, status: "Sold", soldDate: TODAY, soldPrice: item.listingPrice });
    }
  }

  async function deleteItem(id: string) {
    setData((d) => d && { ...d, inventory: d.inventory.filter((i) => i.id !== id) });
    await deleteInventoryItem(id);
  }

  const filtered =
    filterStatus === "All" ? data.inventory : data.inventory.filter((i) => i.status === filterStatus);

  const listed = data.inventory.filter((i) => i.status === "Listed");
  const sold = data.inventory.filter((i) => i.status === "Sold");
  const avgDaysToSell =
    sold.length > 0
      ? sold.reduce((sum, i) => sum + (i.soldDate ? daysBetween(i.purchaseDate, i.soldDate) : 0), 0) /
        sold.length
      : null;
  const totalInventoryValue = listed.reduce((sum, i) => sum + i.listingPrice, 0);
  const avgMargin =
    sold.length > 0
      ? (sold.reduce((sum, i) => sum + ((i.soldPrice ?? i.listingPrice) - i.purchasePrice), 0) /
          sold.reduce((sum, i) => sum + (i.soldPrice ?? i.listingPrice), 0)) *
        100
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Track what you have, what you paid, and what it sold for</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Items Listed", value: String(listed.length) },
          { label: "Listed Value", value: fmt(totalInventoryValue) },
          { label: "Avg Days to Sell", value: avgDaysToSell !== null ? `${Math.round(avgDaysToSell)}d` : "—" },
          { label: "Avg Sell Margin", value: avgMargin !== null ? `${avgMargin.toFixed(0)}%` : "—" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add item */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Add Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Item name</Label>
              <Input
                placeholder="e.g. Vintage Levi's 501 Jeans"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1 w-28">
              <Label className="text-xs">Code #</Label>
              <Input
                placeholder="e.g. J-042"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Purchase date</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">What you paid ($)</Label>
              <Input
                type="number"
                placeholder="8"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Listing price ($)</Label>
              <Input
                type="number"
                placeholder="65"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={addItem} className="w-full gap-2">
            <Plus className="w-4 h-4" /> Add to Inventory
          </Button>
        </CardContent>
      </Card>

      {/* Filter + list */}
      <div className="flex gap-2">
        {(["All", "Listed", "Sold", "Held"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No items here yet.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const margin =
              item.status === "Sold" && item.soldPrice
                ? ((item.soldPrice - item.purchasePrice) / item.soldPrice) * 100
                : ((item.listingPrice - item.purchasePrice) / item.listingPrice) * 100;
            const daysListed =
              item.status === "Listed" ? daysBetween(item.purchaseDate, TODAY) : null;
            return (
              <Card key={item.id}>
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.code && (
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          #{item.code}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[item.status]}`}
                      >
                        {item.status}
                      </span>
                      <Badge variant="outline" className="text-xs">{item.channel}</Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>Cost: {fmt(item.purchasePrice)}</span>
                      <span>
                        {item.status === "Sold" && item.soldPrice
                          ? `Sold: ${fmt(item.soldPrice)}`
                          : `Listed: ${fmt(item.listingPrice)}`}
                      </span>
                      <span className="font-medium text-foreground">{margin.toFixed(0)}% margin</span>
                      {daysListed !== null && (
                        <span className={`flex items-center gap-1 ${daysListed > 30 ? "text-amber-600" : ""}`}>
                          <Clock className="w-3 h-3" />
                          {daysListed}d listed
                        </span>
                      )}
                      {item.status === "Sold" && item.soldDate && (
                        <span className="flex items-center gap-1 text-green-700">
                          <CheckCircle2 className="w-3 h-3" />
                          Sold {item.soldDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.status === "Listed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => markSold(item.id)}
                      >
                        Mark sold
                      </Button>
                    )}
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
