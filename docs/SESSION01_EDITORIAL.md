# Session 01 — editorial desktop portfolio

## Scope and factual audit
The repository remains authoritative: five projects (support resolution agent, GhostApply,
Kritique, CollabCode, distributed URL shortener), one QENN reproduction, the Unified Mentor
internship, JIIT education and two certifications. No Codady, leadership, new employment,
new capability, accuracy claim or availability claim was added. All five live URLs remain
null and render disabled Demo coming soon controls. The internship date-confirmation note
and the finding that the classical baseline beat both quantum reproductions remain visible.

## Presentation
Desktop cinematic mode uses the existing fonts: responsive 44–78px Home name (bounded below
the requested initial range at narrow desktops to protect model clearance), 36–56px section
headings, 24–32px project titles, 15–17px body and 12–13px supporting text. The upper-left
Home introduction is capped above the station area and can scroll at constrained heights;
no model is resized. Four supported capabilities replace the desktop text-badge groups.
Engineering projects expose the actual problem, architecture, up to four existing highlights,
verified metrics, technology names and source links; diagrams remain in native disclosure.
Research, work, education and contact use transparent editorial entries and local text shadows.
No publication URL or project demo was invented.

The actual unwanted surfaces were the shared `.content-section` / `.toolkit-group` /
`.research-panel` / `.experience-entry` / `.compact-entry` backgrounds and borders, plus
`#contact`'s explicit 80% dark background and boxed contact links. Scoped overrides remove
these surfaces and section side borders that can read as vertical amber separators in travel.
The horizontal track/panels do not themselves define amber vertical borders. Intentional
cockpit ornaments, progress, content separators, focus rings and the existing global video
reading gradient remain. Home's previously removed pseudo-element scrim remains disabled.

## Technology assets
A single typed registry resolves canonical IDs, names, aliases, colors and dark variants.
TechIcon, TechnologyStack and TechnologyGroup reuse that registry. Sixteen SVG files are
locally served; no CDN, icon font, runtime dependency or full-library import is added.
Thirteen files are unmodified Devicon v2.17.0 artwork (MIT notice retained). LangGraph,
Google Gemini and Qiskit are from Simple Icons v16.0.0 (CC0 collection license, disclaimer
and upstream source metadata retained). Brand trademarks remain with their owners;
collection licensing is not an endorsement or blanket grant of brand rights.
Technologies without bundled authoritative artwork retain text; protocols such as SSE
and CI/CD have no invented logos. Adjacent names remain visible and SVGs are decorative.
Toolkit icons are 36px, project/research icons 22px; dark monochrome variants use CSS.
Sources: https://github.com/devicons/devicon/tree/v2.17.0 and
https://github.com/simple-icons/simple-icons/tree/16.0.0 .

## Changed sources
- `app/globals.css`: opt-in desktop editorial styles; original responsive fallbacks retained.
- `content/expedition.ts`: concise professional introduction and four factual capability groups.
- `content/technologies.ts`, `components/technology-stack.tsx`: shared registry and local artwork.
- `components/chapter-navigation.tsx`: terminal period in the Home name only; navigation logic unchanged.
- Toolkit, Projects, Research and Contact section components: scoped semantic presentations/icons.
- `components/section-reveal-controller.tsx`: register new editorial entries with the existing reveal selector only.
- `content/technologies.test.mts`, `package.json`: focused registry/asset/content checks in existing test command.
- `public/icons/technology/`: selected artwork, license notices, disclaimer and provenance.
- `scripts/validate-editorial.py`: optional native Edge captures; not an application dependency.

## Evidence and limitations
Before references are the committed d61fd29 captures in `validation/chapters/` (all six
sections). An attempted fresh before pass was interrupted during hot reload; its mixed
capture was discarded. The first after pass timed out after Home and Toolkit; a stable
pass hides development controls without changing application rendering. This host uses
SwiftShader/software video decoding; no physical-GPU or full-speed quality claim is made.
Validation results and final artifact bytes are recorded below after completion.

## Release gates and assets
- Lint exit **0**, typecheck exit **0**, tests exit **0** (45 passed, zero skipped), production build exit **0** (18 pages).
- First-load homepage JS remains **253 kB** at the build report's rounding precision; shared JS remains 103 kB.
- SVG artwork totals **40,856 bytes** across **16 files**; the complete icon directory including notices and provenance is **54,633 bytes**.
- Full-render 1280x800 captures of all six destinations completed with no page errors and were individually inspected. The process exit code was not retained across the interruption; `after.json` records completion evidence.
- One initial test failed on whitespace in a source-string assertion. That brittle assertion was replaced with actual content/registry invariants, and the complete suite then passed.
- The attempted development controller run exited 1 on initial-page timeout; it is not claimed as a passing run. Production validation below supersedes that unavailable preview.
- See [gate results](./validation/editorial/gates.json), [updated screenshots](./validation/editorial/), and the [committed before reference](./validation/chapters/).
- Final production browser exit **0**: 12 grouped checks passed, zero page errors and zero console errors. Geometry covered all six stops at 1024/1280/1440/1920px; station raycast hover/drag gesture, native project disclosure/nested scroll, keyboard Next/Previous, manual/reverse scrolling and Return to Station cleanup passed. All 16 SVG routes returned HTTP200 with no runtime icon CDN request. 375/768px, normal-URL reduced motion and canvas-disabled fallback retained their original content/layout.
- This production pass suppresses raster draws solely for controller/layout checks. It does not establish visual GPU performance; the six full-render captures are separate evidence. The first production attempt passed all width checks but failed an upper-edge station pointer sample immediately after resize; allowing scene settling and using the hull center passed without changing application interaction code.
- [Production results](./validation/editorial/production.json) include exact measured section rectangles and the completed check list.
- Remaining limits: physical-GPU/full-speed artistic review; visual checks used 1280x800 captures, while the four-width matrix checked geometry/interactions. Dynamic-video contrast was visually inspected, not certified by a pixel-level AA measurement. Larger Home text may need local scrolling within its protected upper-left area. Unsupported/unbundled brand artwork remains text-only. Existing project repository targets were verified in rendered links; remote repository availability was not exhaustively fetched. No new live demos or publication URLs were invented.
- No push, merge or deployment. Stop after Session 01.
- Final diff review corrected a punctuation encoding artifact in the metric separator. Release gates were repeated on that final source; the production interaction pass precedes only this punctuation correction.
