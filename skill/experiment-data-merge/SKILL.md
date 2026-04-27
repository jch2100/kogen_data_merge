---
name: experiment-data-merge
description: Use this skill when you need to merge laboratory experiment files from multiple devices into one normalized Excel workbook, especially when each file uses different column names or extra metadata columns.
---

# Experiment Data Merge

Use this skill for recurring lab-data integration work where multiple `.csv` or `.xlsx` files represent the same experiment with different schemas by device.

## What this skill does

- Reads the latest input files from a folder or a user-specified set of files.
- Detects each device format by matching source column headers.
- Maps heterogeneous columns into a common schema.
- Exports one integrated workbook with normalized data, device-specific extra fields, mapping history, and review notes.

## Core workflow

1. Confirm the input folder that contains the device files.
2. Inspect whether the files are `.csv` or `.xlsx` and whether the columns match one of the supported mappings in `scripts/merge_experiment_results.mjs`.
3. Run `scripts/run_merge.ps1` or the Node script directly.
4. Verify that the output workbook includes:
   - `README`
   - `통합본`
   - `장비별추가항목`
   - `장비요약`
   - `매핑로그`
   - `검토필요`
5. If a new device format appears, update the `deviceDefinitions` object in `scripts/merge_experiment_results.mjs`.

## When to read other files

- Read `README.md` when the user asks how to install or run the skill.
- Read `scripts/merge_experiment_results.mjs` when you need to add a new device mapping or change the output workbook structure.
- Read `scripts/run_merge.ps1` when execution fails because the Codex bundled runtime path needs adjustment.

## Expected inputs

- Folder with 2 or more experiment files
- Supported extensions: `.csv`, `.xlsx`
- Each file should contain at least one recognizable column set for one device

## Expected output

- One Excel workbook in the chosen output folder
- Default file name pattern: `실험데이터_통합결과_YYYYMMDD.xlsx`

## Notes

- Prefer editing the mapping object instead of rewriting the merge logic.
- Keep the normalized fields stable unless the business schema changes.
- If the user only wants analysis, inspect the latest merged workbook before rebuilding it unnecessarily.
