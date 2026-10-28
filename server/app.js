import express from "express";
import mongoose from "mongoose";
import { invoiceSchema, calculateInvoice } from "../shared/invoice.js";

const Invoice =
  mongoose.models.Invoice ||
  mongoose.model(
    "Invoice",
    new mongoose.Schema(
      {
        number: { type: String, required: true, unique: true },
        data: { type: mongoose.Schema.Types.Mixed, required: true },
        totals: { type: mongoose.Schema.Types.Mixed, required: true },
      },
      { timestamps: true },
    ),
  );
const Counter =
  mongoose.models.Counter ||
  mongoose.model(
    "Counter",
    new mongoose.Schema({ _id: String, value: { type: Number, default: 0 } }),
  );
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "200kb" }));
  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      database:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    }),
  );
  app.use("/api/invoices", (_req, res, next) =>
    mongoose.connection.readyState === 1
      ? next()
      : res
          .status(503)
          .json({
            error:
              "MongoDB is unavailable. Connect the database to save or view invoices.",
          }),
  );
  app.post("/api/invoices", async (req, res, next) => {
    try {
      const parsed = invoiceSchema.safeParse(req.body);
      if (!parsed.success)
        return res
          .status(400)
          .json({
            error: parsed.error.issues[0].message,
            issues: parsed.error.issues,
          });
      const data = parsed.data;
      const year = Number(data.date.slice(0, 4));
      const start = Number(data.date.slice(5, 7)) >= 4 ? year : year - 1;
      const financialYear = `${start}-${String(start + 1).slice(-2)}`;
      const counter = await Counter.findOneAndUpdate(
        { _id: financialYear },
        { $inc: { value: 1 } },
        { upsert: true, returnDocument: "after" },
      );
      const number = `INV/${String(start).slice(-2)}-${String(start + 1).slice(-2)}/${String(counter.value).padStart(5, "0")}`;
      const invoice = await Invoice.create({
        number,
        data,
        totals: calculateInvoice(data),
      });
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/invoices", async (_req, res, next) => {
    try {
      res.json(await Invoice.find().sort({ createdAt: -1 }).limit(1000));
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/invoices/:id", async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(400).json({ error: "Invalid invoice ID" });
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found" }),
  );
  app.use((error, _req, res, _next) => {
    console.error(error.message);
    res
      .status(error.status || 500)
      .json({
        error:
          error.status === 400
            ? "Invalid JSON request"
            : "Unable to process request. Please try again.",
      });
  });
  return app;
}
