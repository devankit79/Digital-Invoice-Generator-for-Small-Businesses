import { z } from "zod";

export const states = [
  ["01", "Jammu and Kashmir"],
  ["02", "Himachal Pradesh"],
  ["03", "Punjab"],
  ["04", "Chandigarh"],
  ["05", "Uttarakhand"],
  ["06", "Haryana"],
  ["07", "Delhi"],
  ["08", "Rajasthan"],
  ["09", "Uttar Pradesh"],
  ["10", "Bihar"],
  ["11", "Sikkim"],
  ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"],
  ["14", "Manipur"],
  ["15", "Mizoram"],
  ["16", "Tripura"],
  ["17", "Meghalaya"],
  ["18", "Assam"],
  ["19", "West Bengal"],
  ["20", "Jharkhand"],
  ["21", "Odisha"],
  ["22", "Chhattisgarh"],
  ["23", "Madhya Pradesh"],
  ["24", "Gujarat"],
  ["26", "Dadra and Nagar Haveli and Daman and Diu"],
  ["27", "Maharashtra"],
  ["29", "Karnataka"],
  ["30", "Goa"],
  ["31", "Lakshadweep"],
  ["32", "Kerala"],
  ["33", "Tamil Nadu"],
  ["34", "Puducherry"],
  ["35", "Andaman and Nicobar Islands"],
  ["36", "Telangana"],
  ["37", "Andhra Pradesh"],
  ["38", "Ladakh"],
];
const state = z
  .string()
  .refine(
    (value) => states.some(([code]) => code === value),
    "Select a state / UT",
  );
const gstin = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (value) =>
      !value || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value),
    "Enter a valid 15-character GSTIN",
  );
const party = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  address: z.string().trim().min(1, "Address is required").max(500),
  state,
  gstin,
  email: z.union([z.literal(""), z.email()]),
  phone: z.string().max(20),
});
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Invalid date",
  );
export const invoiceSchema = z
  .object({
    business: party,
    customer: party,
    date,
    dueDate: date,
    placeOfSupply: state,
    gstEnabled: z.boolean(),
    items: z
      .array(
        z.object({
          description: z
            .string()
            .trim()
            .min(1, "Item description is required")
            .max(250),
          hsn: z
            .string()
            .trim()
            .max(8)
            .regex(/^\d*$/, "HSN / SAC must contain digits"),
          quantity: z
            .number()
            .positive()
            .max(100000)
            .refine(
              (n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 0.00001,
              "Use up to 3 decimal places",
            ),
          price: z
            .number()
            .min(0)
            .max(1000000)
            .refine(
              (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
              "Use up to 2 decimal places",
            ),
          gstRate: z
            .number()
            .refine(
              (n) => [0, 5, 12, 18, 28].includes(n),
              "Select a supported GST rate",
            ),
        }),
      )
      .min(1)
      .max(100),
    notes: z.string().trim().max(1500),
  })
  .superRefine((data, ctx) => {
    if (data.dueDate < data.date)
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date cannot be before invoice date",
      });
    for (const key of ["business", "customer"]) {
      if (data[key].gstin && data[key].gstin.slice(0, 2) !== data[key].state)
        ctx.addIssue({
          code: "custom",
          path: [key, "gstin"],
          message: "GSTIN state code must match the selected state",
        });
    }
    if (data.gstEnabled && !data.business.gstin)
      ctx.addIssue({
        code: "custom",
        path: ["business", "gstin"],
        message: "Business GSTIN is required for a GST invoice",
      });
  });

// All monetary calculations use integer paise. Round once per invoice line.
export function calculateInvoice(data) {
  const interstate = data.business.state !== data.placeOfSupply;
  const items = data.items.map((item) => {
    const amount = Math.round(
      Math.round(Number(item.price) * 100) * Number(item.quantity),
    );
    const rate = data.gstEnabled ? Number(item.gstRate) : 0;
    const cgst = !interstate ? Math.round((amount * rate) / 200) : 0;
    const sgst = cgst;
    const igst = interstate ? Math.round((amount * rate) / 100) : 0;
    return {
      ...item,
      amount,
      cgst,
      sgst,
      igst,
      total: amount + cgst + sgst + igst,
    };
  });
  const sum = (key) => items.reduce((total, item) => total + item[key], 0);
  return {
    items,
    interstate,
    subtotal: sum("amount"),
    cgst: sum("cgst"),
    sgst: sum("sgst"),
    igst: sum("igst"),
    total: sum("total"),
  };
}
export const money = (paise) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    paise / 100,
  );
export const formatDate = (value) =>
  value ? value.split("T")[0].split("-").reverse().join("/") : "";
