/*
 * Render davidfeed's own icon components to standalone SVG files.
 *
 * The .svg files sitting in public/assets are an older 32x32 set; what the app
 * actually draws is the inline JSX in src/components/icons.tsx. Rendering the
 * real components (rather than transcribing path data by hand) keeps the iOS
 * icons identical to the web ones, active and inactive states included.
 */
const fs = require("fs");
const path = require("path");
const swc = require("/Users/olalekanisaac/Downloads/Code/davidfeed/node_modules/@next/swc-darwin-x64");

const SRC = "/Users/olalekanisaac/Downloads/Code/davidfeed/src/components/icons.tsx";
const OUT = "/tmp/dfexport/icons";
fs.mkdirSync(OUT, { recursive: true });

const code = fs.readFileSync(SRC, "utf8");
// The @next/swc native binding is transformSync(src, isModule, optionsBuffer),
// not the higher-level @swc/core signature.
const opts = {
  filename: "icons.tsx",
  jsc: {
    parser: { syntax: "typescript", tsx: true },
    target: "es2022",
    transform: { react: { runtime: "classic", pragma: "React.createElement" } },
  },
  module: { type: "commonjs" },
};
const out = swc.transformSync(code, false, Buffer.from(JSON.stringify(opts)));
const js = (typeof out === "string" ? JSON.parse(out) : out).code;

const tmp = path.join(OUT, "_icons.cjs");
fs.writeFileSync(tmp, 'const React = require("/Users/olalekanisaac/Downloads/Code/davidfeed/node_modules/react");\n' + js);

const React = require("/Users/olalekanisaac/Downloads/Code/davidfeed/node_modules/react");
const { renderToStaticMarkup } = require("/Users/olalekanisaac/Downloads/Code/davidfeed/node_modules/react-dom/server");
const icons = require(tmp);

// Which components take a boolean state flag, and therefore yield two files.
// The PROP NAME differs: the nav glyphs take `active`, BookmarkIcon takes
// `filled`. Passing the wrong one is silently ignored by React, so both
// variants render the same artwork — which is how the saved bookmark ended up
// drawing the outline path in both states.
const STATEFUL = {
  NavHomeIcon: "active",
  NavBibleIcon: "active",
  NavLibraryIcon: "active",
  NavYouIcon: "active",
  BookmarkIcon: "filled",
};

let written = 0;
for (const [name, Comp] of Object.entries(icons)) {
  if (typeof Comp !== "function") continue;
  const flag = STATEFUL[name];
  const variants = flag ? [true, false] : [null];
  for (const active of variants) {
    const props = active === null ? {} : { [flag]: active };
    let markup;
    try {
      markup = renderToStaticMarkup(React.createElement(Comp, props));
    } catch (e) {
      console.log("  skip", name, "-", e.message.split("\n")[0]);
      continue;
    }
    // currentColor can't resolve in an asset catalog; iOS tints template images.
    markup = markup.replace(/currentColor/g, "#000000");
    if (!markup.includes("xmlns")) {
      markup = markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const suffix = active === null ? "" : active ? "-active" : "-inactive";
    const file = path.join(OUT, name + suffix + ".svg");
    fs.writeFileSync(file, markup);
    written++;
  }
}
fs.unlinkSync(tmp);
console.log(`rendered ${written} svg files from ${Object.keys(icons).length} components`);
