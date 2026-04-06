// ---- Export ----

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) {
    alert("No data to export.");
    return;
  }

  const headers = Object.keys(data[0]);

  function escapeCell(val: unknown): string {
    if (val === null || val === undefined) return "";
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }

  const csvLines = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
  ];

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTemplate(
  headers: string[],
  sampleRow: Record<string, string>,
  filename: string
): void {
  function escapeCell(val: string): string {
    return val.includes(",") || val.includes('"')
      ? `"${val.replace(/"/g, '""')}"`
      : val;
  }
  const headerLine = headers.join(",");
  const sampleLine = headers.map((h) => escapeCell(sampleRow[h] ?? "")).join(",");
  const blob = new Blob([[headerLine, sampleLine].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Import / Parse ----

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];

  function parseRow(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  const headers = parseRow(lines[0]);
  return lines
    .slice(1)
    .map((line) => {
      const vals = parseRow(line);
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    })
    .filter((row) => Object.values(row).some((v) => v !== ""));
}
