# History

This repository starts from a single snapshot commit (2026-11-06). The study's working
history (about 300 commits, 2026-09-28 to 2026-11-06) is kept in the original local
repository, not here. Commit hashes cited in PAPER.md, notes/reviews/REVIEW-4.md, the HANDOVER notes and
elsewhere refer to that history and do not resolve in this repository.

The snapshot differs from the last commit of that history in four ways:

1. `_goose-install/` (a downloaded goose binary and installer, 335 MB) is not included.
2. `recovered/sessions-text.txt` is shipped as `recovered/sessions-text.txt.gz` (gzip -9,
   38 MB) instead of through git-lfs. `gunzip -k recovered/sessions-text.txt.gz` restores
   the plain text; tools/recover-records.mjs reads the .gz directly.
3. The transcript had captured live API keys (OpenAI, Anthropic, z.ai, Qwen, DeepSeek), a
   credential-store secret, two access-token JWTs in URLs and four Google API keys. Each
   was replaced in place with `[REDACTED-<kind>]`. 119 of 2,029,563 lines changed and the
   line count is the same, so line citations such as `sessions-text.txt:1992394` in
   tools/credit-plan.mjs still point at the same text. The keys have been rotated.
4. Identifying values were replaced in every file:
   - the Windows user name in paths and prose -> `user` (case kept), the machine name ->
     `workstation`;
   - Anthropic workspace ids -> `wrkspc_REDACTED`;
   - masked API-key tails (`upstreamKeyMasked`, `sk-...`, `bc9...`, `4a5...`) -> `...XXXX`.
   Text files keep their line counts; UTF-16 logs were edited in UTF-16; two goose
   smoke-test `sessions.db-wal` files got same-length replacements (`user_`), so SQLite may
   ignore the edited WAL frames. artifact/MANIFEST.json's `bytes`/`sha256` entries match the
   edited files: `node tools/artifact.mjs --verify` passes (114 files), and a full rebuild
   gives the same analyses from edited and unedited inputs, apart from timestamps.
   Local tools or tests that point at a real path under the old user folder now point at
   `C:\Users\user\...`.
