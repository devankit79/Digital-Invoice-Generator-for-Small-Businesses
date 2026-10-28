# Approved scope

Project: Digital Invoice Generator for Small Businesses
Learner: Atul Kumar Kaushik | University roll number: 32524000181
Programme: MCA | Semester: III | Session: 2025-2026 | Batch: 3
Supervisor: Ms. Shreyi Mittal | CDOE, GLA University

The proposal supplied in chat is the source of scope. The shared ChatGPT conversation could not be read completely; it is not treated as a verified requirements source.

## Included
- Home/dashboard, create invoice, calculations, preview, PDF download, MongoDB invoice history.
- React frontend, Node.js/Express backend, MongoDB database.
- Indian currency and date formatting, optional GSTIN, GST/non-GST invoices.
- Supplier state and place of supply determine same-state CGST+SGST or interstate IGST.
- User-selected line tax rates: 0, 5, 12, 18, 28 percent. This is a bounded educational configuration, not a comprehensive tax-rate classification engine.
- Input validation, automatic invoice numbering, saved record snapshots, history search.

## Future scope
Registration/login, email delivery, advanced templates, sales analytics, managed cloud storage/hosting. MongoDB is used locally in the implemented core scope; an external MongoDB service is optional configuration.

## Report requirements
At least 60 pages; Times New Roman 12pt body, chapter titles 16pt bold, headings 14pt bold, 1.5 spacing and 1-inch margins. Cover, certificate, declaration, acknowledgement, structured 300-350 word abstract, automatic TOC, figures/tables lists, abbreviations, six prescribed chapters, references and appendices. Front matter Roman numbering; chapters Arabic numbering. Footer CDOE, GLA University. Certificate signatures and declarations remain for the learner/supervisor to complete and verify.

## Reference review
Repository: https://github.com/johnuberbacher/invoice-generator
README and package manifest consulted. It is a React 17 / Create React App application using Bootstrap, html2canvas and jsPDF. Its README describes itemized invoicing and PDF export and lists database storage as a to-do. No claim of a complete source-code audit is made. This project is written independently and adds an Express API, MongoDB persistence, shared calculation/validation logic and an Indian invoice workflow. No source code from the repository has been copied.
