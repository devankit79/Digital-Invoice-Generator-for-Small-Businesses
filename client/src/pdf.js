import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, states } from "../../shared/invoice.js";
const amount = (value) =>
  `INR ${(value / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function createInvoicePdf(invoice) {
  const { data, totals, number } = invoice;
  const doc = new jsPDF();
  const width = 174;
  const text = (value, x, y, size = 10) => {
    doc.setFontSize(size);
    doc.text(Array.isArray(value) ? value : String(value), x, y);
  };
  doc.setFillColor(20, 62, 53);
  doc.rect(0, 0, 210, 9, "F");
  doc.setTextColor(20, 62, 53);
  text(data.gstEnabled ? "TAX INVOICE" : "INVOICE", 18, 25, 23);
  doc.setTextColor(80);
  text(number || "PREVIEW - NOT SAVED", 18, 34);
  text(
    `Issued: ${formatDate(data.date)}   |   Due: ${formatDate(data.dueDate)}`,
    18,
    42,
  );
  const party = (label, value, x) => {
    doc.setFont("helvetica", "bold");
    text(label, x, 57, 9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(
      [
        value.name,
        value.address,
        states.find(([code]) => code === value.state)?.[1],
        value.gstin && `GSTIN: ${value.gstin}`,
        value.email,
        value.phone,
      ]
        .filter(Boolean)
        .join("\n"),
      80,
    );
    text(lines, x, 64);
    return 64 + lines.length * 4;
  };
  let y =
    Math.max(
      party("FROM", data.business, 18),
      party("BILL TO", data.customer, 110),
    ) + 10;
  text(
    `Place of supply: ${states.find(([code]) => code === data.placeOfSupply)?.[1]}`,
    18,
    y,
  );
  y += 7;
  autoTable(doc, {
    startY: y,
    margin: { left: 18, right: 18 },
    head: [
      [
        "Description",
        "HSN/SAC",
        "Qty",
        "Rate (INR)",
        ...(data.gstEnabled ? ["GST %"] : []),
        "Amount (INR)",
      ],
    ],
    body: totals.items.map((item) => [
      item.description,
      item.hsn || "-",
      item.quantity,
      item.price.toFixed(2),
      ...(data.gstEnabled ? [item.gstRate] : []),
      (item.amount / 100).toFixed(2),
    ]),
    styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [20, 62, 53] },
    columnStyles: { 0: { cellWidth: 55 } },
    theme: "striped",
  });
  y = doc.lastAutoTable.finalY + 10;
  const next = (space) => {
    if (y + space > 275) {
      doc.addPage();
      y = 22;
    }
  };
  const row = (label, value, bold = false) => {
    next(8);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    text(label, 115, y);
    doc.text(amount(value), 192, y, { align: "right" });
    y += 8;
  };
  row("Subtotal", totals.subtotal);
  if (data.gstEnabled) {
    if (totals.interstate) row("IGST", totals.igst);
    else {
      row("CGST", totals.cgst);
      row("SGST", totals.sgst);
    }
  }
  row("Total payable", totals.total, true);
  if (data.notes) {
    y += 5;
    const lines = doc.splitTextToSize(data.notes, width);
    doc.setFont("helvetica", "normal");
    for (const line of lines) {
      next(5);
      text(line, 18, y, 9);
      y += 5;
    }
  }
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    doc.setTextColor(120);
    text("Thank you for your business.", 18, 289, 8);
    doc.text(`Page ${p} of ${doc.getNumberOfPages()}`, 192, 289, {
      align: "right",
    });
  }
  return doc;
}

export function downloadInvoice(invoice) {
  const doc = createInvoicePdf(invoice);
  doc.save(`${(invoice.number || "invoice-preview").replaceAll("/", "-")}.pdf`);
}
