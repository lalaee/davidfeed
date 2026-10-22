// Emit the feed's data as JSON by importing the app's own TypeScript source,
// so the iOS port stays in step with whatever the web app actually ships.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";

const SRC = "/Users/olalekanisaac/Downloads/Code/davidfeed/src/";
register(pathToFileURL("/tmp/dfexport/alias.mjs"));

const { shortPosts } = await import(SRC + "data/shorts.ts");
const { topics } = await import(SRC + "data/topics.ts").catch(() => ({ topics: null }));

writeFileSync("/tmp/dfexport/shorts.json", JSON.stringify(shortPosts, null, 1));
if (topics) writeFileSync("/tmp/dfexport/topics.json", JSON.stringify(topics, null, 1));
console.log("shortPosts:", shortPosts.length);
console.log("sample:", JSON.stringify(shortPosts[0], null, 1).slice(0, 600));
