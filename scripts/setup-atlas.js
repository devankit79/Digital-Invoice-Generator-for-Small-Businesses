import mongoose from "mongoose";
import readline from "node:readline";
import { Writable } from "node:stream";
import { readFile, writeFile, chmod, utimes } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
const serverPath = fileURLToPath(
  new URL("../server/index.js", import.meta.url),
);
const host = "vyaparinvoice.si7jxnb.mongodb.net";

if (!process.stdin.isTTY) {
  console.error("Run npm run setup:atlas in an interactive terminal.");
  process.exit(1);
}

// The password stays off the screen, command arguments and shell history.
let hideInput = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!hideInput) process.stdout.write(chunk);
    callback();
  },
});
const prompt = readline.createInterface({
  input: process.stdin,
  output,
  terminal: true,
});
process.stdout.write("MongoDB Atlas password for vyapar_app (hidden): ");
hideInput = true;
const password = await new Promise((resolve) => prompt.question("", resolve));
prompt.close();
process.stdout.write("\n");
if (!password) {
  console.error("No password entered. Application settings were not changed.");
  process.exit(1);
}
const uri = `mongodb+srv://vyapar_app:${encodeURIComponent(password)}@${host}/digital_invoice_generator?retryWrites=true&w=majority&appName=VyaparInvoice`;
try {
  process.stdout.write("Verifying Atlas connection...\n");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  await mongoose.connection.db.command({ ping: 1 });
  // Verify the scoped user can access the actual application collections.
  await mongoose.connection.db
    .collection("invoices")
    .findOne({}, { projection: { _id: 1 } });
  await mongoose.disconnect();
  let current = "";
  try {
    current = await readFile(envPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const preserved = current
    .split(/\r?\n/)
    .filter(
      (line) => !/^(LOCAL_MONGODB|USE_MEMORY_DB|MONGODB_URI)\s*=/.test(line),
    );
  await writeFile(
    envPath,
    `${preserved.join("\n").trimEnd()}\nLOCAL_MONGODB=false\nUSE_MEMORY_DB=false\nMONGODB_URI=${uri}\n`,
    { mode: 0o600 },
  );
  await chmod(envPath, 0o600);
  const now = new Date();
  await utimes(serverPath, now, now);
  console.log(
    "Atlas connected. Private .env updated; the development server will restart automatically.",
  );
  console.log(
    "Local invoice records remain in .data/mongodb; they have not been uploaded.",
  );
} catch (error) {
  await mongoose.disconnect().catch(() => {});
  // Driver errors can contain connection details, so do not print raw errors.
  console.error(
    "Atlas setup failed. Check the password, current IP allowlist and internet connection. Settings were not switched unless connection verification succeeded.",
  );
  process.exitCode = 1;
}
