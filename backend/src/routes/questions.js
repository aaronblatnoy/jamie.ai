// questions.js — GET /api/question
// INV2: No per-session state; client passes exclude on every call.
// INV3: model_answer is NEVER included in the response.
// INV4: mode->path mapping is entirely in questions-store.js.
import { Router } from "express";
import { listCategories, loadCategory, MODE_DIR } from "../lib/questions-store.js";

const router = Router();

/**
 * GET /api/question
 *
 * Query params:
 *   mode        required  "ib" | "rx"
 *   categories  optional  comma-separated slug list; unknown slugs ignored
 *   difficulty  optional  "1" | "2" | "3"
 *   exclude     optional  comma-separated question id list
 *
 * Response 200:
 *   { id, question, key_points, category, difficulty }  — model_answer stripped (INV3)
 *   OR { done: true }  when the filtered + de-excluded pool is empty.
 * Response 400: { error }  when mode is missing or not in {ib, rx}.
 */
router.get("/", async (req, res, next) => {
  try {
    const { mode, categories: categoriesParam, difficulty: difficultyParam, exclude: excludeParam } = req.query;

    // Validate mode (INV4: only known modes allowed)
    if (!mode || !MODE_DIR[mode]) {
      return res.status(400).json({ error: `mode is required and must be one of: ${Object.keys(MODE_DIR).join(", ")}` });
    }

    // Parse difficulty filter
    const difficulty = difficultyParam != null ? parseInt(difficultyParam, 10) : null;
    if (difficultyParam != null && (![1, 2, 3].includes(difficulty))) {
      return res.status(400).json({ error: "difficulty must be 1, 2, or 3" });
    }

    // Parse exclude list
    const excludeSet = new Set(
      excludeParam ? excludeParam.split(",").map((s) => s.trim()).filter(Boolean) : []
    );

    // Determine chosen category slugs
    const allSlugs = await listCategories(mode);

    let chosenSlugs;
    if (categoriesParam && categoriesParam.trim()) {
      const requested = categoriesParam.split(",").map((s) => s.trim()).filter(Boolean);
      const allSlugsSet = new Set(allSlugs);
      // Intersection — ignore unknown slugs silently
      chosenSlugs = requested.filter((s) => allSlugsSet.has(s));
      // If all requested slugs are unknown, treat as empty pool -> {done:true}
      // (don't fall back to "all categories" when caller explicitly requested slugs)
    } else {
      chosenSlugs = allSlugs;
    }

    // Load and concatenate questions from all chosen categories
    const allQuestions = (
      await Promise.all(chosenSlugs.map((slug) => loadCategory(mode, slug)))
    ).flat();

    // Apply difficulty filter
    const afterDifficulty =
      difficulty != null
        ? allQuestions.filter((q) => q.difficulty === difficulty)
        : allQuestions;

    // Drop excluded ids (INV2: client passes these every call)
    const pool = afterDifficulty.filter((q) => !excludeSet.has(q.id));

    // Empty pool -> signal client that this set is exhausted
    if (pool.length === 0) {
      return res.json({ done: true });
    }

    // Pick a random question
    const picked = pool[Math.floor(Math.random() * pool.length)];

    // INV3: strip model_answer — return ONLY these 5 fields
    const { id, question, key_points, category, difficulty: diff } = picked;
    return res.json({ id, question, key_points, category, difficulty: diff });
  } catch (err) {
    next(err);
  }
});

export default router;
