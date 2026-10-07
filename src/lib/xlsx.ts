const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function encodeUtf8(text: string) {
  return new TextEncoder().encode(text);
}

function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u16(value: number) {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, true);
  return out;
}

function u32(value: number) {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, true);
  return out;
}

function columnLetter(index: number) {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function sanitizeText(value: unknown) {
  return String(value ?? "")
    .replaceAll("₹", "Rs. ")
    .replaceAll("\u202f", " ")
    .replaceAll("\u00a0", " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
}

/** Parses "Rs. 1,13,366.19" / "₹1,13,366.19" / "32" into a number when the whole cell is numeric. */
export function parseExportNumber(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  const cleaned = String(value)
    .replace(/Rs\.?\s*/gi, "")
    .replaceAll("₹", "")
    .replaceAll(",", "")
    .trim();
  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

const MONEY_HEADER = /amount|balance|gmv|fee|paid|credit|debit|outstanding|settled|wallet|revenue|total/i;

export interface ReportWorkbook {
  sheetName: string;
  title: string;
  meta?: { label: string; value: string }[];
  summary?: { label: string; value: string | number }[];
  headers: string[];
  rows: Array<Array<string | number>>;
}

const STYLE = {
  title: 1,
  metaLabel: 2,
  metaValue: 3,
  summaryLabel: 4,
  summaryValue: 5,
  summaryMoney: 6,
  header: 7,
  text: 8,
  money: 9,
  integer: 10,
} as const;

const STYLES_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="2">` +
  `<numFmt numFmtId="164" formatCode="&quot;Rs. &quot;#,##0.00"/>` +
  `<numFmt numFmtId="165" formatCode="#,##0"/>` +
  `</numFmts>` +
  `<fonts count="5">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="18"/><color rgb="FF312E81"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>` +
  `<font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="4">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor rgb="FF4F46E5"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2FF"/><bgColor rgb="FFEEF2FF"/></patternFill></fill>` +
  `</fills>` +
  `<borders count="2">` +
  `<border><left/><right/><top/><bottom/><diagonal/></border>` +
  `<border>` +
  `<left style="thin"><color rgb="FFE2E8F0"/></left>` +
  `<right style="thin"><color rgb="FFE2E8F0"/></right>` +
  `<top style="thin"><color rgb="FFE2E8F0"/></top>` +
  `<bottom style="thin"><color rgb="FFE2E8F0"/></bottom>` +
  `<diagonal/>` +
  `</border>` +
  `</borders>` +
  `<cellStyleXfs count="1"><xf/></cellStyleXfs>` +
  `<cellXfs count="11">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyNumberFormat="1"><alignment horizontal="right" vertical="center"/></xf>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyNumberFormat="1"><alignment horizontal="right" vertical="center"/></xf>` +
  `</cellXfs>` +
  `</styleSheet>`;

class SharedStrings {
  private readonly index = new Map<string, number>();
  private readonly items: string[] = [];

  add(value: string) {
    const text = sanitizeText(value);
    const existing = this.index.get(text);
    if (existing != null) return existing;
    const next = this.items.length;
    this.index.set(text, next);
    this.items.push(text);
    return next;
  }

  xml() {
    const body = this.items
      .map((text) => {
        const space = text !== text.trim() || text.includes("  ") ? ` xml:space="preserve"` : "";
        return `<si><t${space}>${escapeXml(text)}</t></si>`;
      })
      .join("");
    return (
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.items.length}" uniqueCount="${this.items.length}">` +
      `${body}</sst>`
    );
  }
}

type Kind = "text" | "int" | "money";

function columnKind(header: string, values: Array<string | number>): Kind {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return "text";
  if (MONEY_HEADER.test(header) || nums.some((n) => !Number.isInteger(n))) return "money";
  return "int";
}

function colWidth(header: string, values: Array<string | number>, kind: Kind) {
  const samples = [header, ...values.slice(0, 40).map((v) => (typeof v === "number" ? v.toFixed(2) : sanitizeText(v)))];
  const longest = samples.reduce((max, text) => Math.max(max, text.length), 8);
  const base = kind === "money" ? 16 : kind === "int" ? 12 : Math.min(42, Math.max(14, longest + 2));
  return Math.min(48, base);
}

function cell(ref: string, style: number, value: string | number | null | undefined, sst: SharedStrings) {
  if (value == null || value === "") return `<c r="${ref}" s="${style}"/>`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" s="${style}" t="s"><v>${sst.add(String(value))}</v></c>`;
}

function rowXml(r: number, cells: string, height?: number) {
  const ht = height != null ? ` ht="${height}" customHeight="1"` : "";
  return `<row r="${r}"${ht}>${cells}</row>`;
}

function buildSheet(workbook: ReportWorkbook, sst: SharedStrings) {
  const headers = workbook.headers.length ? workbook.headers : ["Value"];
  const colCount = Math.max(headers.length, workbook.summary?.length ?? 0, 2);
  const kinds = headers.map((header, i) => columnKind(header, workbook.rows.map((row) => row[i])));
  const widths = headers.map((header, i) => colWidth(header, workbook.rows.map((row) => row[i]), kinds[i]));
  while (widths.length < colCount) widths.push(18);

  const rows: string[] = [];
  const merges: string[] = [];
  let r = 1;
  const lastCol = columnLetter(colCount - 1);

  rows.push(
    rowXml(
      r,
      Array.from({ length: colCount }, (_, c) =>
        cell(`${columnLetter(c)}${r}`, STYLE.title, c === 0 ? workbook.title : "", sst),
      ).join(""),
      24,
    ),
  );
  merges.push(`A${r}:${lastCol}${r}`);
  r += 1;
  rows.push(rowXml(r, ""));
  r += 1;

  for (const item of workbook.meta ?? []) {
    rows.push(
      rowXml(
        r,
        cell(`A${r}`, STYLE.metaLabel, item.label, sst) + cell(`B${r}`, STYLE.metaValue, item.value, sst),
        18,
      ),
    );
    r += 1;
  }

  if (workbook.summary?.length) {
    rows.push(rowXml(r, ""));
    r += 1;
    rows.push(
      rowXml(
        r,
        Array.from({ length: colCount }, (_, c) =>
          cell(`${columnLetter(c)}${r}`, STYLE.summaryLabel, c === 0 ? "SUMMARY" : "", sst),
        ).join(""),
        18,
      ),
    );
    merges.push(`A${r}:${lastCol}${r}`);
    r += 1;
    const labelRow = r;
    const valueRow = r + 1;
    let labelCells = "";
    let valueCells = "";
    workbook.summary.forEach((item, i) => {
      const col = columnLetter(i);
      const numeric = parseExportNumber(item.value);
      labelCells += cell(`${col}${labelRow}`, STYLE.summaryLabel, item.label, sst);
      valueCells += cell(
        `${col}${valueRow}`,
        numeric != null ? STYLE.summaryMoney : STYLE.summaryValue,
        numeric != null ? numeric : sanitizeText(item.value),
        sst,
      );
    });
    rows.push(rowXml(labelRow, labelCells, 18));
    rows.push(rowXml(valueRow, valueCells, 20));
    r = valueRow + 1;
  }

  rows.push(rowXml(r, ""));
  r += 1;

  const headerRow = r;
  rows.push(
    rowXml(
      r,
      headers
        .map((header, c) => cell(`${columnLetter(c)}${r}`, STYLE.header, header, sst))
        .join(""),
      20,
    ),
  );
  r += 1;

  for (const data of workbook.rows) {
    rows.push(
      rowXml(
        r,
        headers
          .map((_, c) => {
            const value = data[c];
            const kind = kinds[c];
            const style = kind === "money" ? STYLE.money : kind === "int" ? STYLE.integer : STYLE.text;
            if (typeof value === "number" && Number.isFinite(value)) {
              return cell(`${columnLetter(c)}${r}`, style, value, sst);
            }
            return cell(`${columnLetter(c)}${r}`, STYLE.text, sanitizeText(value), sst);
          })
          .join(""),
        18,
      ),
    );
    r += 1;
  }

  const lastRow = r - 1;
  const cols = widths
    .map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`)
    .join("");
  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
    : "";

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${lastCol}${Math.max(lastRow, 1)}"/>` +
    `<sheetViews><sheetView workbookViewId="0">` +
    `<pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/>` +
    `</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="16" defaultColWidth="14"/>` +
    `<cols>${cols}</cols>` +
    `<sheetData>${rows.join("")}</sheetData>` +
    mergeXml +
    `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>` +
    `<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>` +
    `</worksheet>`
  );
}

function zipStore(files: { name: string; data: Uint8Array }[]) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encodeUtf8(file.name);
    const crc = crc32(file.data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      name,
      file.data,
    ]);
    locals.push(local);
    centrals.push(
      concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(file.data.length),
        u32(file.data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }
  const central = concat(centrals);
  const eocd = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
  return concat([...locals, central, eocd]);
}

export function buildXlsxBlob(workbook: ReportWorkbook) {
  const safeName = (workbook.sheetName || workbook.title || "Report").replace(/[\\/*?:[\]]/g, " ").slice(0, 31);
  const sst = new SharedStrings();
  const sheet = buildSheet({ ...workbook, sheetName: safeName }, sst);
  const files = [
    {
      name: "[Content_Types].xml",
      data: encodeUtf8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
          `</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: encodeUtf8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      data: encodeUtf8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets><sheet name="${escapeXml(safeName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: encodeUtf8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
          `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
          `</Relationships>`,
      ),
    },
    { name: "xl/styles.xml", data: encodeUtf8(STYLES_XML) },
    { name: "xl/sharedStrings.xml", data: encodeUtf8(sst.xml()) },
    { name: "xl/worksheets/sheet1.xml", data: encodeUtf8(sheet) },
  ];
  return new Blob([zipStore(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
