// ExcelJS adapter: turns the pure export model into a real .xlsx workbook.
// ExcelJS is the maintained choice (SheetJS's npm `xlsx` CVE-2023-30533 /
// GHSA-4r6v — prototype pollution & ReDoS — remains unpatched on npm).
//
// Formula safety: every cell is a literal — number cells are JS numbers
// (`cell.value` numeric, never a formula string), text cells are plain
// strings. Nothing starts with "=".

import type { Workbook, Worksheet } from "exceljs";
import type { ExportModel } from "@/lib/export-model";

export async function buildWorkbook(model: ExportModel): Promise<Uint8Array<ArrayBuffer>> {
  const mod = await import("exceljs");
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const workbook = new ExcelJS.Workbook() as Workbook;

  workbook.creator = "Sara";
  workbook.created = new Date();

  const info = workbook.addWorksheet("اطلاعات", {
    views: [{ rightToLeft: true }],
  });
  info.columns = [
    { header: "عنوان", key: "k", width: 28 },
    { header: "مقدار", key: "v", width: 44 },
  ];
  info.getRow(1).font = { bold: true };
  info.addRows([
    { k: "ساختمان", v: model.summary.building },
    { k: "تاریخ تولید گزارش", v: model.summary.generatedAtFa },
    { k: "تعداد ماه‌ها", v: model.summary.months },
    { k: "کل بدهی (تومان)", v: model.summary.totalDebt },
    { k: "موجودی صندوق (تومان)", v: model.summary.fund },
    { k: "تعداد واحدها", v: model.summary.units },
    { k: "تعداد شارژها", v: model.summary.charges },
    { k: "تعداد پرداخت‌ها", v: model.summary.payments },
    { k: "تعداد هزینه‌ها", v: model.summary.expenses },
  ]);

  for (const key of model.sheetOrder) {
    const spec = model.sheets[key];
    const sheet = workbook.addWorksheet(spec.name, {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
    });
    sheet.columns = spec.columns.map((column, index) => ({
      header: column.header,
      key: `c${index}`,
      width: column.width ?? Math.max(12, Math.min(30, column.header.length + 6)),
    }));
    styleHeader(sheet);
    for (const row of spec.rows) {
      sheet.addRow(row).eachCell(
        (cell: { numFmt?: string }, colNumber: number) => {
          if (typeof row[colNumber - 1] === "number") {
            cell.numFmt = "#,##0";
          }
        },
      );
    }
  }

  // No Node Buffer here: this runs in the BROWSER, where `Buffer` is undefined.
  // ExcelJS's writeBuffer() already resolves to an ArrayBuffer-view, so hand
  // the bytes straight to the download as a Uint8Array copy.
  const bytes = await workbook.xlsx.writeBuffer();
  return new Uint8Array(bytes as ArrayBuffer).slice();
}

function styleHeader(sheet: Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle", horizontal: "center" };
  header.height = 22;
  header.eachCell((cell: { fill?: unknown }) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAF6" } };
  });
}

/** Trigger a client-side download of the workbook bytes. */
export function downloadWorkbook(fileName: string, bytes: Uint8Array<ArrayBuffer>) {
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
