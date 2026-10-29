const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "coverage", "lcov.info");
const raw = fs.readFileSync(file, "utf8");
const relative = raw.replace(/^SF:(.*)$/gm, (_line, source) => {
  const abs = path.isAbsolute(source) ? source : path.resolve(root, source);
  return "SF:" + path.relative(root, abs).split(path.sep).join("/");
});
const records = relative
  .split("end_of_record\n")
  .map((record) => {
    const match = record.match(/^SF:(.+)$/m);
    if (!match) return null;
    return { path: match[1], body: record.trimEnd() + "\nend_of_record\n" };
  })
  .filter(Boolean);

function write(name, prefix) {
  const body = records.filter((record) => record.path.startsWith(prefix)).map((record) => record.body).join("");
  fs.writeFileSync(path.join(root, "coverage", name), body);
}

write("lcov.info", "");
write("backend.lcov.info", "src/");
write("frontend.lcov.info", "public/");
