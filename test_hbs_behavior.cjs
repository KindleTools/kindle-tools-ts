const Handlebars = require("handlebars");

try {
  const template = "{{#if valid}}unclosed";
  console.log(`Compiling: "${template}"`);
  Handlebars.compile(template);
  console.log("Compile successful (unexpected)");
} catch (e) {
  console.log("Compile failed (expected):", e.message);
}
try {
  const template = "{{#if}}missing condition{{/if}}";
  console.log(`Compiling: "${template}"`);
  Handlebars.compile(template);
  console.log("Compile successful (unexpected for missing condition maybe?)");
} catch (e) {
  console.log("Compile failed:", e.message);
}
