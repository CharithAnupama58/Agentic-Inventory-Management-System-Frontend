import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (v) => `$${parseFloat(v ?? 0).toFixed(2)}`;
const pct  = (v) => `${parseFloat(v ?? 0).toFixed(1)}%`;
const now  = () => new Date().toLocaleString();
const date = () => new Date().toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────
// PDF REPORT
// ─────────────────────────────────────────────────────────────────────────────
export function downloadPDF(data, businessName = "POS System") {
  const doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W     = doc.internal.pageSize.getWidth();
  let   y     = 0;

  // ── Cover header ─────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, W, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Business Analytics Report", 14, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(businessName, 14, 22);
  doc.text(`Generated: ${now()}`, 14, 28);

  y = 45;

  // ── Section helper ────────────────────────────────────────────────────────
  const section = (title) => {
    doc.setFillColor(239, 246, 255);
    doc.rect(14, y - 1, W - 28, 8, "F");
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 16, y + 5);
    y += 12;
  };

  const addTable = (head, body, opts = {}) => {
    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "grid",
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: 255,
        fontSize: 8,
        fontStyle: "bold",
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      ...opts,
    });
    y = doc.lastAutoTable.finalY + 8;
    if (y > 260) { doc.addPage(); y = 20; }
  };

  const rev    = data?.revenue;
  const profit = data?.profit;

  // ── 1. Revenue Summary ────────────────────────────────────────────────────
  section("1. Revenue Summary");
  addTable(
    [["Period", "Revenue", "Profit", "Transactions", "Growth"]],
    [
      ["Today",      fmt(rev?.todayRevenue),  fmt(rev?.todayProfit),  rev?.todayTransactions  ?? 0, "—"],
      ["This Week",  fmt(rev?.weekRevenue),   fmt(rev?.weekProfit),   rev?.weekTransactions   ?? 0, "—"],
      ["This Month", fmt(rev?.monthRevenue),  fmt(rev?.monthProfit),  rev?.monthTransactions  ?? 0, pct(rev?.revenueGrowth)],
    ]
  );

  // ── 2. Profit Analysis ────────────────────────────────────────────────────
  section("2. Profit Analysis");
  addTable(
    [["Metric", "Value"]],
    [
      ["Net Profit",       fmt(profit?.netProfit)],
      ["COGS",             fmt(profit?.cogs)],
      ["Refunds",          fmt(profit?.refunds)],
      ["Profit Margin",    pct(profit?.profitMarginPercent)],
      ["Avg Order Value",  fmt(rev?.avgOrderValue)],
      ["Monthly Refunds",  fmt(rev?.monthRefunds)],
    ],
    { columnStyles: { 0: { fontStyle: "bold" } } }
  );

  // ── 3. Top Products ───────────────────────────────────────────────────────
  section("3. Top Products This Month");
  if (data?.topProducts?.length) {
    addTable(
      [["Product", "Sold", "Revenue", "Profit", "Margin", "Stock", "Trend"]],
      data.topProducts.map((p, i) => [
        `${i+1}. ${p.productName}`,
        p.quantitySold,
        fmt(p.revenue),
        fmt(p.profit),
        pct(p.profitMargin),
        p.currentStock,
        p.trend,
      ])
    );
  }

  // ── 4. Daily Revenue (last 30 days) ───────────────────────────────────────
  section("4. Daily Revenue (Last 30 Days)");
  if (data?.dailyRevenue?.length) {
    addTable(
      [["Date", "Gross Revenue", "Net Revenue", "Refunds", "Transactions"]],
      data.dailyRevenue.map(d => [
        d.label,
        fmt(d.revenue),
        fmt(d.netRevenue),
        fmt(d.refunds),
        d.transactions,
      ])
    );
  }

  // ── 5. Monthly Revenue ────────────────────────────────────────────────────
  section("5. Monthly Revenue (Last 12 Months)");
  if (data?.monthlyRevenue?.length) {
    addTable(
      [["Month", "Revenue", "Net Revenue", "Profit", "Transactions", "Refunds"]],
      data.monthlyRevenue.map(d => [
        d.label,
        fmt(d.revenue),
        fmt(d.netRevenue),
        fmt(d.profit),
        d.transactions,
        fmt(d.refunds),
      ])
    );
  }

  // ── 6. Payment Methods ────────────────────────────────────────────────────
  section("6. Payment Methods This Month");
  if (data?.paymentBreakdown?.length) {
    addTable(
      [["Method", "Transactions", "Amount", "Share %"]],
      data.paymentBreakdown.map(p => [
        p.label, p.count, fmt(p.amount), pct(p.percentage),
      ])
    );
  }

  // ── 7. Highest Margin Products ────────────────────────────────────────────
  if (profit?.highestMarginProducts?.length) {
    section("7. Highest Margin Products");
    addTable(
      [["Product", "Revenue", "Profit", "Margin %"]],
      profit.highestMarginProducts.map(p => [
        p.productName, fmt(p.revenue), fmt(p.profit), pct(p.profitMargin),
      ])
    );
  }

  // ── 8. Slow Moving Stock ──────────────────────────────────────────────────
  if (data?.slowMoving?.length) {
    section("8. Slow-Moving Stock (0 Sales in 30 Days)");
    addTable(
      [["Product", "Current Stock", "Sales (30d)", "Recommendation"]],
      data.slowMoving.map(p => [
        p.productName, p.currentStock, 0, "Consider discount or promotion",
      ])
    );
  }

  // ── 9. Peak Hours ─────────────────────────────────────────────────────────
  const activeHours = data?.peakHours?.filter(h => h.transactions > 0);
  if (activeHours?.length) {
    section("9. Peak Sales Hours");
    addTable(
      [["Hour", "Transactions", "Revenue"]],
      [...activeHours]
        .sort((a, b) => b.transactions - a.transactions)
        .slice(0, 10)
        .map(h => [h.label, h.transactions, fmt(h.revenue)])
    );
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${businessName} · Analytics Report · Page ${i} of ${totalPages}`,
      14, 290
    );
    doc.text(`Generated ${now()}`, W - 14, 290, { align: "right" });
  }

  doc.save(`analytics-report-${date()}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL REPORT
// ─────────────────────────────────────────────────────────────────────────────
export function downloadExcel(data, businessName = "POS System") {
  const wb = XLSX.utils.book_new();

  // ── Helper: add a sheet ───────────────────────────────────────────────────
  const addSheet = (name, rows) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths
    const cols = rows[1]?.map((_, i) => ({
      wch: Math.max(
        ...rows.map(r => String(r[i] ?? "").length),
        10
      )
    })) ?? [];
    ws["!cols"] = cols;

    // Style header row
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = {
        font:      { bold: true, color: { rgb: "FFFFFF" } },
        fill:      { fgColor: { rgb: "1E3A8A" } },
        alignment: { horizontal: "center" },
      };
    }

    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };

  const rev    = data?.revenue;
  const profit = data?.profit;

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  addSheet("Summary", [
    ["Analytics Report — " + businessName],
    ["Generated", now()],
    [],
    ["REVENUE SUMMARY"],
    ["Period", "Revenue", "Profit", "Transactions", "Growth %"],
    ["Today",      rev?.todayRevenue,  rev?.todayProfit,  rev?.todayTransactions,  "—"],
    ["This Week",  rev?.weekRevenue,   rev?.weekProfit,   rev?.weekTransactions,   "—"],
    ["This Month", rev?.monthRevenue,  rev?.monthProfit,  rev?.monthTransactions,  rev?.revenueGrowth],
    [],
    ["PROFIT ANALYSIS"],
    ["Metric", "Value"],
    ["Net Profit",      profit?.netProfit],
    ["COGS",            profit?.cogs],
    ["Refunds",         profit?.refunds],
    ["Profit Margin %", profit?.profitMarginPercent],
    ["Avg Order Value", rev?.avgOrderValue],
    ["Monthly Refunds", rev?.monthRefunds],
  ]);

  // ── Sheet 2: Daily Revenue ────────────────────────────────────────────────
  if (data?.dailyRevenue?.length) {
    addSheet("Daily Revenue", [
      ["Date", "Gross Revenue", "Net Revenue", "Profit", "Refunds", "Transactions"],
      ...data.dailyRevenue.map(d => [
        d.label,
        parseFloat(d.revenue    ?? 0),
        parseFloat(d.netRevenue ?? 0),
        parseFloat(d.profit     ?? 0),
        parseFloat(d.refunds    ?? 0),
        d.transactions,
      ]),
    ]);
  }

  // ── Sheet 3: Monthly Revenue ──────────────────────────────────────────────
  if (data?.monthlyRevenue?.length) {
    addSheet("Monthly Revenue", [
      ["Month", "Revenue", "Net Revenue", "Profit", "Transactions", "Refunds"],
      ...data.monthlyRevenue.map(d => [
        d.label,
        parseFloat(d.revenue    ?? 0),
        parseFloat(d.netRevenue ?? 0),
        parseFloat(d.profit     ?? 0),
        d.transactions,
        parseFloat(d.refunds    ?? 0),
      ]),
    ]);
  }

  // ── Sheet 4: Top Products ─────────────────────────────────────────────────
  if (data?.topProducts?.length) {
    addSheet("Top Products", [
      ["Rank", "Product", "Qty Sold", "Revenue", "Profit", "Margin %", "Avg Daily", "Stock", "Trend"],
      ...data.topProducts.map((p, i) => [
        i + 1,
        p.productName,
        p.quantitySold,
        parseFloat(p.revenue      ?? 0),
        parseFloat(p.profit       ?? 0),
        parseFloat(p.profitMargin ?? 0),
        parseFloat(p.avgDailySales ?? 0),
        p.currentStock,
        p.trend,
      ]),
    ]);
  }

  // ── Sheet 5: Payment Methods ──────────────────────────────────────────────
  if (data?.paymentBreakdown?.length) {
    addSheet("Payment Methods", [
      ["Method", "Transactions", "Amount", "Share %"],
      ...data.paymentBreakdown.map(p => [
        p.label,
        p.count,
        parseFloat(p.amount     ?? 0),
        parseFloat(p.percentage ?? 0),
      ]),
    ]);
  }

  // ── Sheet 6: Profit Margins ───────────────────────────────────────────────
  const highM = profit?.highestMarginProducts ?? [];
  const lowM  = profit?.lowestMarginProducts  ?? [];
  if (highM.length || lowM.length) {
    addSheet("Profit Margins", [
      ["HIGHEST MARGIN PRODUCTS"],
      ["Product", "Revenue", "Profit", "Margin %"],
      ...highM.map(p => [p.productName, parseFloat(p.revenue ?? 0), parseFloat(p.profit ?? 0), parseFloat(p.profitMargin ?? 0)]),
      [],
      ["LOWEST MARGIN PRODUCTS"],
      ["Product", "Revenue", "Profit", "Margin %"],
      ...lowM.map(p => [p.productName, parseFloat(p.revenue ?? 0), parseFloat(p.profit ?? 0), parseFloat(p.profitMargin ?? 0)]),
    ]);
  }

  // ── Sheet 7: Slow Moving ──────────────────────────────────────────────────
  if (data?.slowMoving?.length) {
    addSheet("Slow Moving Stock", [
      ["Product", "Current Stock", "Sales (30d)", "Action Needed"],
      ...data.slowMoving.map(p => [
        p.productName, p.currentStock, 0, "Consider discount or promotion",
      ]),
    ]);
  }

  // ── Sheet 8: Peak Hours ───────────────────────────────────────────────────
  const activeHours = data?.peakHours?.filter(h => h.transactions > 0) ?? [];
  if (activeHours.length) {
    addSheet("Peak Hours", [
      ["Hour", "Transactions", "Revenue"],
      ...activeHours.map(h => [h.label, h.transactions, parseFloat(h.revenue ?? 0)]),
    ]);
  }

  // ── Save file ─────────────────────────────────────────────────────────────
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    `analytics-report-${date()}.xlsx`
  );
}
