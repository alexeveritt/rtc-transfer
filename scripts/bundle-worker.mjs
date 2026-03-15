import { build } from "esbuild";

await build({
	entryPoints: ["apps/web/build/server/index.js"],
	bundle: true,
	format: "esm",
	outfile: "apps/web/build/client/_worker.js",
	conditions: ["workerd"],
	external: ["cloudflare:*", "node:*"],
	logLevel: "info",
});
