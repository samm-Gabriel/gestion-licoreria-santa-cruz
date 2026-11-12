import { config } from "dotenv";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

config({ quiet: true });

function withTestSchema(rawUrl, schemaHintUrl) {
  const parsed = new URL(rawUrl);
  if (!parsed.searchParams.get("schema") && schemaHintUrl) {
    const hint = new URL(schemaHintUrl);
    const hintSchema = hint.searchParams.get("schema");
    if (hintSchema) parsed.searchParams.set("schema", hintSchema);
  }
  const schema = parsed.searchParams.get("schema") || "public";
  const testSchema = schema.endsWith("_test") ? schema : `${schema}_test`;
  parsed.searchParams.set("schema", testSchema);
  return parsed.toString();
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}
const directSource = process.env.DIRECT_URL ?? databaseUrl;
const testDatabaseUrl = withTestSchema(databaseUrl, directSource);
const testDirectUrl = withTestSchema(directSource, directSource);
const schema = new URL(testDatabaseUrl).searchParams.get("schema");

console.log(`Aplicando migraciones en schema de prueba: ${schema}`);

execFileSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: testDatabaseUrl, DIRECT_URL: testDirectUrl },
});
