import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = process.cwd();
const samplesDir = path.join(root, "samples");
const sampleDate = "20260421";

const headerStyle = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};

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

async function buildWorkbook(fileName, sheetName, rows) {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add(sheetName);
  const colCount = rows[0].length;
  const lastCol = endColumn(colCount);
  const range = sheet.getRange(`A1:${lastCol}${rows.length}`);
  range.values = rows;
  sheet.getRange(`A1:${lastCol}1`).format = headerStyle;
  sheet.getRange(`A1:${lastCol}${rows.length}`).format.wrapText = true;
  sheet.freezePanes.freezeRows(1);
  sheet.getRange(`A1:${lastCol}${rows.length}`).format.autofitColumns();
  const out = await SpreadsheetFile.exportXlsx(workbook);
  await out.save(path.join(samplesDir, fileName));
}

await fs.mkdir(samplesDir, { recursive: true });

await fs.writeFile(
  path.join(samplesDir, `실험데이터_${sampleDate}_장비A.csv`),
  [
    "Sample No,Measured At,User,Equipment,Result,Signal,QC Score,Ambient Temp (C),Operator Note",
    "S-001,2026-04-17,Kim MJ,Analyzer-A,12.41,98.2,0.97,24.1,stable",
    "S-002,2026-04-17,Kim MJ,Analyzer-A,11.93,101.4,0.95,24.0,recheck recommended",
    "S-003,2026-04-17,Lee SH,Analyzer-A,12.88,96.7,0.92,24.3,stable",
    "S-004,2026-04-18,Lee SH,Analyzer-A,13.02,102.1,0.98,23.9,stable",
  ].join("\n"),
  "utf8",
);

await buildWorkbook(`실험데이터_${sampleDate}_장비B.xlsx`, "Device_B", [
  [
    "specimen_id",
    "run_date",
    "analyst",
    "instrument_name",
    "final_value",
    "intensity",
    "quality_index",
    "Calibration Batch",
    "Review Flag",
  ],
  ["S-001", "2026-04-17", "Park YJ", "Analyzer-B", 12.38, 99.6, 0.96, "CB-2404-A", "pass"],
  ["S-002", "2026-04-17", "Park YJ", "Analyzer-B", 11.89, 100.8, 0.94, "CB-2404-A", "check"],
  ["S-003", "2026-04-17", "Choi HM", "Analyzer-B", 12.93, 97.5, 0.93, "CB-2404-B", "pass"],
  ["S-004", "2026-04-18", "Choi HM", "Analyzer-B", 13.07, 101.6, 0.97, "CB-2404-B", "pass"],
]);

await buildWorkbook(`실험데이터_${sampleDate}_장비C.xlsx`, "Device_C", [
  [
    "sample_code",
    "test_day",
    "technician",
    "machine_id",
    "outcome_value",
    "peak_signal",
    "score_qc",
    "Reagent Lot",
    "Plate ID",
  ],
  ["S-001", "2026-04-17", "Han JR", "Analyzer-C", 12.44, 98.9, 0.95, "RL-7712", "P-01"],
  ["S-002", "2026-04-17", "Han JR", "Analyzer-C", 11.97, 101.0, 0.96, "RL-7712", "P-01"],
  ["S-003", "2026-04-17", "Seo YK", "Analyzer-C", 12.85, 96.9, 0.91, "RL-7713", "P-02"],
  ["S-004", "2026-04-18", "Seo YK", "Analyzer-C", 13.01, 102.4, 0.98, "RL-7713", "P-02"],
]);
