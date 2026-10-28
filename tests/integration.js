// Run against the local demo server: node tests/integration.js
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4000/api';
const business={name:'Demo Kaushik Stationery',address:'Demo, Mathura 281001',state:'09',gstin:'09ABCDE1234F1Z5',email:'',phone:''};
const data={business,customer:{...business,name:'Demo Sharma Book Centre',gstin:''},date:'2026-10-28',dueDate:'2026-11-01',placeOfSupply:'09',gstEnabled:true,items:[{description:'Demo notebooks',hsn:'4820',quantity:10,price:50,gstRate:18}],notes:'Demonstration record only.'};
async function post(body){return fetch(`${base}/invoices`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
const saved=await post({...data,totals:{total:1}});assert.equal(saved.status,201);const invoice=await saved.json();assert.equal(invoice.totals.total,59000);assert.equal(invoice.totals.cgst,4500);assert.match(invoice.number,/^INV\/26-27\/\d+$/);
const record=await fetch(`${base}/invoices/${invoice._id}`).then(r=>r.json());assert.equal(record.number,invoice.number);
const history=await fetch(`${base}/invoices`).then(r=>r.json());assert.ok(history.some(item=>item._id===invoice._id));
assert.equal((await post({...data,items:[]})).status,400);
assert.equal((await fetch(`${base}/invoices/invalid`)).status,400);
assert.equal((await fetch(`${base}/invoices/000000000000000000000000`)).status,404);
const interstate=await post({...data,placeOfSupply:'07'}).then(r=>r.json());assert.equal(interstate.totals.igst,9000);assert.equal(interstate.totals.cgst,0);
const standard=await post({...data,gstEnabled:false}).then(r=>r.json());assert.equal(standard.totals.total,50000);
const parallel=await Promise.all(Array.from({length:4},()=>post(data).then(r=>r.json())));assert.equal(new Set(parallel.map(item=>item.number)).size,4);
console.log('PASS: MongoDB save/read/history, authoritative totals, validation, GST variants and concurrent unique numbering.');
