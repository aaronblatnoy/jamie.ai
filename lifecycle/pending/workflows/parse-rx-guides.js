export const meta = {
  name: 'rx-guide-parser',
  description: 'Parse RX guide PDFs: scout structure → define taxonomy → extract all Q&A → write to questions/rx/',
  phases: [
    { title: 'Scout', detail: 'Read each PDF in parallel to understand structure, format, and topics' },
    { title: 'Schema', detail: 'Synthesize a canonical category taxonomy from all scout reports' },
    { title: 'Extract', detail: 'Extract every Q&A pair from every PDF in parallel, write temp files' },
    { title: 'Write', detail: 'Consolidate temp files, assign IDs, write final questions/rx/ structure' },
  ],
}

// ─── Config ───────────────────────────────────────────────────────────────────
// Pass args when running:
//   Workflow({ scriptPath: '...', args: { guidesDir: '/path/to/rx/pdfs' } })
// Defaults assume PDFs dropped in ~/jamie.ai/guides/

const BASE = '/Users/aaron_7nh0yzm/jamie.ai'
const guidesDir = (args && args.guidesDir) ? args.guidesDir : BASE + '/guides'
const outputDir = (args && args.outputDir) ? args.outputDir : BASE + '/questions/rx'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    filename:            { type: 'string' },
    total_pages:         { type: 'integer' },
    qa_format:           { type: 'string', description: 'How Q&A is laid out: "Q:/A:", bold headers, numbered, etc.' },
    topics:              { type: 'array', items: { type: 'string' } },
    proposed_categories: { type: 'array', items: { type: 'string' }, description: 'kebab-case slugs you propose' },
    estimated_questions: { type: 'integer' },
    sample_questions:    { type: 'array', items: { type: 'string' } },
    parse_notes:         { type: 'string', description: 'Headers/footers to skip, multi-part Q patterns, etc.' }
  },
  required: ['filename', 'total_pages', 'qa_format', 'topics', 'proposed_categories', 'estimated_questions', 'sample_questions']
}

const TAXONOMY_SCHEMA = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug:        { type: 'string', description: 'kebab-case, used as directory name' },
          name:        { type: 'string' },
          description: { type: 'string' }
        },
        required: ['slug', 'name', 'description']
      }
    },
    extraction_hints: {
      type: 'string',
      description: 'A paragraph of guidance for extraction agents: how to parse Q&A in these specific PDFs'
    }
  },
  required: ['categories', 'extraction_hints']
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — SCOUT
// ═══════════════════════════════════════════════════════════════════════════════
phase('Scout')

// Discover PDFs
const discoverResult = await agent(
  `Find all PDF files inside this directory (recursively):
${guidesDir}

Run: find "${guidesDir}" -iname "*.pdf" | sort

Return ONLY the absolute file paths, one per line. No headers, no extra text.`,
  { label: 'discover-pdfs' }
)

const pdfPaths = discoverResult
  .trim()
  .split('\n')
  .map(p => p.trim())
  .filter(p => p.length > 0 && p.toLowerCase().endsWith('.pdf'))

if (pdfPaths.length === 0) {
  log('ERROR: No PDFs found in ' + guidesDir)
  log('Drop the 9 RX guide PDFs there and re-run.')
  return { error: 'no_pdfs_found', guidesDir }
}

log(`Found ${pdfPaths.length} PDF(s): ${pdfPaths.map(p => p.split('/').pop()).join(', ')}`)
log('Scouting all PDFs in parallel...')

// Scout all PDFs in parallel — keep nulls so indices align with pdfPaths
const scoutReports = await parallel(pdfPaths.map((pdfPath) => () =>
  agent(
    `Scout this RX interview guide PDF to understand its structure.

File: ${pdfPath}

Steps:
1. Read pages 1-10 using the Read tool: pages "1-10"
2. Note the total page count from the tool output
3. If the PDF has more than 20 pages, also sample the middle (e.g. pages "30-40")
4. From what you read, determine:
   - total_pages: the full page count
   - qa_format: exactly how Q&A pairs appear — look for "Q:" / "A:", bold questions, numbered lists, "Question N:" headers, etc.
   - topics: RX/restructuring topics covered (e.g. chapter 11, distressed M&A, 363 sales, recovery analysis)
   - proposed_categories: 3-8 kebab-case slugs that could organize this PDF's questions
   - estimated_questions: rough count for the whole PDF
   - sample_questions: 3-5 actual questions you found verbatim
   - parse_notes: things to watch out for — page headers/footers to ignore, multi-part questions, footnote references, special formatting

Return structured scout data.`,
    {
      label: `scout:${pdfPath.split('/').pop().replace(/\.pdf$/i, '')}`,
      phase: 'Scout',
      schema: SCOUT_SCHEMA
    }
  )
))

const validScouts = scoutReports.filter(Boolean)
log(`Scout complete: ${validScouts.length}/${pdfPaths.length} PDFs analyzed`)

if (validScouts.length === 0) {
  log('All scouts failed — cannot proceed.')
  return { error: 'all_scouts_failed' }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — SCHEMA (taxonomy synthesis)
// ═══════════════════════════════════════════════════════════════════════════════
phase('Schema')

const scoutSummary = pdfPaths.map((pdfPath, i) => {
  const s = scoutReports[i]
  if (!s) return `[PDF ${i+1}] ${pdfPath.split('/').pop()} — scout failed`
  return `[PDF ${i+1}] ${s.filename} (${s.total_pages} pages, ~${s.estimated_questions} questions)
  Format: ${s.qa_format}
  Topics: ${(s.topics || []).join(', ')}
  Proposed categories: ${(s.proposed_categories || []).join(', ')}
  Sample Qs: ${(s.sample_questions || []).slice(0, 2).join(' | ')}
  Notes: ${s.parse_notes || 'none'}`
}).join('\n\n')

const taxonomy = await agent(
  `Define the canonical category taxonomy for an RX (Restructuring) IB interview question bank.

You have scouted ${pdfPaths.length} PDFs:

${scoutSummary}

Task: Create 6-12 canonical categories for this question bank.

Rules:
- slug must be kebab-case — it becomes a directory name (e.g. "chapter-11", "distressed-ma")
- Categories must be mutually exclusive and collectively exhaustive of RX interview content
- Anchor on what's actually in these PDFs, but fill gaps with standard RX interview coverage
- Typical RX interview categories include (adapt as needed):
    overview-fundamentals, accounting-financials, valuation-distressed, capital-structure,
    debt-instruments, distressed-ma, chapter-11, creditor-recovery, lbo-analysis,
    restructuring-advisory, behavioral-fit
- extraction_hints: 2-4 sentences for the extraction agents — how to parse Q&A in these specific
  PDFs (formatting conventions, what to skip, how to handle multi-part questions, etc.)

Return the taxonomy.`,
  {
    label: 'synthesize-taxonomy',
    schema: TAXONOMY_SCHEMA
  }
)

log(`Taxonomy (${taxonomy.categories.length} categories): ${taxonomy.categories.map(c => c.slug).join(', ')}`)

// Create all output directories now so extract agents can rely on them
const mkdirCommands = taxonomy.categories.map(c => `mkdir -p "${outputDir}/${c.slug}"`).join('\n')
await agent(
  `Create the RX question bank directory structure.

Run:
mkdir -p "${outputDir}"
${mkdirCommands}

Confirm with: ls "${outputDir}"`,
  { label: 'create-dirs', phase: 'Schema' }
)

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — EXTRACT (one agent per PDF, all parallel)
// ═══════════════════════════════════════════════════════════════════════════════
phase('Extract')

const categoryList = taxonomy.categories
  .map(c => `  - ${c.slug}: ${c.name} — ${c.description}`)
  .join('\n')

await parallel(pdfPaths.map((pdfPath, i) => () => {
  const scout   = scoutReports[i] || {}
  const tempFile = `/tmp/jamie-rx-extract-${i}.json`
  const totalPgs = scout.total_pages || 200
  const chunkSize = 40

  // Build page range instructions for the agent
  const chunks = []
  for (let start = 1; start <= totalPgs; start += chunkSize) {
    chunks.push(`"${start}-${Math.min(start + chunkSize - 1, totalPgs)}"`)
  }
  const chunkInstructions = chunks.map((range, idx) =>
    `   Step ${idx + 1}: Read pages ${range}`
  ).join('\n')

  return agent(
    `Extract EVERY Q&A pair from this RX interview guide PDF.

PDF: ${pdfPath}
Estimated pages: ${totalPgs}
Q&A format: ${scout.qa_format || 'detect from first pages'}
Parse notes: ${scout.parse_notes || 'none'}
Output temp file: ${tempFile}

CATEGORY TAXONOMY — assign each question to exactly one slug:
${categoryList}

EXTRACTION HINTS: ${taxonomy.extraction_hints}

EXTRACTION STEPS:
1. Read the full PDF in chunks using the Read tool:
${chunkInstructions}

   Keep a running list of every Q&A pair found across all chunks.

2. For EVERY question found, record:
   - question:     exact question text (clean up PDF line-break artifacts)
   - model_answer: a clear synthesis of the answer (capture all key content; don't truncate)
   - key_points:   3-8 bullet strings — the specific facts/steps a strong answer MUST include
   - category:     single most appropriate slug from the taxonomy above
   - difficulty:   1 (basic definition), 2 (process/mechanics), 3 (technical/edge case)

3. Write ALL extracted questions as a JSON array to ${tempFile}:
   [
     {
       "question": "Walk me through a 363 sale.",
       "model_answer": "A 363 sale is ...",
       "key_points": ["Court-supervised process under Section 363 of the Bankruptcy Code", "..."],
       "category": "distressed-ma",
       "difficulty": 2
     }
   ]
   Use the Bash tool: cat > "${tempFile}" << 'EOF'
   [ ... your JSON ... ]
   EOF

4. Validate the JSON is parseable: python3 -c "import json; d=json.load(open('${tempFile}')); print(len(d), 'questions')"

5. Print: "Extracted N questions from ${pdfPath.split('/').pop()}"

Be EXHAUSTIVE — extract every question, including basic ones. Quality of key_points is critical.`,
    {
      label: `extract:${pdfPath.split('/').pop().replace(/\.pdf$/i, '')}`,
      phase: 'Extract'
    }
  )
}))

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — WRITE (one consolidation agent)
// ═══════════════════════════════════════════════════════════════════════════════
phase('Write')

const tempFiles = pdfPaths.map((p, i) => ({
  path: `/tmp/jamie-rx-extract-${i}.json`,
  source: p.split('/').pop()
}))

await agent(
  `Consolidate all extracted RX questions and write the final question bank to disk.

TEMP FILES (one per source PDF — some may be missing if a PDF failed, skip those gracefully):
${tempFiles.map(f => `${f.path}  ← from ${f.source}`).join('\n')}

OUTPUT DIRECTORY: ${outputDir}

TAXONOMY:
${JSON.stringify(taxonomy.categories, null, 2)}

STEPS:

1. Read all temp files that exist:
   for each file, run: cat <file> | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))"
   to verify it's valid JSON before using it.

2. Combine all valid question arrays into one flat list.

3. Group by category slug.

4. Within each category:
   - Sort by difficulty (1 first, then 2, then 3)
   - Assign sequential IDs: "rx-{slug}-001", "rx-{slug}-002", etc.
   - Write to: ${outputDir}/{slug}/questions.json
     Format: a JSON array where each object has: id, question, model_answer, key_points, category, difficulty

5. Write taxonomy manifest to ${outputDir}/taxonomy.json:
   {
     "mode": "rx",
     "categories": <taxonomy.categories array>,
     "total_questions": <total count>,
     "questions_per_category": { "slug": count, ... },
     "source_pdfs": [<filenames>]
   }

6. Clean up temp files:
   rm /tmp/jamie-rx-extract-*.json

7. Print a final report:
   - Total questions written
   - Questions per category (sorted descending)
   - Any categories with 0 questions (may need attention)
   - Any temp files that were missing or invalid

Make sure all output files are valid, pretty-printed JSON.`,
  { label: 'consolidate-write', phase: 'Write' }
)

log('RX question bank written to: ' + outputDir)

return {
  status: 'complete',
  outputDir,
  categories: taxonomy.categories.map(c => c.slug),
  source_pdfs: pdfPaths.map(p => p.split('/').pop()),
  taxonomy_categories: taxonomy.categories.length
}
