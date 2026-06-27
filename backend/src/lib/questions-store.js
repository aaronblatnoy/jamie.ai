// questions-store.js — INV4 (mode->path), INV5 (ESM), INV2 (stateless)
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// INV4: NEVER hardcode mode string as a dir name — always go through this map.
const MODE_DIR = {
  ib: "400-mi",
  rx: "rx",
};

// Resolve QUESTIONS_ROOT relative to THIS file's location.
// This file: backend/src/lib/questions-store.js
//   ../     -> backend/src/
//   ../../  -> backend/
//   ../../../ -> repo root (jamie.ai/)
//   ../../../questions -> jamie.ai/questions
const __filename = fileURLToPath(import.meta.url);
const __dir = new URL(".", import.meta.url);
const QUESTIONS_ROOT = fileURLToPath(new URL("../../questions", __dir));

// Log resolved root once at import time (visible in server boot output).
console.log("[questions-store] QUESTIONS_ROOT resolved to:", QUESTIONS_ROOT);

// Module-level cache: keyed "${mode}/${slug}" -> Question[]
const _cache = new Map();
// Category slug list cache: keyed mode -> string[]
const _slugCache = new Map();

/**
 * Returns the known category slugs for the given mode.
 *
 * IB: reads the manifest sections[].slug (authoritative — 13 slugs).
 *     Falls back to enumerating non-empty immediate subdirectories if
 *     the manifest is missing/unreadable.
 * RX: reads taxonomy.json categories[].slug (authoritative — 18 slugs
 *     in basic/advanced layout). Falls back to empty array if missing.
 *
 * @param {"ib"|"rx"} mode
 * @returns {Promise<string[]>}
 */
export async function listCategories(mode) {
  if (_slugCache.has(mode)) return _slugCache.get(mode);

  const dir = MODE_DIR[mode];
  if (!dir) throw Object.assign(new Error(`Unknown mode: ${mode}`), { status: 400 });

  let slugs;
  if (mode === "ib") {
    try {
      const manifestPath = join(QUESTIONS_ROOT, dir, "manifest.json");
      const raw = await readFile(manifestPath, "utf8");
      const manifest = JSON.parse(raw);
      slugs = manifest.sections.map((s) => s.slug);
    } catch {
      slugs = await _enumSubdirs(join(QUESTIONS_ROOT, dir));
    }
  } else {
    // RX: read taxonomy.json categories[].slug (basic/advanced layout)
    try {
      const taxonomyPath = join(QUESTIONS_ROOT, dir, "taxonomy.json");
      const raw = await readFile(taxonomyPath, "utf8");
      const taxonomy = JSON.parse(raw);
      slugs = taxonomy.categories.map((c) => c.slug);
    } catch {
      slugs = [];
    }
  }

  _slugCache.set(mode, slugs);
  return slugs;
}

/**
 * Returns names of immediate subdirectories under `dirPath`.
 * Non-throwing: returns [] if the dir doesn't exist or can't be read.
 *
 * @param {string} dirPath
 * @returns {Promise<string[]>}
 */
async function _enumSubdirs(dirPath) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Loads all questions for a given mode + slug.
 *
 * Reads questions/<dir>/<slug>/questions.json.
 * On ENOENT, empty file, or parse error: returns [] (NEVER throws).
 * Results are cached in module Map keyed `${mode}/${slug}`.
 *
 * @param {"ib"|"rx"} mode
 * @param {string} slug  e.g. "basic/accounting" or "accounting-and-financial-statements"
 * @returns {Promise<object[]>}
 */
export async function loadCategory(mode, slug) {
  const cacheKey = `${mode}/${slug}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const dir = MODE_DIR[mode];
  if (!dir) return [];

  const filePath = join(QUESTIONS_ROOT, dir, slug, "questions.json");
  let questions = [];

  try {
    const raw = await readFile(filePath, "utf8");
    if (!raw || !raw.trim()) {
      questions = [];
    } else {
      const parsed = JSON.parse(raw);
      questions = Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ENOENT, parse error, or any other error -> return empty (per A3)
    questions = [];
  }

  _cache.set(cacheKey, questions);
  return questions;
}

// Export the map for callers that need to validate mode without loading data.
export { MODE_DIR, QUESTIONS_ROOT };
