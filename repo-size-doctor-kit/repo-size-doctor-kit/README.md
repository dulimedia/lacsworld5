# Repo Size Doctor — Safe Slimming Kit (No GLBs, Textures, or PDFs Touched)

This kit gives you:
- A **Claude Code agent prompt** to orchestrate safe repo slimming (no behavior changes).
- Bash scripts to **audit**, **clean caches**, and **optionally** rewrite history to remove junk (without touching `.glb`, textures/images, or `.pdf`).
- A GitHub Action that **fails** PRs if bundles or tracked junk exceed thresholds.

> Design rule: **Never modify or delete** assets matching these extensions:  
> `*.glb, *.gltf, *.ktx2, *.png, *.jpg, *.jpeg, *.webp, *.hdr, *.exr, *.tga, *.bmp, *.svg, *.pdf`

## Quick Start

1) **Open Claude Code** in your repo root (or a clone). Paste the contents of `CLAUDE_AGENT_PROMPT.md` as the system/preamble prompt.

2) In the terminal, run an **audit-only** pass first:
```bash
bash scripts/size_doctor.sh --audit
```

3) Review the report (top offenders, history blobs, suggested `.gitignore` diffs).

4) **Optional**: If history contains junk (builds, maps, logs), run a surgical rewrite (back up or mirror-clone first):
```bash
# Choose one (filter-repo recommended):
bash scripts/history_clean_filter_repo.sh  # requires: pip install git-filter-repo
# or
bash scripts/history_clean_bfg.sh          # requires: brew install bfg
```

5) Commit the updated `.gitignore` and push. If you rewrote history, **force-push** and ask collaborators to re-clone.

6) (Optional) Enable CI guard:
- Copy `.github/workflows/size-guard.yml` into your repo to prevent regressions.

---

### What this kit will NOT do
- It will not touch your **GLB/GLTF**, **texture/image** files, or **PDFs**—neither in working tree nor in git history.
- It will not alter application code logic.

### What this kit WILL do
- Remove cache/build artifacts and OS/editor junk.
- Stop reintroducing junk with a stricter `.gitignore`.
- Identify and (optionally) excise historical junk like `node_modules/`, `.next/`, `dist/`, `*.map`, `*.log`, `.DS_Store`, `Thumbs.db` if they were ever committed.
- Give you a repeatable, reviewable process you can run on each iteration.
