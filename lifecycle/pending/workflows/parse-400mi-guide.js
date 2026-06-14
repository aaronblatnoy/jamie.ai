export const meta = {
  name: 'parse-400mi-guide',
  description: 'Parse the 400 M&I guide: scout TOC → map sections to page ranges → extract each section in parallel → write to questions/400-mi/',
  phases: [
    { title: 'Scout', detail: 'Read TOC and structure of the PDF to discover sections and their page ranges' },
    { title: 'Divide', detail: 'Map discovered sections to slugs, page ranges, and output directories' },
    { title: 'Extract', detail: 'Fan out one agent per section — each reads only its page range' },
    { title: 'Write', detail: 'Consolidate temp files, assign IDs, write questions/400-mi/ structure' },
  ],
}

// ─── Config ───────────────────────────────────────────────────────────────────
// Pass args when running:
//   Workflow({ scriptPath: '...', args: { guidesDir: '/path/to/400mi/pdfs' } })

const BASE = '/Users/aaron_7nh0yzm/jamie.ai'
const guidesDir = (args && args.guidesDir) ? args.guidesDir : BASE + '/guides/400-mi'
const outputDir = (args && args.outputDir) ? args.outputDir : BASE + '/questions/400-mi'

// ─── Schemas ─────────────────────────────────────────────────────────────────

// Phase 1 output: the guide's section map with page ranges
const SECTION_MAP_SCHEMA = {
  type: 'object',
  properties: {
    pdf_path:    { type: 'string' },
    total_pages: { type: 'integer' },
    qa_format:   { type: 'string', description: 'How Q&A pairs are formatted in this guide' },
    parse_notes: { type: 'string', description: 'What to skip (headers/footers/page numbers), how to handle sub-questions, etc.' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:                { type: 'string',  description: 'Human-readable section name, e.g. "Accounting"' },
          slug:                { type: 'string',  description: 'kebab-case slug for output directory, e.g. "accounting"' },
          start_page:          { type: 'integer', description: 'First page of this section in the PDF' },
          end_page:            { type: 'integer', description: 'Last page of this section in the PDF' },
          estimated_questions: { type: 'integer', description: 'Rough question count in this section' }
        },
        required: ['name', 'slug', 'start_page', 'end_page', 'estimated_questions']
      }
    }
  },
  required: ['pdf_path', 'total_pages', 'qa_format', 'sections']
}

// Phase 3 output: per-section extraction written to a temp file
// (not a schema — agents write JSON directly to disk)

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — SCOUT  (discover PDFs + read TOC to map sections → page ranges)
// ═══════════════════════════════════════════════════════════════════════════════
phase('Scout')

// Find PDFs
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
  log('Drop the 400 M&I guide PDF(s) there and re-run.')
  return { error: 'no_pdfs_found', guidesDir }
}

log(`Found ${pdfPaths.length} PDF(s): ${pdfPaths.map(p => p.split('/').pop()).join(', ')}`)

// Scout each PDF to build a section map.
// For a single large guide this typically returns one result;
// for a split guide (one PDF per section) it returns one result per PDF.
const sectionMaps = (await parallel(pdfPaths.map((pdfPath) => () =>
  agent(
    `You are mapping the internal section structure of the 400 M&I investment banking interview guide PDF.

File: ${pdfPath}

STEP 1 — Read the table of contents / intro pages (pages 1-15):
  Use Read tool with pages: "1-15"

STEP 2 — Note the total page count shown in the tool output.

STEP 3 — For each major section you see in the TOC (e.g. Accounting, Valuation, DCF,
M&A, LBO, Fit/Behavioral), determine its starting and ending page numbers.
If the TOC doesn't show exact page numbers, sample a few pages near the estimated
boundary to confirm where each section starts and ends.

STEP 4 — Return the full section map:
- pdf_path: the file path
- total_pages: total pages in this PDF
- qa_format: exactly how Q&A pairs appear (e.g. "Q: ... A: ...", bold question text, numbered, etc.)
- parse_notes: what to skip (running headers/footers, "BIWS" watermarks, page numbers in content),
  how to handle multi-part questions, sub-questions (a/b/c), follow-ups, etc.
- sections: array of { name, slug, start_page, end_page, estimated_questions }
  Common 400 M&I slugs: accounting, valuation, dcf, ma, lbo, fit
  Adapt if this guide has different or additional sections.

Be precise with page ranges — the extraction agents will read ONLY their assigned pages.`,
    {
      label: `scout:${pdfPath.split('/').pop().replace(/\.pdf$/i, '')}`,
      phase: 'Scout',
      schema: SECTION_MAP_SCHEMA
    }
  )
))).filter(Boolean)

if (sectionMaps.length === 0) {
  log('Scout failed — could not read any PDFs.')
  return { error: 'scout_failed' }
}

// Flatten all sections across all PDFs
const allSections = sectionMaps.flatMap(m => m.sections.map(s => ({
  ...s,
  pdf_path:    m.pdf_path,
  qa_format:   m.qa_format,
  parse_notes: m.parse_notes || ''
})))

const totalPages = sectionMaps.reduce((sum, m) => sum + m.total_pages, 0)
log(`Discovered ${allSections.length} sections across ${sectionMaps.length} PDF(s), ${totalPages} total pages`)
log(`Sections: ${allSections.map(s => `${s.slug} (pp.${s.start_page}-${s.end_page}, ~${s.estimated_questions}q)`).join(' | ')}`)

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — DIVIDE  (create output directories)
// ═══════════════════════════════════════════════════════════════════════════════
phase('Divide')

const mkdirCommands = allSections.map(s => `mkdir -p "${outputDir}/${s.slug}"`).join('\n')

await agent(
  `Create the 400 M&I question bank directory structure.

Run:
mkdir -p "${outputDir}"
${mkdirCommands}

Confirm: ls "${outputDir}"`,
  { label: 'create-dirs', phase: 'Divide' }
)

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — EXTRACT  (one agent per section, fully parallel)
// ═══════════════════════════════════════════════════════════════════════════════
phase('Extract')

// Chunk size for reading within a section (pages at a time)
const CHUNK = 30

await parallel(allSections.map((section, i) => () => {
  const tempFile = `/tmp/jamie-400mi-${i}-${section.slug}.json`
  const totalSectionPages = section.end_page - section.start_page + 1

  // Build read instructions for this section's page range
  const chunks = []
  for (let start = section.start_page; start <= section.end_page; start += CHUNK) {
    chunks.push(`"${start}-${Math.min(start + CHUNK - 1, section.end_page)}"`)
  }
  const readSteps = chunks.map((range, idx) =>
    `   Step ${idx + 1}: Read pages ${range} → collect every Q&A pair found`
  ).join('\n')

  return agent(
    `Extract EVERY Q&A pair from the "${section.name}" section of the 400 M&I interview guide.

PDF: ${section.pdf_path}
Section: ${section.name} (pages ${section.start_page}–${section.end_page}, ~${section.estimated_questions} questions)
Output temp file: ${tempFile}
Category slug (use for all questions): ${section.slug}

Q&A FORMAT IN THIS GUIDE: ${section.qa_format}
PARSE NOTES: ${section.parse_notes}

EXTRACTION STEPS:

1. Read the section in chunks — do NOT read outside pages ${section.start_page}–${section.end_page}:
${readSteps}

   Keep a running list of ALL Q&A pairs found across all reads.

2. For EVERY question:
   - question:     exact question text, cleaned of PDF artifacts (broken lines, extra spaces)
   - model_answer: a clear, complete synthesis of the answer — do NOT truncate; capture all content
   - key_points:   3-8 bullet strings — the specific facts/steps an answer MUST include to be strong
   - category:     always "${section.slug}" for this section
   - difficulty:   1 (definition/basic), 2 (process/mechanics), 3 (technical/advanced/tricky)

   For multi-part questions (a/b/c sub-questions): extract as SEPARATE question objects,
   each with the parent context in the question text if needed for clarity.

3. Write ALL extracted questions as a JSON array to ${tempFile}:
   [
     {
       "question": "Walk me through the three financial statements.",
       "model_answer": "The income statement shows...",
       "key_points": ["Income statement shows revenue minus expenses = net income", "..."],
       "category": "${section.slug}",
       "difficulty": 1
     }
   ]

4. Validate: python3 -c "import json; d=json.load(open('${tempFile}')); print(len(d), 'questions extracted from ${section.name}')"

5. Print: "Extracted N questions from ${section.name} (pp.${section.start_page}-${section.end_page})"

Be EXHAUSTIVE — every question counts. Quality of key_points is the highest-value output.`,
    {
      label: `extract:${section.slug}`,
      phase: 'Extract'
    }
  )
}))

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — WRITE  (consolidate, assign IDs, write final files)
// ═══════════════════════════════════════════════════════════════════════════════
phase('Write')

const tempFiles = allSections.map((s, i) => ({
  path:     `/tmp/jamie-400mi-${i}-${s.slug}.json`,
  section:  s.name,
  slug:     s.slug,
  pdf:      s.pdf_path.split('/').pop()
}))

const manifestContent = JSON.stringify({
  mode: 'ib',
  guide: '400 M&I',
  sections: allSections.map(s => ({
    slug:       s.slug,
    name:       s.name,
    page_range: `${s.start_page}-${s.end_page}`,
    estimated:  s.estimated_questions
  })),
  source_pdfs: pdfPaths.map(p => p.split('/').pop())
}, null, 2)

await agent(
  `Consolidate extracted 400 M&I questions and write the final question bank.

TEMP FILES (one per section — skip any that are missing or invalid):
${tempFiles.map(f => `${f.path}  ← ${f.section} from ${f.pdf}`).join('\n')}

OUTPUT DIRECTORY: ${outputDir}

STEPS:

1. For each temp file, verify it's valid JSON:
   python3 -c "import json; d=json.load(open('<file>')); print(len(d), 'questions')"
   Skip any file that fails this check and note which section was lost.

2. For each valid file / section:
   - Questions in that file should all have category matching the section slug.
   - Sort by difficulty (1 → 2 → 3).
   - Assign sequential IDs: "mi-{slug}-001", "mi-{slug}-002", etc.
   - Write to: ${outputDir}/{slug}/questions.json
     Format: JSON array where each object has: id, question, model_answer, key_points, category, difficulty

3. Write this manifest to ${outputDir}/manifest.json:
${manifestContent}
   After writing, update the "total_questions" and "questions_per_section" fields
   with the actual counts from the files you just wrote.

4. Clean up temp files:
   rm /tmp/jamie-400mi-*.json

5. Print a final report:
   - Total questions written
   - Questions per section (sorted by section)
   - Any sections with 0 questions or that had file errors
   - A one-line quality note per section (e.g. "accounting: 87 questions, difficulty spread 1:45 2:30 3:12")

All output files must be valid, pretty-printed JSON.`,
  { label: 'consolidate-write', phase: 'Write' }
)

log('400 M&I question bank written to: ' + outputDir)

return {
  status:    'complete',
  outputDir,
  sections:  allSections.map(s => s.slug),
  source_pdfs: pdfPaths.map(p => p.split('/').pop()),
  total_section_pages: totalPages
}
