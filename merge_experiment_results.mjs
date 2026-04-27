import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = process.cwd();
const defaultInputDir = path.join(root, "samples");
const defaultOutputDir = path.join(root, "outputs");

const standardFields = [
  "sample_id",
  "experiment_date",
  "operator",
  "device_id",
  "result_value",
  "signal_strength",
  "quality_score",
];

const mappings = {
  A: {
    deviceKey: "A",
    fileName: "실험데이터_20260421_장비A.csv",
    sheetName: null,
    fieldMap: {
      "Sample No": "sample_id",
      "Measured At": "experiment_date",
      User: "operator",
      Equipment: "device_id",
      Result: "result_value",
      Signal: "signal_strength",
      "QC Score": "quality_score",
    },
  },
  B: {
    deviceKey: "B",
    fileName: "실험데이터_20260421_장비B.xlsx",
    sheetName: "Device_B",
    fieldMap: {
      specimen_id: "sample_id",
      run_date: "experiment_date",
      analyst: "operator",
      instrument_name: "device_id",
      final_value: "result_value",
      intensity: "signal_strength",
      quality_index: "quality_score",
    },
  },
  C: {
    deviceKey: "C",
    fileName: "실험데이터_20260421_장비C.xlsx",
    sheetName: "Device_C",
    fieldMap: {
      sample_code: "sample_id",
      test_day: "experiment_date",
      technician: "operator",
      machine_id: "device_id",
      outcome_value: "result_value",
      peak_signal: "signal_strength",
      score_qc: "quality_score",
    },
  },
};

const headerStyle = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};

function parseArgs(argv) {
  const args = {
    inputDir: defaultInputDir,
    outputDir: defaultOutputDir,
    latest: 3,
    todayOnly: false,
  };

  for (const arg of argv) {
    if (arg.startsWith("--input-dir=")) {
      args.inputDir = path.resolve(arg.slice("--input-dir=".length));
    } else if (arg.startsWith("--output-dir=")) {
      args.outputDir = path.resolve(arg.slice("--output-dir=".length));
    } else if (arg.startsWith("--latest=")) {
      args.latest = Number(arg.slice("--latest=".length));
    } else if (arg === "--today-only") {
      args.todayOnly = true;
    }
  }

  if (!Number.isInteger(args.latest) || args.latest <= 0) {
    throw new Error("--latest must be a positive integer.");
  }

  return args;
}

function endColumn(colCount) {
  let n = colCount;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function rowsFromMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length < 2) return [];
  const headers = matrix[0].map((value) => String(value ?? "").trim());
  return matrix.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? null;
    });
    return obj;
  });
}

async function loadCsvRows(fullPath) {
  const csvText = await fs.readFile(fullPath, "utf8");
  const workbook = await Workbook.fromCSV(csvText, { sheetName: "Sheet1" });
  const sheet = workbook.worksheets.getItem("Sheet1");
  const used = sheet.getUsedRange();
  return rowsFromMatrix(used.values);
}

async function loadXlsxRows(fullPath, preferredSheetName) {
  const blob = await FileBlob.load(fullPath);
  const workbook = await SpreadsheetFile.importXlsx(blob);

  if (preferredSheetName) {
    const preferred = workbook.worksheets.getItem(preferredSheetName);
    const used = preferred.getUsedRange();
    return rowsFromMatrix(used.values);
  }

  const firstSheet = workbook.worksheets.items[0];
  const used = firstSheet.getUsedRange();
  return rowsFromMatrix(used.values);
}

async function loadRowsFromFile(filePath, preferredSheetName = null) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv") return loadCsvRows(filePath);
  if (ext === ".xlsx") return loadXlsxRows(filePath, preferredSheetName);
  throw new Error(`Unsupported file type: ${filePath}`);
}

function normalizeName(name) {
  return String(name ?? "").trim().toLowerCase();
}

function detectMapping(fileName, rows) {
  const headers = Object.keys(rows[0] ?? {}).map(normalizeName);
  const fileHint = normalizeName(path.basename(fileName));

  for (const config of Object.values(mappings)) {
    const sourceColumns = Object.keys(config.fieldMap).map(normalizeName);
    const matchedByHeaders = sourceColumns.every((column) => headers.includes(column));
    const matchedByName = normalizeName(config.fileName) === fileHint;
    if (matchedByHeaders || matchedByName) {
      return config;
    }
  }

  return null;
}

function transformRows(sourceKey, rows, fieldMap) {
  const extraColumns = Object.keys(rows[0] ?? {}).filter((key) => !(key in fieldMap));
  const unifiedRows = [];
  const extraRows = [];
  const reviewRows = [];

  for (const row of rows) {
    const unified = { source_device: sourceKey };
    for (const field of standardFields) {
      unified[field] = null;
    }

    for (const [sourceColumn, standardField] of Object.entries(fieldMap)) {
      unified[standardField] = row[sourceColumn] ?? null;
    }

    unifiedRows.push(unified);

    const extra = {
      source_device: sourceKey,
      sample_id: unified.sample_id,
    };
    for (const extraColumn of extraColumns) {
      extra[extraColumn] = row[extraColumn] ?? null;
    }
    extraRows.push(extra);

    const missingStandard = standardFields.filter(
      (field) => unified[field] === null || unified[field] === "",
    );
    if (missingStandard.length > 0) {
      reviewRows.push({
        source_device: sourceKey,
        sample_id: unified.sample_id,
        review_type: "missing_standard_field",
        detail: missingStandard.join(", "),
      });
    }
  }

  return { unifiedRows, extraRows, extraColumns, reviewRows };
}

function buildMatrix(headers, rows) {
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? null))];
}

function writeSheet(sheet, rows) {
  if (!rows || rows.length === 0) {
    sheet.getRange("A1").values = [["No rows"]];
    return;
  }
  const headers = Object.keys(rows[0]);
  const matrix = buildMatrix(headers, rows);
  const lastCol = endColumn(headers.length);
  const lastRow = matrix.length;
  const range = sheet.getRange(`A1:${lastCol}${lastRow}`);
  range.values = matrix;
  sheet.getRange(`A1:${lastCol}1`).format = headerStyle;
  range.format.wrapText = true;
  range.format.autofitColumns();
  sheet.freezePanes.freezeRows(1);
}

function formatDateForFile(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function isSameLocalDate(date, now) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

async function pickLatestFiles(inputDir, latestCount, todayOnly) {
  const now = new Date();
  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (![".csv", ".xlsx"].includes(ext)) continue;
    const fullPath = path.join(inputDir, entry.name);
    const stats = await fs.stat(fullPath);
    if (todayOnly && !isSameLocalDate(stats.mtime, now)) continue;
    files.push({
      name: entry.name,
      fullPath,
      mtime: stats.mtime,
    });
  }

  files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  return files.slice(0, latestCount);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await fs.mkdir(args.outputDir, { recursive: true });

  const selectedFiles = await pickLatestFiles(args.inputDir, args.latest, args.todayOnly);
  if (selectedFiles.length < args.latest) {
    throw new Error(
      `Expected ${args.latest} recent files in ${args.inputDir}, but found ${selectedFiles.length}.`,
    );
  }

  const transformedGroups = [];
  const mappingLogRows = [];
  const reviewRows = [];
  const usedDevices = new Set();

  for (const file of selectedFiles) {
    const rows = await loadRowsFromFile(file.fullPath);
    if (rows.length === 0) {
      reviewRows.push({
        source_device: "UNKNOWN",
        sample_id: "N/A",
        review_type: "empty_input_file",
        detail: `${file.name} has no data rows.`,
      });
      continue;
    }

    const mapping = detectMapping(file.name, rows);
    if (!mapping) {
      reviewRows.push({
        source_device: "UNKNOWN",
        sample_id: "N/A",
        review_type: "unmapped_file",
        detail: `${file.name} could not be matched to a known device mapping.`,
      });
      continue;
    }

    if (usedDevices.has(mapping.deviceKey)) {
      reviewRows.push({
        source_device: mapping.deviceKey,
        sample_id: "N/A",
        review_type: "duplicate_device_file",
        detail: `${file.name} was skipped because a newer file for device ${mapping.deviceKey} was already selected.`,
      });
      continue;
    }

    const mappedRows = mapping.sheetName
      ? await loadRowsFromFile(file.fullPath, mapping.sheetName)
      : rows;

    transformedGroups.push(transformRows(mapping.deviceKey, mappedRows, mapping.fieldMap));
    usedDevices.add(mapping.deviceKey);

    for (const [sourceColumn, standardField] of Object.entries(mapping.fieldMap)) {
      mappingLogRows.push({
        source_device: mapping.deviceKey,
        input_file: file.name,
        source_column: sourceColumn,
        standard_field: standardField,
      });
    }
  }

  if (transformedGroups.length === 0) {
    throw new Error("No mappable input files were found.");
  }

  const unifiedRows = transformedGroups.flatMap((group) => group.unifiedRows);
  const allExtraColumns = Array.from(
    new Set(transformedGroups.flatMap((group) => group.extraColumns)),
  );
  const extraRows = transformedGroups
    .flatMap((group) => group.extraRows)
    .map((row) => {
      const normalized = {
        source_device: row.source_device,
        sample_id: row.sample_id,
      };
      for (const col of allExtraColumns) {
        normalized[col] = row[col] ?? null;
      }
      return normalized;
    });

  reviewRows.push(...transformedGroups.flatMap((group) => group.reviewRows));

  if (reviewRows.length === 0) {
    reviewRows.push({
      source_device: "ALL",
      sample_id: "N/A",
      review_type: "ok",
      detail: "Selected files were merged successfully.",
    });
  }

  const workbook = Workbook.create();
  const unifiedSheet = workbook.worksheets.add("통합본");
  const extraSheet = workbook.worksheets.add("장비별추가항목");
  const logSheet = workbook.worksheets.add("매핑로그");
  const reviewSheet = workbook.worksheets.add("검토필요");

  writeSheet(unifiedSheet, unifiedRows);
  writeSheet(extraSheet, extraRows);
  writeSheet(logSheet, mappingLogRows);
  writeSheet(reviewSheet, reviewRows);

  const dateLabel = formatDateForFile(new Date());
  const outputFileName = `실험데이터_통합결과_${dateLabel}.xlsx`;
  const outputPath = path.join(args.outputDir, outputFileName);
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);

  console.log(`Merged ${transformedGroups.length} file(s).`);
  console.log(`Output: ${outputPath}`);
  console.log(
    `Inputs: ${selectedFiles.map((file) => file.name).join(", ")}`,
  );
}

await main();
