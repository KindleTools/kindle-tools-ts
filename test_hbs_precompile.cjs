const Handlebars = require("handlebars");

try {
  const template = "{{#if valid}}unclosed";
  console.log(`Pre-Compiling: "${template}"`);
  Handlebars.precompile(template);
  console.log("Pre-Compile successful (unexpected)");
} catch (e) {
  console.log("Pre-Compile failed (expected):", e.message);
}
