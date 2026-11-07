# paper/ --- LaTeX submission version

| file | what it is |
|---|---|
| `PAPER.tex` | the paper (`article`, 10pt, TMLR preprint via `\usepackage[preprint]{tmlr}`). Written as a paper in its own right, not a transcription of `PAPER.md`, which is the long-form research record. Rev1: 23 pages. Main-body figures are Figure 1 `fig:floor`, Figure 2 `fig:replication` and Figure 3 `fig:ties`. Figure 4 `fig:penalty` is in Appendix B |
| `PAPER.pdf` | the rev1 PDF (TeX Live 2026, 23 pages), shipped with the sources |
| `refs.bib` | 64 BibTeX entries, one per cited work |
| `figures/*.tex` | pgfplots fragments. Source filenames keep an older numbering: `fig4-floor-resolution.tex` is Figure 1, `fig1-penalty-per-model.tex` is Figure 4 |
| `README.md` | this file |
| `tmlr.sty`, `tmlr.bst`, `TMLR-STYLE-LICENSE` | the TMLR style, from github.com/JmlrOrg/tmlr-style-file (Apache-2.0). `tmlr.sty` and `tmlr.bst` are unchanged from the copy that was already in the repo |

## How to build

```
pdflatex PAPER.tex
bibtex   PAPER
pdflatex PAPER.tex
pdflatex PAPER.tex
```

`bibtex` is run on `PAPER` (the `.aux` basename), then `pdflatex` twice more so that
natbib's author--year labels and the bibliography settle. The class is `article` (10pt) with
`\usepackage[preprint]{tmlr}` and `\bibliographystyle{tmlr}`. Packages used: `inputenc`, `zi4`,
`textcomp`, `booktabs`, `array`, `amsmath`, `graphicx`, `xcolor`, `pgfplots`, `hyphenat`,
`microtype`, `caption`, `enumitem`, `appendix`, `hyperref`, `xurl`, and `natbib` (loaded by
`tmlr.sty`). No shell escape; the figures are the pgfplots fragments in `figures/`.

The sections below are the 2026-10-10 conversion log. They describe that day's sources (an anonymous
`\usepackage{tmlr}` build and an earlier `article` geometry, `plainnat`, 57 bibliography entries, 19
then 31 pages, and a count of thirteen numbered tables). They are not a description of rev1.

## The 2026-10-10 rewrite: from lab notebook to paper

**Reframed the same day.** After the restatement below, the paper was reframed around the study's most
transferable result: *Six Pitfalls in Measuring the Cost of Coding Agents*, with code mode as the case
study. The six pitfalls (token volume is not cost; cache configuration is part of the treatment;
accounting can be missing and meters fail silently; execution order carries cost; cost without
quality misleads; one suite, one sample, one resolution) are each quantified on the study's own data,
and a checklist closes the paper. Target venue: TMLR (rolling submission, judged on whether the claims
are supported). The Anthropic cache A/B, the bill reconciliation (1.0002) and the pipeline incidents
come from the development pilots (`_ev/anthropic-pilot-2026-10-03.md`, `METHODS.md`) and the paper
says they are outside the manifest. Still `article` class: switching to the TMLR style file is a
preamble change once it is downloaded.

Before this, `PAPER.tex` was a 31-page transcription of `PAPER.md`, the running research record. It is now a paper
in its own right (introduction, related work, study design, results, discussion, conclusion; the
robustness material, the corrections to earlier figures and the artifact map in appendices), and
`PAPER.md` is kept as the long-form record with a banner saying the paper governs. What changed in
substance, and why:

* **Claims restated to what the data support.** The old title ("the code-mode cost penalty is
  model-specific") and the headline "not predicted by the output:input price ratio" are gone: the
  pre-registered price-ratio secondary is nominally *met* (42.3pp > 5pp) and the old text never said
  so, and model is confounded with provider, cache regime and wire protocol. "Harness rankings do not
  transfer" is replaced by "rankings agree weakly" (median rho 0.238 is significantly *positive*,
  p = 0.047); the tie fraction is reported as what it is, a within-model resolution statistic. H3 is
  read as "PTC reduces request count", because native and PTC differ in batching as well as in tool
  count.
* **A check the central contrast never had.** `tools/quality-guard.mjs` (tested; in the manifest)
  reports PTC-against-native solve counts, exact McNemar, cost per solved cell and the contrast on
  cells both arms solved. Batch-1 Haiku: PTC solves 46 of 62 cells against native's 60 (p = 0.0013);
  on the 44 cells both solve, PTC still costs +67.8%.
* **The A/A caveat.** `tools/aa-analysis.mjs` now records each pass's cache-hit share: pass 2 drew
  95.7% of its input from cache against pass 1's 93.3%, so part of the -5.75% A/A gap is probably
  carry-over, not noise.
* **Factual errors fixed:** "ten agent harnesses" (five harnesses, ten arms); "3,720 cells" for a
  population of 8,520 planned cells; the cost table's Anthropic per-run brackets (it printed the
  superseded unreconciled bounds, contradicting its own text); "no published comparison has ever
  measured" per-harness cache (the related-work section cited two that had); "venues deliberately
  unasserted" directly after asserted venues; the within-DSH tie fraction given as 75% in one section
  and 85.7%/100% in another (two arm sets, never named).
* DSH and PTC are defined; repository paths, commit hashes and revision history are out of the body
  (the artifact appendix maps every result to its output file).

## Build result

Compiled with **Tectonic 0.17.0 on 2026-10-10**, from inside `paper/`:

```
& "$env:LOCALAPPDATA\Programs\tectonic\tectonic.exe" PAPER.tex --keep-logs
```

* **TMLR format since 2026-10-10** (`\usepackage{tmlr}`, anonymous submission mode, `tmlr.bst`):
  exit 0; `PAPER.pdf` written (19 pages including references and appendices, four figures, thirteen
  numbered tables);
  Tectonic runs BibTeX (plainnat) in the same pass and `PAPER.blg` is clean - no errors, no warnings.
* **Overfull \hbox: 0. Underfull \hbox: 0.** Nothing is undefined: no missing citations or references.
  The only font messages left are load-time probes for Inconsolata shapes the text never uses
  (italic, light, condensed); the 53 `T1/lmtt` bold substitutions of the previous build are gone.
* **`tools/pdf-margin-check.mjs` is calibrated for the earlier `article` geometry (1in block) and now
  reports 208 findings that are all TMLR's own layout:** 114 are the running header ("Under review as
  submission to TMLR") above the assumed block and 94 are text 0.48pt below its assumed bottom edge,
  because TMLR's 9in text block sits differently. No word is outside TMLR's own block. The check needs
  a `--block` option for the TMLR geometry before it can be used as a gate again. The record of the
  earlier geometry follows.
* **Outside the text block: nothing but the folio, the protrusion and the descent**
  (`node tools/pdf-margin-check.mjs`, 0 findings).  The overfull count cannot see a line that
  is merely *placed* past the measure, which is how five bibliography pages reached 4pt past the right
  margin before `xurl`; this measures the text layer against the 1in block at point resolution and
  separates the three things that are not defects - the page number in the bottom margin on all 31 pages,
  microtype's protrusion (worst 4.46pt left, 2.58pt right, budget 5pt) and the last line's descent
  (2.12-2.42pt, because a full page's last baseline IS the block's bottom edge).  A strict
  "no ink outside the block" reading flags all 31 pages and cannot tell those from the defect, which is
  why the check is now a command with a printed boundary instead of a sentence in a handover.
* The first run downloaded Tectonic's bundle; it is now cached locally, so later runs are fast and
  need no network.

**Typesetting pass (2026-10-10).** The second build compiled cleanly and still looked like a draft;
this pass changed presentation only - no number, claim or sentence of argument:

* a true minus sign (`\textminus`, the width of `+`) instead of a hyphen in every signed number, so
  signed columns align; en dashes for numeric ranges; `$\times$` for the letter x as multiplication;
  ` --- ` for the spaced hyphens used as dashes; TeX quotes for the one straight-quoted passage;
* `\textbf` kept only where it opens a paragraph or a list item, and in table cells: 267 in-sentence
  bold runs were unwrapped (89 kept), because a third of every page set in bold reads as no emphasis;
* every table is numbered and captioned (`inlinetable`: set where it is discussed, captioned with
  `\captionof`), ragged-right `p{}` cells, and the execution-order-adjusted table is rebuilt as six
  columns under two scale headings instead of being shrunk with `\resizebox`; the two-suite table
  splits estimate from interval and groups rows by scale;
* Inconsolata (`zi4`) for `\texttt`, which has a real bold; `lmodern`; `caption` for captions;
  coloured links; a title block without the empty author/date lines;
* `\citet` where the prose named the authors and then cited them again ("Kapoor et al. (Kapoor et
  al., 2024)"), round author-year parentheses;
* `--flag` arguments boxed so a line cannot break between the two hyphens;
* figure 2 moved out of the list it was trapped in, every figure referenced from the text;
* `tools/figures.mjs`: value labels beside each interval instead of on top of it, a bracket instead of
  an empty box for the ratio-5.00 span, real legends, wider bars and non-overlapping counts in the
  tie-fraction chart, the A/A count moved off the shaded floor; the generator test reads
  `\textminus{}` back as a sign;
* `refs.bib`: research notes that printed in the bibliography ("UNVERIFIED ... browser verification
  wall", version histories, quoted vendor copy) moved to `annote`, which plainnat does not print,
  with a short reader-facing `note` in their place.  Nothing was deleted from the file.

**What the first build exposed.** Bare `article` at 11pt sets `\textwidth = 360pt` (5in), not the
6.5in the tables were laid out for, which is why six tables overflowed.  The preamble now carries
`\usepackage[margin=1in]{geometry}` (`\textwidth` ~ 469.75pt), `\usepackage[htt]{hyphenat}` so the
long `\texttt` paths can break, and `\emergencystretch = 3em` to absorb the last prose lines.  (The
`\resizebox` that build used for §3.1's adjusted table is gone; see the typesetting pass above.)

**BibTeX defect found and fixed while building.** A comment line in `refs.bib` above
`vats2026scaffold` contained an at-sign ("5th DL4C Workshop @ ICML 2026").  BibTeX reads a top-level
at-sign as the start of an entry, so it aborted with "I was expecting a brace or a parenthesis" and
**dropped the whole Vats and Golev record from the bibliography**.  The comment now says "at ICML
2026"; the entry is back in `PAPER.bbl` and the citation resolves.

**The open `url` question is answered.** `plainnat.bst` - the copy in Tectonic's bundle - *does*
print the `url` field, wrapped in `\url{}`: the generated `PAPER.bbl` contains
`\url{https://proceedings.iclr.cc/paper_files/...}`.  Because `\url{}` treats its argument verbatim,
the four URL fields whose paths contain `paper_files` are stored **unescaped** (an escaped underscore
inside `\url{}` would have printed a literal backslash); the underscore that matters - the one in the
Strands `note`, which is ordinary typeset text - stays escaped.

**Prose-versus-source checks, still run because they caught real drift:**

* every `\begin{...}` has a matching `\end{...}`, and braces balance to zero;
* every `$...$` pair is closed on its line;
* all 10 `tabular` environments have a column specification with exactly as many columns as the
  widest row has cells;
* all 57 distinct `\cite...` keys resolve to an entry in `refs.bib`, and no entry is uncited;
* every numeric token in `PAPER.md` appears in `PAPER.tex` except the arXiv/DOI identifiers, which
  by request live in `refs.bib` rather than in the prose;
* the artifact file count stated in `PAPER.md`, `ARTIFACT.md` and `PAPER.tex` equals
  `inputs + outputs` in `artifact/MANIFEST.json` - the number `--verify` prints
  (`tools/artifact-coverage.test.mjs`);
* every percentage, pp value and decimal stated beside a citation is measured against the file it cites
  (`node tools/number-audit.mjs`): at the 2026-10-10 revision `PAPER.md` gave **90 numbers against 10 cited files, 32 not in
  them**, all triaged as derived (a gap, a sum, a row count) or historical (the withdrawn 7.7%, the
  `B = 5,000` bound). It is a locator, not a proof - the class it exists for is the stale number, and
  it would have caught STEP2's 77% (the filed `meanGrowthFraction` is 0.8402) before a review did.

## Source revision this converts

`PAPER.md` was edited on disk at **2026-10-10T12:22:52Z**, after the first transcription pass;
the .tex was re-synced to that revision.  Recorded identity at that revision:
`sha256 = 90ab587de7bc037a...` (78,500 bytes, 990 lines).  The four differences picked up in
the re-sync (the source has been edited twice more since; its current identity is
`sha256 = bb703c410bcce039...`, 78,896 bytes, 991 lines, 2026-10-10T13:34:33Z):

1. §3.1: the run-in bold became "**Consequences for this section's claim.**" (the words
   "stated rather than absorbed" were dropped upstream).
2. §3.1a item 1: "Suite 2 spans **28.8 points** on the same six-model basis (-17.0% to +11.8%;
   the four pre-registered providers span 24.0)." replaced the earlier "Suite 2 spans 24 points
   (-17.0% to +7.0%)."
3. §3.8: a new sentence pair on seed stability was added --- GLM's bound between **+0.06 and
   +0.17** at 20 explicit seeds, classification null, **R1 = 0 of 4 on all 20 seeds**
   (`tools/verdict-seed-stability.mjs`, `analysis/verdict-seed-stability-2026-10-10.json`).
4. §7: the closing sentence now reads "Nothing here needs another paid matrix: the replication
   suite is collected, validated and analysed, the mixed-effects model is done, and the
   ablations are done." (the "stale-document sweep ... LaTeX build are what remain" clause was
   dropped upstream --- note that this file *is* that LaTeX build).

**Second upstream correction, same day (2026-10-10T12:40:16Z, 78,579 bytes).** Two of the
discrepancies listed below were repaired in `PAPER.md` itself on 2026-10-10 and are reflected in
the .tex, which was re-synced:

5. **H3's interval is now uniform.** Every occurrence of `[+1.234, +3.328]` (three sites: the §3.5
   opening paragraph, the §3.7 H3 table row and the §4 tool-interface paragraph) and the single
   occurrence of `[+1.229, +3.360]` (the §3.5 closing paragraph) were replaced with
   `[+1.228, +3.360]` --- four sites in total, matching `METHODS.md` §7.
6. **§3.6's spend claim.** "Anthropic is ~88% of the spend" is now "Anthropic is **85% of the
   study's measured spend** (the 144.33 session ledger against the cheap four's 26.16) for the
   same 620 cells per model", with the same emphasis.

7. **The artifact file count followed the manifest.** The reproducibility block's count moved from
   "79 files across two scopes" to **81 files across two scopes** when `artifact/MANIFEST.json` gained
   the mixed-effects output and the new seed-stability output.  `node tools/artifact.mjs --verify` now
   reports "VERIFIED: 81 files match the manifest of 2026-10-04T08:11:15.632Z" and exits 0; `PAPER.md`
   and `ARTIFACT.md` both say 81 (ARTIFACT.md: "Two scopes, 81 checksummed files"), and the .tex says
   81 in the same sentence as the source, so the count is the manifest's and not the prose's.

**Third upstream correction, same day (2026-10-10T14:02:08Z, 86948 bytes).** Six
residual review objections were fixed in `PAPER.md` and the .tex was re-synced to that revision:

8. **The artifact count moved again, 81 -> 84**, and the reproducibility block's list of what the second
   scope contains gained "the ranking and retention sensitivities and the test-edit incidence".
9. **§3.1's scale discussion** now names the metric ("the RMSE of the relative dollar error of the
   held-out block difference, one seeded fold draw"), adds that four of the nine log wins are marginal
   (ratio < 1.10) and that no claim rests on a per-matrix preference from one seeded draw, and reports the
   ratio result on **three** bases (79.2% adjusted-log, 71.6% adjusted-additive, 70.6% raw) with the
   pre-registered secondary met on all three (42.3pp / 38.9pp / 37.6pp).
10. **§3.2 gained a pairing-and-interval paragraph**: `pairByTask` silently discards one of the two
    seeds and the filed JSON carries no interval; re-paired, Qwen is -0.0646 [-0.0781, -0.0516] and haiku
    -0.0051 [-0.0087, -0.0021].
11. **§3.4 gained an A1d split** (DSH-only 0.4667 against external-only 0.7444) and a position-adjustment
    sensitivity bullet (tie fraction 74.1% -> 75.9% and rho 0.238 unchanged on batch 1; 61.1% -> 63.0% and
    rho 0.024 -> -0.071 on tasks-b).
12. **§4 gained the five new citations** (Weinberger and Hozez; Requesty; AIMultiple; Strands' CodeAct
    agent; TwinRouterBench), the corrected Bai 30x attribution, the Claw-SWE-Bench v1/v2 distinction, the
    corrected LiteLLM joint-highest reading, an explicit "this study does not measure a paradigm-level
    output-token effect" statement, and the "ratio read off, not manipulated" scoping.
13. **§5 limitation 3** now records that DeepSeek's test-edit field is absent (0/62 on a 10% survivor
    sample, reported as not measured) and reports the tasks-b incidence (luna 455/800 = 56.9%, Qwen 33.2%,
    DeepSeek 30.9%, Sonnet 22.6%, GLM 20.6%, Haiku 2.9%); **§6** replaces the "test written first and
    watched fail" claim with the commit order (126 seconds) as the demonstrable part.

14. **The artifact count was still 97 in the prose (2026-10-10, final sync).** The last extension
took `artifact/MANIFEST.json` to **99 files** - the corrected A/A noise floor, the single-harness
retention pilot, the Anthropic cost bracket and the common-`f` evidence - while `PAPER.md`,
`ARTIFACT.md` and `PAPER.tex` all said 97; the count had already drifted four times (79, 81, 84, 97)
because nothing pinned it. All three now say 99 and name the added material, and the test above asserts
the number against the manifest. The test was run against the 97 it replaced first, and failed.

15. **REVIEW-4's "Further findings" list, the four items still open (2026-10-10).** The must-fix list
and the six residual objections were closed earlier in the day, but the review's third list was not
audited. Four of its twelve items were still open and are now fixed, three of them in the paper:

    * §2 said "620/620 cells ... no missing cells" while the filed panel meta for luna is `rows 620,
      excluded 1, cells 619` - one `opencode` seed-2 run on `multi-file-schema-validator`, exit 1 and
      unsolved, excluded by rule 9's text clause on the provider's own "Rate limit reached". Disclosed
      in the §2 table and the sentence after it, beside Qwen's publicised retry.
    * §3.6's `solved` column was per-collected-record while §2 counts cells; the header now says so.
    * §3.7's family of 18 named its two survivors but not the fact that both are Anthropic, so the four
      providers that carry the replication contribute no survivor to it; said now.
    * §3.8 reported the pre-registered m = 12 family without the filed artifact's m = 18 over all six;
      both readings are now reported and the survivors are the same two (DeepSeek, luna - both cost
      contrasts, A4 0 of 8).

    Outside the paper: `notes/records/REPLICATION-VERDICT-2026-10-09.md` §5's "haiku's +6.2% is the only
    positive-leaning cost differential anywhere in tasks-b" was false on its own table (Qwen +5.7% raw,
    +7.0% adjusted log); corrected in place with a §0 bullet. `notes/records/FINDINGS.md`'s F52 sentence still
    enumerated "0, 1, 1, 1 of 4 under four readings"; corrected to three readings, 0, 1, 1, with the
    date and the source of the correction beside it.

16. **Compile pass (2026-10-10).** First Tectonic build: 44 pages, 27 overfull boxes.  Fixed with
    `\usepackage[margin=1in]{geometry}`, `\usepackage[htt]{hyphenat}`, `\emergencystretch = 3em`,
    tighter `\tabcolsep` on two tables, rebalanced `p{}` widths on the §3.7 table, and a
    `\resizebox{\textwidth}{!}{...}` around §3.1's 5-column adjusted table.  Final: **29 pages, 0
    overfull boxes**.  Two bibliography defects were fixed in the same pass: the BibTeX comment
    containing an at-sign that silently dropped `vats2026scaffold`, and four URL fields whose
    underscores had been escaped although `plainnat` prints them through `\url{}` (see "Build result").

17. **The filed mechanism predictions, H5, and a stale 77% (2026-10-10).** Two disclosures the paper was
missing, and the number audit that came with them:

    * §3.2 now says what the filed mechanism test could and could not do. `notes/plans/JOURNAL-PLAN.md` §4 filed
      three predictions - P1 monotone prefix growth, P2 misses after a tool-shape change, P3 scaling with
      tool diversity - and claimed they were "all from logs we already collect". The gateway stores
      message and tool **counts**, not contents, so P1 is **refuted as stated** and P2/P3 are
      **untestable** (`analysis/prefix-retention.json` `notTestable`, `METHODS.md` §7,
      `notes/records/STEP2-RECONCILIATION.md` §4b). What §3.2 measures is the mechanism's consequence, not the
      mechanism's own three predictions.
    * §3.4 now carries the label its content already earned: the pre-registration's exploratory **H5**
      ("harness cost rankings are not stable across providers", filed with no formal test). The §3.7
      table lists H1-H4, so a reader checking the filing against the paper saw a hypothesis that was in
      fact reported but unnamed.
    * Auditing P1 found the fraction quoted for it wrong in two places. `notes/records/STEP2-RECONCILIATION.md` said
      77% and the header comment of `tools/prefix-retention.mjs` said "100% of transitions in every arm
      class"; the filed value is **84.0%** (`meanGrowthFraction = 0.8402`), which is what the tool
      prints when re-run. The paper quotes 84.0%, STEP2 carries a dated correction, and the tool comment
      now says what the tool computes. The refutation does not depend on the number: both modes append.

Identity recorded for the 2026-10-10 revision, not for rev1. The .tex: `sha256 = 3dde5eb08328808c...`
(101236 bytes, 1232 lines; rebuilt 2026-10-10 after the noise-floor, retention-pilot, cost-bracket and
common-f syncs, the 97 -> 99 artifact-count sync, the four disclosure corrections of item 15 and the
mechanism/H5 disclosures of item 17, with four figures and xurl, 31 pages, 0 overfull, exit 0, and 0
findings from `node tools/pdf-margin-check.mjs`).
`refs.bib` at that revision: `sha256 = 5ccb2974b40fbb00...` (38652 bytes, 57 entries; unchanged that day).
`PAPER.md` at that revision: `sha256 = e352cfb6540c3be9...` (93825 bytes, 1142 lines).
`PAPER.pdf` at that revision: `sha256 = 5e984667a9f7c235...` (223524 bytes, 31 pages).
All 57 bibliography entries were cited from the .tex at that revision, including the five added for the
related-work spine. Rev1's `refs.bib` has 64 entries.

## Markdown constructs rendered by hand

* **Tables** -> `center` + `\small` + `tabular` with `booktabs` rules.  They are *not*
  floats and carry no captions, because the source tables have no captions; the wide ones
  (§2, §3.1 both tables, §3.2, §3.7, §3.8 both tables, §3.8 extension, §7) use `p{}` columns
  and `\small` so they fit `\textwidth`.
* **code spans** -> `\texttt{}` (with `\_` for underscores, and `-{}-extend` to stop the
  `--` ligature inside typewriter text).
* **bold** -> `\textbf{}`, *italic* -> `\emph{}`, including the nested cases ("**The second
  table is the same contrast *modelled* ...**", "**the `f` to be common across models**",
  "**`glm-5.3`, that contributes no H3 rows**").
* **Straight double quotes** -> LaTeX open/close double quotes.  Apostrophes were left as-is.
* **Em dashes** (the Unicode em dash and the source's spaced "-") -> `---`.  Hyphens in ranges
  and in compound words were left alone, so the numeric content is the source's byte for byte.
* **Inline math**: `D_ij = b0 + b1*S_ij + u_i + e_ij` -> `$D_{ij} = b_0 + b_1 S_{ij} + u_i +
  e_{ij}$`; `d = c_ptc - c_native = alpha + [f(p_ptc) - f(p_native)]` ->
  `$d = c_{\mathrm{ptc}} - c_{\mathrm{native}} = \alpha + [f(p_{\mathrm{ptc}}) -
  f(p_{\mathrm{native}})]$`.  Other one-off symbols: "~" -> `$\sim$`, "N = 26" with the
  approximately-equal sign -> `$N \approx 26$`, "<=" -> `$\leq$`.
* **§** -> `\S` (as in `\S3.1`); **%** -> `\%`; **_** -> `\_`; **&** -> `\&`;
  **#** -> `\#`; **dollar amounts** -> `\$`.
* **Markdown horizontal rules** (--- lines) were dropped: they separate sections and carry no
  content.  The §3.9 / §4 / §5 separators therefore appear only as section headings.
* **Bullet lists** -> `itemize` (the §3.4 list is nested once); **numbered lists** ->
  `enumerate`.
* **Headings**: sections 1--7 are auto-numbered `\section`s so that all the paper's internal
  "§n" references stay literally correct; subsections carry the source's own numbers
  (`\subsection{3.1 ...}`, ..., `\subsection{3.1a ...}`) with `secnumdepth = 1`, because the
  automatic counter would renumber 3.1a and everything after it.  The "Data, artifact, and
  reproducibility" block is an unnumbered `\section*` placed after the abstract, so that
  "1. The question" ... "7. Tiering, honestly" keep their source numbers.
* **Title**: the file prefix "PAPER --- " in the Markdown H1 was dropped; `\title{}` is
  "What six models across five providers now support".  There is no author block in the source,
  so `\author{}` is empty.

## Citation handling

* "(Author et al., arXiv:XXXX.XXXXX)" -> `\citep{key}`; "(Author et al.)" -> `\citep{key}`;
  a bare "(arXiv:XXXX.XXXXX)" -> `\citep{key}`.  Where the citation sits inside a
  parenthetical list the command is `\citealp` so parentheses do not nest.
* Works named in the prose without an identifier (Agentless, AutoCodeRover, TheAgentCompany,
  Holistic Agent Leaderboard, Efficient Agents, ToolLLM, Toolshed, SWE-agent's ACI study,
  mini-SWE-agent, CodeAct, RouteLLM, FrugalGPT, Hybrid LLM, Prompt Cache, LongLLMLingua,
  CacheBlend, Terminal-Bench, the two Anthropic engineering posts, Cloudflare Code Mode,
  LiteLLM's auto-router benchmark, the cline and hermes-agent issues, OpenRouter's caching
  docs) were given entries and `\citep` markers: the prose already cited them by name, and
  only the pointer was added.
* References the source does **not** identify were deliberately left uncited, because citing
  them would mean asserting an attribution `PAPER.md` does not carry: the cache "invalidation
  hierarchy", "cached state is machine-local", the practitioner cache-dashboard post, "serving
  research built the reuse machinery", the "harness-engineering survey that argues
  harness-over-model", "the HELM legacy", and the four unnamed fragility results in §4
  ("the same model swings widely on SWE-bench Lite ...", "undisclosed private variant testing
  ...", "61 models x 24 benchmarks ...", "code benchmarks reshuffle under semantic-preserving
  mutation").
* Venues are *not* asserted in the §4 prose, as the source insists; venue and year live in
  `refs.bib` only.

## Verification of refs.bib

Every entry was checked against a primary source fetched during this pass --- arXiv abs pages
and the arXiv API, the ACL Anthology, the ICLR and MLSys proceedings, Crossref DOI records,
publisher pages, and the vendor/GitHub pages themselves.  The URL used for the check is a
comment above each entry.  One entry could not be verified: `han2026harness` (OpenReview forum
`QI8z3skBwt`) is behind a browser-verification wall, so its venue and year are recorded as
reported, not confirmed, and its `note` field says so.

## Discrepancies found and deliberately NOT fixed

Numbers are load-bearing and were transcribed exactly; nothing below was repaired.  Two earlier
entries --- H3's interval printed three ways, and §3.6's "~88% of the spend" --- were repaired
upstream on 2026-10-10 and are no longer discrepancies; they have been removed from this list and
are recorded under "Source revision" above.  The .tex was transcribed from the sources as they
stood when each section was converted, which is why the three items below are kept.

1. **The mixed-effects model's status was stated two ways.** `METHODS.md` §7 said "The mixed-effects
   model was never fitted" and listed it as an open item, while `PAPER.md` §3.7 says the filed model
   "was fitted on 2026-10-04" and §7 says it "is done".  `METHODS.md` itself has since been corrected
   (2026-10-10) to "The mixed-effects model has been fitted (2026-10-04)", with an explicit
   correction note recording what it previously said, so the two files now agree.
2. **Amendment count.** `METHODS.md` §7 said the pre-registration "was amended 21 times";
   `PAPER.md` §6 says 23.  `METHODS.md` itself has since been corrected (2026-10-10) to "amended 23
   times", so the two files now agree; the .tex carries the §6 figure.
3. **H2's wording differed between the two files** ("terse presentation shrinks the PTC penalty" in
   METHODS, "reduces" in PAPER).  `METHODS.md` has since been corrected (2026-10-10) to "reduces",
   matching both `PAPER.md` and the filed H2 statement ("Reducing output volume reduces the PTC
   penalty", `PRE-REGISTRATION.md` §H2), so the two files now agree.  No open discrepancies remain
   in this list.

## Provenance

Created inside a new `paper/` directory.  Nothing outside `paper/` was modified,
`findings/` was not touched, and no collection, preflight, pilot or gateway run was executed
(no API spend).
