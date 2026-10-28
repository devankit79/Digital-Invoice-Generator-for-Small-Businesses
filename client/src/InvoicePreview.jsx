import React from "react";
import { states, money, formatDate } from "../../shared/invoice.js";
export default function InvoicePreview({ invoice }) {
  const { data, totals, number } = invoice;
  return (
    <article className="invoice-preview">
      <header>
        <div>
          <span className="eyebrow">
            {data.gstEnabled ? "TAX INVOICE" : "INVOICE"}
          </span>
          <h2>{data.business.name}</h2>
        </div>
        <div className="preview-meta">
          <strong>{number || "PREVIEW · NOT SAVED"}</strong>
          <p>
            Issued: {formatDate(data.date)}
            <br />
            Due: {formatDate(data.dueDate)}
          </p>
        </div>
      </header>
      <div className="preview-parties">
        {[
          ["From", data.business],
          ["Bill to", data.customer],
        ].map(([label, party]) => (
          <div key={label}>
            <span className="eyebrow">{label}</span>
            <h4>{party.name}</h4>
            <p>
              {party.address}
              <br />
              {states.find(([code]) => code === party.state)?.[1]}
              {party.gstin && (
                <>
                  <br />
                  GSTIN: {party.gstin}
                </>
              )}
              {party.email && (
                <>
                  <br />
                  {party.email}
                </>
              )}
              {party.phone && (
                <>
                  <br />
                  {party.phone}
                </>
              )}
            </p>
          </div>
        ))}
      </div>
      {data.gstEnabled && (
        <p className="supply-line">
          Place of supply:{" "}
          {states.find(([code]) => code === data.placeOfSupply)?.[1]} (
          {data.placeOfSupply})
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              {data.gstEnabled && <th>GST</th>}
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {totals.items.map((item, i) => (
              <tr key={i}>
                <td>
                  {item.description}
                  {item.hsn && <small>HSN / SAC: {item.hsn}</small>}
                </td>
                <td>{item.quantity}</td>
                <td>{money(item.price * 100)}</td>
                {data.gstEnabled && <td>{item.gstRate}%</td>}
                <td>{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="preview-totals">
        <div>
          <span>Subtotal</span>
          <span>{money(totals.subtotal)}</span>
        </div>
        {data.gstEnabled &&
          (totals.interstate ? (
            <div>
              <span>IGST</span>
              <span>{money(totals.igst)}</span>
            </div>
          ) : (
            <>
              <div>
                <span>CGST</span>
                <span>{money(totals.cgst)}</span>
              </div>
              <div>
                <span>SGST</span>
                <span>{money(totals.sgst)}</span>
              </div>
            </>
          ))}
        <div className="total">
          <strong>Total payable</strong>
          <strong>{money(totals.total)}</strong>
        </div>
      </div>
      {data.notes && (
        <div className="preview-notes">
          <span className="eyebrow">NOTES & PAYMENT INSTRUCTIONS</span>
          <p>{data.notes}</p>
        </div>
      )}
      <div className="preview-bottom">Thank you for your business.</div>
    </article>
  );
}
