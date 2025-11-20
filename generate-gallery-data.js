const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "images");
const OUTPUT = path.join(__dirname, "gallery-data.json");

const MEDIA_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".heic",
  ".heif",
  ".tif",
  ".tiff",
  ".cr2",
  ".dng",
  ".mov",
  ".mp4"
]);

const data = {};

function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function ensureGroup(key, label) {
  if (!data[key]) {
    data[key] = { label, items: [] };
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!MEDIA_EXT.has(ext)) continue;

    const relativeDir = path.relative(ROOT, path.dirname(full));
    const segments = relativeDir ? relativeDir.split(path.sep).filter(Boolean) : [];
    const label = segments.length ? segments[segments.length - 1] : "Destacados";
    const key = segments.length ? slugify(label) : "destacados";

    ensureGroup(key, label);
    const mediaType = ext === ".mov" || ext === ".mp4" ? "video" : "image";

    data[key].items.push({
      src: path.join("images", path.relative(ROOT, full)).split(path.sep).join("/"),
      type: mediaType
    });
  }
}

walk(ROOT);
fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), "utf-8");
console.log(`Generated ${OUTPUT} with ${Object.values(data).reduce((a, g) => a + g.items.length, 0)} items across ${Object.keys(data).length} groups.`);
