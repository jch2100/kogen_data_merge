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

const deviceDefinitions = {
  A: {
    deviceKey: "A",
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

const noteHeaderStyle = {
  fill: "#D9EAF7",
  font: { bold: true, color: "#1F1F1F" },
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
    const normalizedRow = {};
    headers.forEach((header, index) => {
      normalizedRow[header] = row[index] ?? null;
    });
    return normalizedRow;
  });
}

async function loadCsvRows(fullPath) {
  const csvText = await fs.readFile(fullPath, "utf8");
  const workbook = await Workbook.fromCSV(csvText, { sheetName: "Sheet1" });
  const sheet = workbook.worksheets.getItem("Sheet1");
  return rowsFromMatrix(sheet.getUsedRange().values);
}

async function loadXlsxRows(fullPath, preferredSheetName) {
  const blob = await FileBlob.load(fullPath);
  const workbook = await SpreadsheetFile.importXlsx(blob);
  const targetSheet = preferredSheetName
    ? workbook.worksheets.getItem(preferredSheetName)
    : workbook.worksheets.items[0];
  return rowsFromMatrix(targetSheet.getUsedRange().values);
}

async function loadRowsFromFile(filePath, preferredSheetName = null) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv") return loadCsvRows(filePath);
  if (ext === ".xlsx") return loadXlsxRows(filePath, preferredSheetName);
  throw new Error(`Unsupported file type: ${filePath}`);
}

function normalizeName(value) {
  return String(value ?? "").trim().toLowerCase();
}

function detectDevice(rows) {
  const headers = Object.keys(rows[0] ?? {}).map(normalizeName);
  for (const definition of Object.values(deviceDefinitions)) {
    const sourceColumns = Object.keys(definition.fieldMap).map(normalizeName);
    const matched = sourceColumns.every((column) => headers.includes(column));
    if (matched) return definition;
  }
  return null;
}

function transformRows(sourceKey, rows, fieldMap) {
  const extraColumns = Object.keys(rows[0] ?? {}).filter((key) => !(key in fieldMap));
  const unifiedRows = [];
  const extraRows = [];
  const reviewRows = [];

  for (const row of rows) {
    const unifiedRow = { source_device: sourceKey };
    for (const field of standardFields) {
      unifiedRow[field] = null;
    }

    for (const [sourceColumn, standardField] of Object.entries(fieldMap)) {
      unifiedRow[standardField] = row[sourceColumn] ?? null;
    }

    unifiedRows.push(unifiedRow);

    const extraRow = {
      source_device: sourceKey,
      sample_id: unifiedRow.sample_id,
    };
    for (const extraColumn of extraColumns) {
      extraRow[extraColumn] = row[extraColumn] ?? null;
    }
    extraRows.push(extraRow);

    const missingStandard = standardFields.filter(
      (field) => unifiedRow[field] === null || unifiedRow[field] === "",
    );
    if (missingStandard.length > 0) {
      reviewRows.push({
        source_device: sourceKey,
        sample_id: unifiedRow.sample_id,
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

function writeTableSheet(sheet, rows) {
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

function writeReadmeSheet(sheet, args) {
  const rows = [
    ["구분", "내용"],
    ["생성 목적", "장비별 이질적인 실험 파일을 하나의 표준 워크북으로 통합"],
    ["입력 폴더", args.inputDir],
    ["출력 폴더", args.outputDir],
    ["기준 파일 수", args.latest],
    ["오늘 파일만 사용", args.todayOnly ? "예" : "아니오"],
    ["통합본", "표준 컬럼으로 정규화된 전체 실험 데이터"],
    ["장비별추가항목", "장비마다 달랐던 부가 컬럼만 별도 보관"],
    ["장비요약", "장비별 건수와 평균 결과값 요약"],
    ["매핑로그", "원본 컬럼과 표준 컬럼의 대응 관계"],
    ["검토필요", "누락 필드나 매핑 실패 여부 점검"],
  ];

  const lastCol = endColumn(rows[0].length);
  const lastRow = rows.length;
  sheet.getRange(`A1:${lastCol}${lastRow}`).values = rows;
  sheet.getRange("A1:B1").format = noteHeaderStyle;
  sheet.getRange(`A1:${lastCol}${lastRow}`).format.wrapText = true;
  sheet.getRange(`A1:${lastCol}${lastRow}`).format.autofitColumns();
}

function summarizeByDevice(unifiedRows) {
  const groups = new Map();

  for (const row of unifiedRows) {
    const key = row.source_device ?? "UNKNOWN";
    if (!groups.has(key)) {
      groups.set(key, {
        source_device: key,
        row_count: 0,
        avg_result_value: 0,
        avg_signal_strength: 0,
        avg_quality_score: 0,
      });
    }

    const target = groups.get(key);
    target.row_count += 1;
    target.avg_result_value += Number(row.result_value ?? 0);
    target.avg_signal_strength += Number(row.signal_strength ?? 0);
    target.avg_quality_score += Number(row.quality_score ?? 0);
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    avg_result_value: Number((group.avg_result_value / group.row_count).toFixed(3)),
    avg_signal_strength: Number((group.avg_signal_strength / group.row_count).toFixed(3)),
    avg_quality_score: Number((group.avg_quality_score / group.row_count).toFixed(3)),
  }));
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
    files.push({ name: entry.name, fullPath, mtime: stats.mtime });
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

    const device = detectDevice(rows);
    if (!device) {
      reviewRows.push({
        source_device: "UNKNOWN",
        sample_id: "N/A",
        review_type: "unmapped_file",
        detail: `${file.name} could not be matched to a known device mapping.`,
      });
      continue;
    }

    if (usedDevices.has(device.deviceKey)) {
      reviewRows.push({
        source_device: device.deviceKey,
        sample_id: "N/A",
        review_type: "duplicate_device_file",
        detail: `${file.name} was skipped because a newer file for device ${device.deviceKey} was already selected.`,
      });
      continue;
    }

    const mappedRows = device.sheetName
      ? await loadRowsFromFile(file.fullPath, device.sheetName)
      : rows;

    transformedGroups.push(transformRows(device.deviceKey, mappedRows, device.fieldMap));
    usedDevices.add(device.deviceKey);

    for (const [sourceColumn, standardField] of Object.entries(device.fieldMap)) {
      mappingLogRows.push({
        source_device: device.deviceKey,
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
  const summaryRows = summarizeByDevice(unifiedRows);
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
      for (const column of allExtraColumns) {
        normalized[column] = row[column] ?? null;
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
  const readmeSheet = workbook.worksheets.add("README");
  const unifiedSheet = workbook.worksheets.add("통합본");
  const extraSheet = workbook.worksheets.add("장비별추가항목");
  const summarySheet = workbook.worksheets.add("장비요약");
  const logSheet = workbook.worksheets.add("매핑로그");
  const reviewSheet = workbook.worksheets.add("검토필요");

  writeReadmeSheet(readmeSheet, args);
  writeTableSheet(unifiedSheet, unifiedRows);
  writeTableSheet(extraSheet, extraRows);
  writeTableSheet(summarySheet, summaryRows);
  writeTableSheet(logSheet, mappingLogRows);
  writeTableSheet(reviewSheet, reviewRows);

  const dateLabel = formatDateForFile(new Date());
  const outputFileName = `실험데이터_통합결과_${dateLabel}.xlsx`;
  const outputPath = path.join(args.outputDir, outputFileName);
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);

  console.log(`Merged ${transformedGroups.length} file(s).`);
  console.log(`Output: ${outputPath}`);
  console.log(`Inputs: ${selectedFiles.map((file) => file.name).join(", ")}`);
}

await main();
