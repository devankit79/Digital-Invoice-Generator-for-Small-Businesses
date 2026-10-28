import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  FilePlus2,
  History,
  ArrowUpRight,
  Plus,
  Trash2,
  Download,
  Eye,
  X,
  ArrowLeft,
  FileText,
  Check,
  Search,
  IndianRupee,
  ChevronRight,
  Menu,
} from "lucide-react";
import {
  calculateInvoice,
  invoiceSchema,
  money,
  formatDate,
  states,
} from "../../shared/invoice.js";
import InvoicePreview from "./InvoicePreview";
const downloadInvoice = async (invoice) => {
  const pdf = await import("./pdf");
  pdf.downloadInvoice(invoice);
};
import "./style.css";
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const blankParty = () => ({
  name: "",
  address: "",
  state: "09",
  gstin: "",
  email: "",
  phone: "",
});
const blankItem = () => ({
  description: "",
  hsn: "",
  quantity: 1,
  price: 0,
  gstRate: 18,
});
const blankInvoice = () => ({
  business: blankParty(),
  customer: blankParty(),
  date: today(),
  dueDate: today(),
  placeOfSupply: "09",
  gstEnabled: false,
  items: [blankItem()],
  notes: "Thank you for your business.",
});
async function api(path, options) {
  let response;
  try {
    response = await fetch(`/api${path}`, options);
  } catch {
    throw new Error(
      "Cannot connect to the server. Check that the backend is running.",
    );
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}
function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
function StateSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {states.map(([code, name]) => (
        <option value={code} key={code}>
          {name} ({code})
        </option>
      ))}
    </select>
  );
}
function App() {
  const [page, setPage] = useState("dashboard"),
    [invoices, setInvoices] = useState([]),
    [loading, setLoading] = useState(true),
    [db, setDb] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [preview, setPreview] = useState(null),
    [saving, setSaving] = useState(false),
    [mobile, setMobile] = useState(false);
  const [form, setForm] = useState(blankInvoice),
    [saved, setSaved] = useState(null);
  const totals = calculateInvoice(form);
  async function load() {
    setLoading(true);
    try {
      const health = await api("/health");
      setDb(health.database === "connected");
      if (health.database === "connected") setInvoices(await api("/invoices"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (db) return;
    // A local MongoDB process can take a moment to start on the first run.
    const timer = setInterval(async () => {
      try {
        const health = await api("/health");
        if (health.database === "connected") await load();
      } catch {
        // Keep the current notice visible until the server is available.
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [db]);
  function navigate(value) {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "instant" });
    setMobile(false);
    setError("");
    setNotice("");
  }
  function update(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
    setSaved(null);
  }
  function party(key, field, value) {
    update(key, { ...form[key], [field]: value });
  }
  function item(index, key, value) {
    update(
      "items",
      form.items.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    );
  }
  function valid() {
    const result = invoiceSchema.safeParse(form);
    if (!result.success) {
      setError(
        `${result.error.issues[0].path.join(" → ")}: ${result.error.issues[0].message}`,
      );
      return false;
    }
    setError("");
    return true;
  }
  function showPreview() {
    if (valid()) setPreview(saved || { data: form, totals });
  }
  async function save() {
    if (!valid() || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const result = await api("/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(result);
      setInvoices((old) => [result, ...old]);
      setDb(true);
      setNotice(`Invoice ${result.number} saved successfully.`);
      setPreview(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  function startNew() {
    setForm(blankInvoice());
    setSaved(null);
    navigate("create");
  }
  const visible = invoices.filter((inv) =>
    `${inv.number} ${inv.data.customer.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const totalValue = invoices.reduce((sum, inv) => sum + inv.totals.total, 0);
  function invoiceTable(rows) {
    return (
      <div className="table-scroll">
        <table className="history-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Issued on</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv._id}>
                <td>
                  <span className="invoice-id">{inv.number}</span>
                  <small>
                    {inv.data.gstEnabled ? "GST invoice" : "Standard invoice"}
                  </small>
                </td>
                <td>
                  <div className="customer-cell">
                    <span className="avatar">
                      {inv.data.customer.name.slice(0, 1).toUpperCase()}
                    </span>
                    {inv.data.customer.name}
                  </div>
                </td>
                <td>{formatDate(inv.data.date)}</td>
                <td className="amount">{money(inv.totals.total)}</td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Preview ${inv.number}`}
                    onClick={() => setPreview(inv)}
                  >
                    <Eye size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Download ${inv.number}`}
                    onClick={() => downloadInvoice(inv)}
                  >
                    <Download size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const partyForm = (key, title, subtitle) => (
    <section className="party-section">
      <div className="section-heading">
        <span className="step">{key === "business" ? "01" : "02"}</span>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="fields">
        <Field
          label={key === "business" ? "Business name *" : "Customer name *"}
          value={form[key].name}
          maxLength={120}
          placeholder={
            key === "business" ? "Your business name" : "Who are you billing?"
          }
          onChange={(e) => party(key, "name", e.target.value)}
        />
        <Field label="State / Union territory *">
          <StateSelect
            value={form[key].state}
            onChange={(value) => party(key, "state", value)}
          />
        </Field>
        <Field label="Address *">
          <textarea
            rows={2}
            value={form[key].address}
            maxLength={500}
            placeholder="Street, city and PIN code"
            onChange={(e) => party(key, "address", e.target.value)}
          />
        </Field>
        <Field
          label={`GSTIN ${key === "business" && form.gstEnabled ? "*" : "(optional)"}`}
          value={form[key].gstin}
          maxLength={15}
          placeholder="09ABCDE1234F1Z5"
          onChange={(e) => party(key, "gstin", e.target.value.toUpperCase())}
        />
        <Field
          label="Email (optional)"
          type="email"
          value={form[key].email}
          onChange={(e) => party(key, "email", e.target.value)}
        />
        <Field
          label="Phone (optional)"
          value={form[key].phone}
          maxLength={20}
          onChange={(e) => party(key, "phone", e.target.value)}
        />
      </div>
    </section>
  );
  return (
    <div className="app">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="brand-icon">
            <FileText size={23} />
          </span>
          <span className="brand-name">Vyapar Invoice</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav>
          {[
            ["dashboard", LayoutDashboard, "Overview"],
            ["create", FilePlus2, "Create invoice"],
            ["history", History, "Invoice history"],
          ].map(([id, Icon, label]) => (
            <button
              className={page === id ? "active" : ""}
              onClick={() => navigate(id)}
              key={id}
            >
              <Icon size={19} />
              {label}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="mini-symbol">₹</span>
          <h4>Made for your business.</h4>
          <p>
            Less paperwork.
            <br />
            More time for what you do.
          </p>
          <span className="india-tag">BUILT FOR INDIA</span>
        </div>
        <div className="sidebar-footer">
          <span className="profile">AK</span>
          <div>
            <strong>MCA Mini Project</strong>
            <small>Digital Invoice Generator</small>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle icon-button"
              onClick={() => setMobile(!mobile)}
              aria-label="Toggle navigation"
            >
              <Menu size={22} />
            </button>
            Workspace <ChevronRight size={13} />
            <strong>
              {page === "dashboard"
                ? "Overview"
                : page === "create"
                  ? "Create invoice"
                  : "Invoice history"}
            </strong>
          </div>
          <span className="local-badge">
            <span /> Small business edition
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">SIMPLE INVOICING. EVERY DAY.</div>
              <h1>
                {page === "dashboard"
                  ? "A little less admin."
                  : page === "create"
                    ? "Let’s make it official."
                    : "Every invoice, in one place."}
              </h1>
              <p>
                {page === "dashboard"
                  ? "Your invoices, organised. Your business, moving forward."
                  : page === "create"
                    ? "Add the details. We’ll take care of the numbers."
                    : "Find, revisit and download your saved invoices."}
              </p>
            </div>
            {page !== "create" && (
              <button className="button primary" onClick={startNew}>
                <Plus size={18} />
                Create invoice
              </button>
            )}
          </div>
          {error && (
            <div role="alert" className="message error">
              {error}
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="message success">
              <Check size={18} />
              {notice}
            </div>
          )}
          {!db && !loading && (
            <div className="database-notice">
              <span className="status-dot" />
              <div>
                <strong>Database is not connected</strong>
                <span>
                  You can create, preview and download invoices. Connect MongoDB
                  to save and view history.
                </span>
              </div>
              <button className="text-button" onClick={load}>
                Retry
              </button>
            </div>
          )}
          {page === "dashboard" && (
            <>
              <section className="welcome-card">
                <div>
                  <span className="pill">YOUR NEXT INVOICE STARTS HERE</span>
                  <h2>
                    Good work deserves
                    <br />a great invoice.
                  </h2>
                  <p>
                    Create a professional invoice in minutes.
                    <br />
                    Clear totals, easy GST and a PDF ready to share.
                  </p>
                  <button className="button light" onClick={startNew}>
                    Create your invoice
                    <ArrowUpRight size={17} />
                  </button>
                </div>
                <div className="invoice-art" aria-hidden="true">
                  <div className="art-paper">
                    <div className="art-brand">
                      YOUR BUSINESS <span>INVOICE</span>
                    </div>
                    <div className="art-line w60" />
                    <div className="art-line w40" />
                    <div className="art-divider" />
                    <div className="art-row">
                      <span>Good work</span>
                      <span>₹ 5,000.00</span>
                    </div>
                    <div className="art-row">
                      <span>GST · 18%</span>
                      <span>₹ 900.00</span>
                    </div>
                    <div className="art-divider" />
                    <div className="art-total">
                      <span>Total</span>
                      <strong>₹ 5,900.00</strong>
                    </div>
                    <div className="art-thanks">
                      Thank you for your business.
                    </div>
                  </div>
                  <div className="art-check">
                    <Check size={20} /> All the numbers, sorted.
                  </div>
                </div>
              </section>
              <section className="stats">
                <div className="stat-card">
                  <div>
                    <span>Total invoices</span>
                    <FileText size={18} />
                  </div>
                  <strong>{invoices.length.toString().padStart(2, "0")}</strong>
                  <small>Saved in your workspace</small>
                </div>
                <div className="stat-card">
                  <div>
                    <span>Invoice value</span>
                    <IndianRupee size={18} />
                  </div>
                  <strong>{money(totalValue)}</strong>
                  <small>Total value of saved invoices</small>
                </div>
                <div className="stat-card">
                  <div>
                    <span>Ready for business</span>
                    <Check size={18} />
                  </div>
                  <strong className="stat-label">GST & non-GST</strong>
                  <small>One simple invoice workflow</small>
                </div>
              </section>
              <section className="card">
                <div className="card-heading">
                  <div>
                    <h3>Recent invoices</h3>
                    <p>A quick look at your latest paperwork.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("history")}
                  >
                    View all
                    <ArrowUpRight size={16} />
                  </button>
                </div>
                {loading ? (
                  <div className="empty">Loading your invoices…</div>
                ) : invoices.length ? (
                  invoiceTable(invoices.slice(0, 5))
                ) : (
                  <div className="empty">
                    <div className="empty-icon">
                      <FileText size={26} />
                    </div>
                    <h3>Your first invoice is a fresh start.</h3>
                    <p>Once you save an invoice, it will appear right here.</p>
                    <button className="text-button" onClick={startNew}>
                      Create an invoice
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                )}
              </section>
              <div className="bottom-note">
                <span>₹ INR currency</span>
                <span>Automatic GST calculations</span>
                <span>Professional PDF downloads</span>
              </div>
            </>
          )}
          {page === "history" && (
            <section className="card">
              <div className="card-heading">
                <div>
                  <h3>
                    Saved invoices{" "}
                    <span className="count">{invoices.length}</span>
                  </h3>
                  <p>Latest 1,000 records, newest first.</p>
                </div>
                <div className="search">
                  <Search size={17} />
                  <input
                    aria-label="Search invoices"
                    placeholder="Search number or customer"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              {loading ? (
                <div className="empty">Loading invoices…</div>
              ) : visible.length ? (
                invoiceTable(visible)
              ) : (
                <div className="empty">
                  <History size={30} />
                  <h3>
                    {search ? "No matching invoices" : "No saved invoices yet"}
                  </h3>
                  <p>
                    {search
                      ? "Try another invoice number or customer name."
                      : "Create and save your first invoice to start your history."}
                  </p>
                </div>
              )}
            </section>
          )}
          {page === "create" && (
            <div className="editor-layout">
              <div className="editor-main">
                <section className="card invoice-options">
                  <div className="card-heading">
                    <div>
                      <h3>Invoice details</h3>
                      <p>
                        {saved
                          ? saved.number
                          : "Invoice number is assigned when you save."}
                      </p>
                    </div>
                    <span className="draft-tag">
                      {saved ? "Saved" : "Unsaved"}
                    </span>
                  </div>
                  <div className="fields">
                    <Field
                      label="Invoice date *"
                      type="date"
                      value={form.date}
                      onChange={(e) => update("date", e.target.value)}
                    />
                    <Field
                      label="Due date *"
                      type="date"
                      min={form.date}
                      value={form.dueDate}
                      onChange={(e) => update("dueDate", e.target.value)}
                    />
                  </div>
                  <div className="gst-toggle">
                    <div>
                      <strong>GST invoice</strong>
                      <p>Enable tax calculation and business GSTIN.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.gstEnabled}
                      aria-label="GST invoice"
                      className={`switch ${form.gstEnabled ? "on" : ""}`}
                      onClick={() => update("gstEnabled", !form.gstEnabled)}
                    >
                      <span />
                    </button>
                  </div>
                  {form.gstEnabled && (
                    <Field label="Place of supply *">
                      <StateSelect
                        value={form.placeOfSupply}
                        onChange={(value) => update("placeOfSupply", value)}
                      />
                    </Field>
                  )}
                </section>
                <section className="card party-card">
                  {partyForm(
                    "business",
                    "Your business",
                    "The details that appear on your invoice.",
                  )}
                  {partyForm(
                    "customer",
                    "Bill to",
                    "Your customer’s billing information.",
                  )}
                </section>
                <section className="card items-card">
                  <div className="card-heading">
                    <div>
                      <h3>Items & services</h3>
                      <p>Prices are exclusive of GST. Add up to 100 items.</p>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Item description *</th>
                          <th>Qty *</th>
                          <th>Rate (₹) *</th>
                          {form.gstEnabled && <th>GST %</th>}
                          <th>Amount</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((row, index) => (
                          <tr key={index}>
                            <td>
                              <input
                                aria-label={`Item ${index + 1} description`}
                                placeholder="Product or service"
                                maxLength={250}
                                value={row.description}
                                onChange={(e) =>
                                  item(index, "description", e.target.value)
                                }
                              />
                              {form.gstEnabled && (
                                <input
                                  className="hsn-input"
                                  aria-label={`Item ${index + 1} HSN SAC`}
                                  placeholder="HSN / SAC (optional)"
                                  maxLength={8}
                                  value={row.hsn}
                                  onChange={(e) =>
                                    item(index, "hsn", e.target.value)
                                  }
                                />
                              )}
                            </td>
                            <td>
                              <input
                                aria-label={`Item ${index + 1} quantity`}
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={row.quantity}
                                onChange={(e) =>
                                  item(
                                    index,
                                    "quantity",
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value),
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                aria-label={`Item ${index + 1} price`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.price}
                                onChange={(e) =>
                                  item(
                                    index,
                                    "price",
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value),
                                  )
                                }
                              />
                            </td>
                            {form.gstEnabled && (
                              <td>
                                <select
                                  aria-label={`Item ${index + 1} GST rate`}
                                  value={row.gstRate}
                                  onChange={(e) =>
                                    item(
                                      index,
                                      "gstRate",
                                      Number(e.target.value),
                                    )
                                  }
                                >
                                  {[0, 5, 12, 18, 28].map((rate) => (
                                    <option key={rate} value={rate}>
                                      {rate}%
                                    </option>
                                  ))}
                                </select>
                              </td>
                            )}
                            <td className="amount">
                              {money(totals.items[index].amount)}
                            </td>
                            <td>
                              <button
                                disabled={form.items.length === 1}
                                className="icon-button"
                                aria-label={`Remove item ${index + 1}`}
                                onClick={() =>
                                  update(
                                    "items",
                                    form.items.filter((_, i) => i !== index),
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    className="text-button add-item"
                    disabled={form.items.length >= 100}
                    onClick={() =>
                      update("items", [...form.items, blankItem()])
                    }
                  >
                    <Plus size={17} />
                    Add another item
                  </button>
                </section>
                <section className="card notes-card">
                  <Field label="Notes / payment instructions (optional)">
                    <textarea
                      rows={3}
                      maxLength={1500}
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                    />
                  </Field>
                </section>
              </div>
              <aside className="summary card">
                <div className="summary-header">
                  <h3>Invoice summary</h3>
                  <span>INR ₹</span>
                </div>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>{money(totals.subtotal)}</strong>
                </div>
                {form.gstEnabled &&
                  (totals.interstate ? (
                    <div className="summary-row">
                      <span>IGST</span>
                      <strong>{money(totals.igst)}</strong>
                    </div>
                  ) : (
                    <>
                      <div className="summary-row">
                        <span>CGST</span>
                        <strong>{money(totals.cgst)}</strong>
                      </div>
                      <div className="summary-row">
                        <span>SGST</span>
                        <strong>{money(totals.sgst)}</strong>
                      </div>
                    </>
                  ))}
                <div className="grand-total">
                  <span>Total payable</span>
                  <strong>{money(totals.total)}</strong>
                </div>
                <p className="summary-help">
                  {form.gstEnabled
                    ? totals.interstate
                      ? "Interstate supply · IGST applied"
                      : "Same-state supply · CGST + SGST applied"
                    : "Standard invoice · No GST applied"}
                </p>
                <button
                  className="button primary full"
                  onClick={save}
                  disabled={saving || !!saved}
                >
                  {saving ? (
                    "Saving…"
                  ) : saved ? (
                    <>
                      <Check size={17} />
                      Invoice saved
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      Save invoice
                    </>
                  )}
                </button>
                <button className="button secondary full" onClick={showPreview}>
                  <Eye size={17} />
                  Preview invoice
                </button>
                <button
                  className="text-button full"
                  onClick={() => {
                    if (valid())
                      downloadInvoice(saved || { data: form, totals });
                  }}
                >
                  <Download size={16} />
                  Download {saved ? "PDF" : "preview PDF"}
                </button>
                {saved && (
                  <button className="text-button full" onClick={startNew}>
                    Start a new invoice
                    <Plus size={16} />
                  </button>
                )}
                <p className="summary-footnote">
                  Check all billing and tax details before issuing. Preview
                  downloads are marked as unsaved.
                </p>
              </aside>
            </div>
          )}
          <footer>
            Digital Invoice Generator for Small Businesses
            <span>MCA Semester III · Atul Kumar Kaushik</span>
          </footer>
        </main>
      </div>
      {preview && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-heading"
            className="preview-modal"
            onKeyDown={(e) => {
              if (e.key === "Escape") setPreview(null);
            }}
          >
            <div className="modal-toolbar">
              <h3 id="preview-heading">Invoice preview</h3>
              <div>
                <button
                  className="button primary"
                  onClick={() => downloadInvoice(preview)}
                >
                  <Download size={16} />
                  Download PDF
                </button>
                <button
                  className="icon-button"
                  aria-label="Close preview"
                  autoFocus
                  onClick={() => setPreview(null)}
                >
                  <X size={23} />
                </button>
              </div>
            </div>
            <InvoicePreview invoice={preview} />
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
