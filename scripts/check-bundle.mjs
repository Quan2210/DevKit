// CLI: guard the staged bundle. Fails the process on any problem.
import { checkBundle } from "./lib/bundle-check.mjs";

const root = process.argv[2] ?? "stage";
const errors = checkBundle(root);

if (errors.length > 0) {
  console.error(
    `check:bundle failed (${errors.length}):\n${errors.map((e) => `  - ${e}`).join("\n")}`,
  );
  process.exit(1);
}
console.log("check:bundle ok");
