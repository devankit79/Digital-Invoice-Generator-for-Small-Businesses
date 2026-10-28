import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateInvoice, invoiceSchema } from "../shared/invoice.js";
const party = {
  name: "Test business",
  address: "Mathura, Uttar Pradesh 281001",
  state: "09",
  gstin: "09ABCDE1234F1Z5",
  email: "",
  phone: "",
};
const invoice = () => ({
  business: { ...party },
  customer: { ...party, gstin: "" },
  date: "2026-10-28",
  dueDate: "2026-11-01",
  placeOfSupply: "09",
  gstEnabled: true,
  items: [
    {
      description: "Consulting",
      hsn: "9983",
      quantity: 2,
      price: 500,
      gstRate: 18,
    },
  ],
  notes: "",
});
test("same-state GST divides 18% into equal central and state amounts", () => {
  const result = calculateInvoice(invoice());
  assert.equal(result.subtotal, 100000);
  assert.equal(result.cgst, 9000);
  assert.equal(result.sgst, 9000);
  assert.equal(result.igst, 0);
  assert.equal(result.total, 118000);
});
test("place of supply determines interstate tax, independently of billing address", () => {
  const data = invoice();
  data.placeOfSupply = "07";
  const result = calculateInvoice(data);
  assert.equal(result.igst, 18000);
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
  assert.equal(result.total, 118000);
});
test("non-GST invoices ignore line tax rates", () => {
  const data = invoice();
  data.gstEnabled = false;
  assert.equal(calculateInvoice(data).total, 100000);
});
test("fractional quantities round line amounts to paise", () => {
  const data = invoice();
  data.gstEnabled = false;
  data.items[0] = { ...data.items[0], quantity: 1.5, price: 99.99 };
  assert.equal(calculateInvoice(data).total, 14999);
});
test("mixed rates and zero-rated lines calculate independently", () => {
  const data = invoice();
  data.items = [
    { description: "One", hsn: "", quantity: 1, price: 100, gstRate: 5 },
    { description: "Two", hsn: "", quantity: 1, price: 100, gstRate: 0 },
  ];
  assert.equal(calculateInvoice(data).total, 20500);
});
test("valid invoice accepted and required fields checked", () => {
  assert.equal(invoiceSchema.safeParse(invoice()).success, true);
  const data = invoice();
  data.customer.name = " ";
  assert.equal(invoiceSchema.safeParse(data).success, false);
});
test("negative quantity, invalid date, wrong GSTIN state and missing GSTIN rejected", () => {
  for (const change of [
    (d) => (d.items[0].quantity = -1),
    (d) => (d.date = "2026-02-30"),
    (d) => (d.business.state = "07"),
    (d) => (d.business.gstin = ""),
    (d) => (d.dueDate = "2026-01-01"),
    (d) => (d.items = []),
  ]) {
    const data = invoice();
    change(data);
    assert.equal(invoiceSchema.safeParse(data).success, false);
  }
});
