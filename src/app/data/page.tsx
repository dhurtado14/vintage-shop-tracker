"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadAllData,
  insertSale,
  insertExpense,
  insertRental,
  insertInventoryItem,
} from "@/lib/db";
import {
  AppData,
  SaleEntry,
  ExpenseEntry,
  RentalEntry,
  InventoryItem,
  Channel,
  ExpenseCategory,
  RentalChannel,
  generateId,
} from "@/lib/store";
import { exportToCSV, parseCSV, downloadTemplate } from "@/lib/csv";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Upload, FileDown } from "lucide-react";

// ---- Valid values for validation ----

const VALID_CHANNELS: Channel[] = [
  "Shopify Site",
  "7wonders - Sale",
  "Instagram",
  "In-Person",
  "In-Person - Venmo",
  "In-Person - Zelle",
  "In-Person - POS",
  "Other",
];
const VALID_EXPENSE_CATEGORIES: ExpenseCategory[] = [
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
const VALID_RENTAL_CHANNELS: RentalChannel[] = ["7wonders", "Other"];

// Case-insensitive lookup helpers — returns the canonical value or the fallback
function matchChannel(val: string): Channel {
  return (
    VALID_CHANNELS.find((c) => c.toLowerCase() === val.toLowerCase()) ?? "Other"
  );
}
function matchExpenseCategory(val: string): ExpenseCategory {
  return (
    VALID_EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === val.toLowerCase()) ?? "Other"
  );
}
function matchRentalChannel(val: string): RentalChannel {
  return (
    VALID_RENTAL_CHANNELS.find((c) => c.toLowerCase() === val.toLowerCase()) ?? "Other"
  );
}

// ---- CSV column definitions ----

const SALE_HEADERS = ["date", "channel", "description", "amount", "item_cost"];
const EXPENSE_HEADERS = ["date", "category", "description", "amount"];
const RENTAL_HEADERS = [
  "date",
  "channel",
  "description",
  "item_listing_price",
  "rental_fee",
];
const INVENTORY_HEADERS = [
  "name",
  "code",
  "purchase_date",
  "purchase_price",
  "listing_price",
  "channel",
  "status",
  "sold_date",
  "sold_price",
];

// ---- Reusable Import Section ----

function ImportSection({
  headers,
  sampleRow,
  templateFilename,
  onImport,
}: {
  headers: string[];
  sampleRow: Record<string, string>;
  templateFilename: string;
  onImport: (
    rows: Record<string, string>[]
  ) => Promise<{ imported: number; skipped: number }>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setAllRows(rows);
      setPreview(rows.slice(0, 5));
      setStatus(`${rows.length} row${rows.length !== 1 ? "s" : ""} found. Review and click Import.`);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (allRows.length === 0) return;
    setLoading(true);
    try {
      const result = await onImport(allRows);
      setStatus(
        `✅ Imported ${result.imported} row${result.imported !== 1 ? "s" : ""}${
          result.skipped > 0 ? `, skipped ${result.skipped} invalid` : ""
        }.`
      );
      setAllRows([]);
      setPreview([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setStatus(`❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadTemplate(headers, sampleRow, templateFilename)}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Choose CSV File
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {preview.length > 0 && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded border">
            <table className="text-xs w-full">
              <thead className="bg-muted">
                <tr>
                  {headers.map((h) => (
                    <th
                      key={h}
                      className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t">
                    {headers.map((h) => (
                      <td
                        key={h}
                        className="px-2 py-1.5 truncate max-w-[140px]"
                      >
                        {row[h] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allRows.length > 5 && (
            <p className="text-xs text-muted-foreground">
              Showing first 5 of {allRows.length} rows
            </p>
          )}
          <Button size="sm" onClick={handleImport} disabled={loading}>
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {loading ? "Importing…" : `Import ${allRows.length} row${allRows.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}

      {status && (
        <p
          className={`text-sm ${
            status.startsWith("✅")
              ? "text-green-600"
              : status.startsWith("❌")
              ? "text-red-500"
              : "text-muted-foreground"
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function DataPage() {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    loadAllData().then(setData);
  }, []);

  function reload() {
    loadAllData().then(setData);
  }

  // ---- Export handlers ----

  function exportSales() {
    if (!data) return;
    exportToCSV(
      data.sales.map((s) => ({
        id: s.id,
        date: s.date,
        channel: s.channel,
        description: s.description,
        amount: s.amount,
        item_cost: s.itemCost,
      })),
      "yt-sales.csv"
    );
  }

  function exportExpenses() {
    if (!data) return;
    exportToCSV(
      data.expenses.map((e) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        description: e.description,
        amount: e.amount,
      })),
      "yt-expenses.csv"
    );
  }

  function exportRentals() {
    if (!data) return;
    exportToCSV(
      data.rentals.map((r) => ({
        id: r.id,
        date: r.date,
        channel: r.channel,
        description: r.description,
        item_listing_price: r.itemListingPrice,
        rental_fee: r.rentalFee,
      })),
      "yt-rentals.csv"
    );
  }

  function exportInventory() {
    if (!data) return;
    exportToCSV(
      data.inventory.map((i) => ({
        id: i.id,
        name: i.name,
        code: i.code ?? "",
        purchase_date: i.purchaseDate,
        purchase_price: i.purchasePrice,
        listing_price: i.listingPrice,
        channel: i.channel,
        status: i.status,
        sold_date: i.soldDate ?? "",
        sold_price: i.soldPrice ?? "",
      })),
      "yt-inventory.csv"
    );
  }

  // ---- Import handlers ----

  async function importSales(rows: Record<string, string>[]) {
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const amount = parseFloat(row.amount);
      if (!row.date || !row.description || isNaN(amount)) {
        skipped++;
        continue;
      }
      const sale: SaleEntry = {
        id: generateId(),
        date: row.date,
        channel: matchChannel(row.channel ?? ""),
        description: row.description,
        amount,
        itemCost: parseFloat(row.item_cost) || 0,
      };
      await insertSale(sale);
      imported++;
    }
    reload();
    return { imported, skipped };
  }

  async function importExpenses(rows: Record<string, string>[]) {
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const amount = parseFloat(row.amount);
      if (!row.date || !row.description || isNaN(amount)) {
        skipped++;
        continue;
      }
      const expense: ExpenseEntry = {
        id: generateId(),
        date: row.date,
        category: matchExpenseCategory(row.category ?? ""),
        description: row.description,
        amount,
      };
      await insertExpense(expense);
      imported++;
    }
    reload();
    return { imported, skipped };
  }

  async function importRentals(rows: Record<string, string>[]) {
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const listingPrice = parseFloat(row.item_listing_price);
      if (!row.date || !row.description || isNaN(listingPrice)) {
        skipped++;
        continue;
      }
      const channel: RentalChannel = matchRentalChannel(row.channel ?? "");
      const rentalFee =
        parseFloat(row.rental_fee) ||
        listingPrice * (channel === "7wonders" ? 0.35 : 0.3);
      const rental: RentalEntry = {
        id: generateId(),
        date: row.date,
        channel,
        description: row.description,
        itemListingPrice: listingPrice,
        rentalFee,
      };
      await insertRental(rental);
      imported++;
    }
    reload();
    return { imported, skipped };
  }

  async function importInventory(rows: Record<string, string>[]) {
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const purchasePrice = parseFloat(row.purchase_price);
      const listingPrice = parseFloat(row.listing_price);
      if (
        !row.name ||
        !row.purchase_date ||
        isNaN(purchasePrice) ||
        isNaN(listingPrice)
      ) {
        skipped++;
        continue;
      }
      const status = (
        ["Listed", "Sold", "Held"].includes(row.status) ? row.status : "Listed"
      ) as InventoryItem["status"];
      const item: InventoryItem = {
        id: generateId(),
        name: row.name,
        code: row.code || undefined,
        purchaseDate: row.purchase_date,
        purchasePrice,
        listingPrice,
        channel: matchChannel(row.channel ?? ""),
        status,
        soldDate: row.sold_date || undefined,
        soldPrice: row.sold_price ? parseFloat(row.sold_price) : undefined,
      };
      await insertInventoryItem(item);
      imported++;
    }
    reload();
    return { imported, skipped };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Export your data for backup, or import historic records from a CSV.
        </p>
      </div>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download your records as CSV files — great for backups or opening
            in Excel / Google Sheets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" onClick={exportSales} disabled={!data}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Sales{data ? ` (${data.sales.length})` : ""}
            </Button>
            <Button variant="outline" onClick={exportExpenses} disabled={!data}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Expenses{data ? ` (${data.expenses.length})` : ""}
            </Button>
            <Button variant="outline" onClick={exportRentals} disabled={!data}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Rentals{data ? ` (${data.rentals.length})` : ""}
            </Button>
            <Button variant="outline" onClick={exportInventory} disabled={!data}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Inventory{data ? ` (${data.inventory.length})` : ""}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Historic Data
          </CardTitle>
          <CardDescription>
            Bring in past records from a CSV. Download a template first to see
            the expected column format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="sales">
            <TabsList>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="rentals">Rentals</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="sales">
                <ImportSection
                  headers={SALE_HEADERS}
                  sampleRow={{
                    date: "2025-01-15",
                    channel: "In-Person",
                    description: "Vintage Levi jacket",
                    amount: "45.00",
                    item_cost: "12.00",
                  }}
                  templateFilename="sales-template.csv"
                  onImport={importSales}
                />
              </TabsContent>

              <TabsContent value="expenses">
                <ImportSection
                  headers={EXPENSE_HEADERS}
                  sampleRow={{
                    date: "2025-01-15",
                    category: "Sourcing (COGS)",
                    description: "Thrift store run",
                    amount: "85.00",
                  }}
                  templateFilename="expenses-template.csv"
                  onImport={importExpenses}
                />
              </TabsContent>

              <TabsContent value="rentals">
                <ImportSection
                  headers={RENTAL_HEADERS}
                  sampleRow={{
                    date: "2025-01-15",
                    channel: "7wonders",
                    description: "1970s fur coat rental",
                    item_listing_price: "200.00",
                    rental_fee: "70.00",
                  }}
                  templateFilename="rentals-template.csv"
                  onImport={importRentals}
                />
              </TabsContent>

              <TabsContent value="inventory">
                <ImportSection
                  headers={INVENTORY_HEADERS}
                  sampleRow={{
                    name: "Vintage Levi 501s",
                    code: "LV001",
                    purchase_date: "2025-01-10",
                    purchase_price: "12.00",
                    listing_price: "45.00",
                    channel: "In-Person",
                    status: "Listed",
                    sold_date: "",
                    sold_price: "",
                  }}
                  templateFilename="inventory-template.csv"
                  onImport={importInventory}
                />
              </TabsContent>
            </div>
          </Tabs>

          <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Format notes:</p>
            <p>• Dates must be YYYY-MM-DD (e.g. 2025-01-15)</p>
            <p>
              • Sales channels: Shopify Site, 7wonders - Sale, Instagram,
              In-Person, In-Person - Venmo, In-Person - Zelle, In-Person - POS,
              Other
            </p>
            <p>
              • Expense categories: Sourcing (COGS), Platform Fees, Shipping,
              Packaging, Marketing, Market Costs, Travel, Subscriptions,
              Photography, Other
            </p>
            <p>• Rental channels: 7wonders, Other</p>
            <p>• Inventory status: Listed, Sold, Held</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
