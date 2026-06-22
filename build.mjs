import * as esbuild from "esbuild";

// Bundle the popup. It imports the SAME engine the CLI and tests use
// (src/detect.ts), so the extension and the library can never drift.
const opts = {
  entryPoints: ["extension/src/popup.ts"],
  bundle: true,
  format: "iife",
  target: "chrome114",
  outfile: "extension/popup.js",
  legalComments: "none",
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log("watching extension/src ...");
} else {
  await esbuild.build(opts);
}
