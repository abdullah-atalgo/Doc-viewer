import { useEffect, useMemo, useRef, useState } from "react";

const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 36;
const ROW_HEADER_WIDTH = 52;
const DEFAULT_COLUMN_WIDTH = 120;
const OVERSCAN = 8;

function columnName(index) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function colorValue(color) {
  if (!color) return undefined;
  if (typeof color === "string") return color.startsWith("#") ? color : `#${color.slice(-6)}`;
  if (color.rgb) return `#${color.rgb.slice(-6)}`;
  if (color.theme !== undefined || color.indexed !== undefined) return undefined;
  return undefined;
}

function borderValue(border) {
  if (!border?.style) return undefined;
  const styles = {
    hair: "1px solid",
    thin: "1px solid",
    dotted: "1px dotted",
    dashed: "1px dashed",
    dashDot: "1px dashed",
    medium: "2px solid",
    thick: "3px solid",
    double: "3px double",
  };
  const line = styles[border.style];
  const color = colorValue(border.color) || "#C6C6CD";
  return line ? `${line} ${color}` : undefined;
}

function getCellStyle(cell) {
  const style = cell?.s;
  if (!style || typeof style !== "object") return undefined;
  const result = {};
  if (style.font?.bold) result.fontWeight = "700";
  if (style.font?.italic) result.fontStyle = "italic";
  if (style.font?.underline) result.textDecoration = "underline";
  if (style.font?.name) result.fontFamily = style.font.name;
  if (style.font?.sz) result.fontSize = `${style.font.sz}px`;
  if (style.font?.color) result.color = colorValue(style.font.color);
  if (style.fill?.fgColor) result.backgroundColor = colorValue(style.fill.fgColor);
  if (style.alignment?.horizontal) result.textAlign = style.alignment.horizontal;
  if (style.alignment?.vertical) result.verticalAlign = style.alignment.vertical;
  if (style.alignment?.wrapText) result.whiteSpace = "normal";
  const edges = ["top", "right", "bottom", "left"];
  edges.forEach((edge) => {
    const value = borderValue(style.border?.[edge]);
    if (value) result[`border${edge[0].toUpperCase()}${edge.slice(1)}`] = value;
  });
  return Object.keys(result).length ? result : undefined;
}

function formattedValue(cell, XLSX) {
  if (!cell) return "";
  if (cell.w !== undefined) return cell.w;
  if (cell.z || typeof cell.v === "number") {
    try {
      return XLSX.utils.format_cell(cell);
    } catch {
      return String(cell.v ?? "");
    }
  }
  if (cell.v !== undefined) return String(cell.v);
  return cell.f ? `=${cell.f}` : "";
}

function columnWidth(sheet, index) {
  const metadata = sheet["!cols"]?.[index];
  return Math.max(48, Math.min(640, metadata?.wpx || (metadata?.wch ? metadata.wch * 7 : DEFAULT_COLUMN_WIDTH)));
}

function lowerBound(values, target) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (values[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function makeWorkbook(XLSX, source, filename) {
  if (filename?.toLowerCase().endsWith(".csv")) {
    return XLSX.read(source, { type: "string", cellStyles: true, cellNF: true });
  }
  if (source instanceof ArrayBuffer) return XLSX.read(source, { type: "array", cellStyles: true, cellNF: true });
  if (ArrayBuffer.isView(source)) return XLSX.read(source, { type: "array", cellStyles: true, cellNF: true });
  return XLSX.read(source, { type: "array", cellStyles: true, cellNF: true });
}

export default function ExcelRenderer({ source, filename, format, onDownloadOriginal }) {
  const [workbook, setWorkbook] = useState(null);
  const [xlsxApi, setXlsxApi] = useState(null);
  const [activeSheet, setActiveSheet] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0, height: 600, width: 900 });
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const readWorkbook = async () => {
      try {
        let data = source;
        const isCsv = format === "csv" || filename?.toLowerCase().endsWith(".csv");
        if (source instanceof Blob) {
          data = isCsv
            ? await source.text()
            : await source.arrayBuffer();
        }
        if (!data) throw new Error("This workbook has no file data.");
        const XLSX = await import("xlsx");
        const nextWorkbook = makeWorkbook(XLSX, data, isCsv ? "upload.csv" : filename);
        if (!nextWorkbook.SheetNames.length) throw new Error("This workbook has no worksheets.");
        if (!cancelled) {
          setXlsxApi(XLSX);
          setWorkbook(nextWorkbook);
          setActiveSheet(nextWorkbook.SheetNames[0]);
        }
      } catch (failure) {
        if (!cancelled) setError(failure.message || "This workbook could not be opened.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    readWorkbook();
    return () => { cancelled = true; };
  }, [source, format, filename]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const updateSize = () => {
      setScrollPosition((current) => ({
        ...current,
        top: element.scrollTop,
        left: element.scrollLeft,
        height: element.clientHeight,
        width: element.clientWidth,
      }));
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [workbook, activeSheet]);

  const sheet = workbook?.Sheets[activeSheet];
  const range = useMemo(() => {
    if (!sheet) return { startRow: 0, startColumn: 0, rowCount: 0, columnCount: 0 };
    const ref = sheet["!ref"];
    if (!ref) return { startRow: 0, startColumn: 0, rowCount: 0, columnCount: 0 };
    const bounds = xlsxApi.utils.decode_range(ref);
    return {
      startRow: bounds.s.r,
      startColumn: bounds.s.c,
      rowCount: bounds.e.r - bounds.s.r + 1,
      columnCount: bounds.e.c - bounds.s.c + 1,
    };
  }, [sheet, xlsxApi]);

  const columnOffsets = useMemo(() => {
    const offsets = [0];
    for (let index = 0; index < range.columnCount; index += 1) {
      offsets.push(offsets[index] + columnWidth(sheet, range.startColumn + index));
    }
    return offsets;
  }, [range, sheet]);

  const visibleRows = useMemo(() => {
    const first = Math.max(0, Math.floor(Math.max(0, scrollPosition.top - HEADER_HEIGHT) / ROW_HEIGHT) - OVERSCAN);
    const last = Math.min(range.rowCount, Math.ceil((scrollPosition.top + scrollPosition.height) / ROW_HEIGHT) + OVERSCAN);
    return { first, last };
  }, [range.rowCount, scrollPosition]);

  const visibleColumns = useMemo(() => {
    const left = Math.max(0, scrollPosition.left - ROW_HEADER_WIDTH);
    const right = left + scrollPosition.width;
    const first = Math.max(0, lowerBound(columnOffsets, left) - OVERSCAN);
    const last = Math.min(range.columnCount, lowerBound(columnOffsets, right) + OVERSCAN);
    return { first, last };
  }, [columnOffsets, range.columnCount, scrollPosition]);

  const columns = [];
  for (let index = visibleColumns.first; index < visibleColumns.last; index += 1) {
    columns.push(range.startColumn + index);
  }
  const leftGap = columnOffsets[visibleColumns.first] || 0;
  const rightGap = (columnOffsets[range.columnCount] || 0) - (columnOffsets[visibleColumns.last] || 0);
  const gridColumns = [
    `${ROW_HEADER_WIDTH}px`,
    ...(leftGap ? [`${leftGap}px`] : []),
    ...columns.map((column) => `${columnWidth(sheet, column)}px`),
    ...(rightGap ? [`${rightGap}px`] : []),
  ].join(" ");

  const measureScroll = (event) => {
    const element = event.currentTarget;
    setScrollPosition({
      top: element.scrollTop,
      left: element.scrollLeft,
      height: element.clientHeight,
      width: element.clientWidth,
    });
  };

  if (loading || !xlsxApi) return <p className="p-8 text-center text-sm text-opsMuted" role="status">Loading workbook...</p>;
  if (error) return <p className="p-8 text-center text-sm text-opsError" role="alert">{error}</p>;
  if (!workbook) return null;

  return (
    <section className="flex h-full min-h-0 flex-col bg-opsSurfaceLow" aria-label={`Excel workbook: ${filename || "Workbook"}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-opsOutlineVariant bg-opsSurfaceContainer px-3 py-2">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto" role="tablist" aria-label="Worksheets">
          {workbook.SheetNames.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={activeSheet === name}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm ${activeSheet === name ? "border-opsSecondary font-semibold text-opsText" : "border-transparent text-opsMuted hover:bg-opsSurfaceHigh"}`}
              onClick={() => {
                setActiveSheet(name);
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({ top: 0, left: 0 });
                  setScrollPosition((current) => ({
                    ...current,
                    top: 0,
                    left: 0,
                    height: scrollRef.current.clientHeight,
                    width: scrollRef.current.clientWidth,
                  }));
                }
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-sm border border-opsOutlineVariant bg-opsSurfaceLowest px-3 py-2 text-sm font-medium text-opsText hover:bg-opsSurfaceHigh focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary"
          onClick={onDownloadOriginal}
          disabled={!onDownloadOriginal}
        >
          Download Original File
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto" onScroll={measureScroll}>
        <div
          className="relative"
          style={{ width: ROW_HEADER_WIDTH + (columnOffsets[range.columnCount] || 0), height: HEADER_HEIGHT + range.rowCount * ROW_HEIGHT }}
        >
          <div className="sticky top-0 z-20 grid border-b border-opsOutlineVariant bg-opsSurfaceContainer text-xs font-semibold text-opsText" style={{ gridTemplateColumns: gridColumns, height: HEADER_HEIGHT }}>
            <div className="sticky left-0 z-30 flex items-center justify-center border-b border-r border-opsOutlineVariant bg-opsSurfaceContainer">#</div>
            {leftGap > 0 && <div aria-hidden="true" />}
            {columns.map((column) => (
              <div key={column} className="flex items-center justify-center border-b border-r border-opsOutlineVariant bg-opsSurfaceContainer" style={{ width: columnWidth(sheet, column) }}>
                {columnName(column)}
              </div>
            ))}
            {rightGap > 0 && <div aria-hidden="true" />}
          </div>

          {Array.from({ length: visibleRows.last - visibleRows.first }, (_, offset) => {
            const rowOffset = visibleRows.first + offset;
            const worksheetRow = range.startRow + rowOffset;
            const top = HEADER_HEIGHT + rowOffset * ROW_HEIGHT;
            return (
              <div
                key={worksheetRow}
                className="absolute grid text-sm text-opsText"
                style={{ top, left: 0, right: 0, height: ROW_HEIGHT, gridTemplateColumns: gridColumns }}
              >
                <div className="sticky left-0 z-10 flex items-center justify-center border-b border-r border-opsOutlineVariant bg-opsSurfaceLow text-xs text-opsMuted">
                  {worksheetRow + 1}
                </div>
                {leftGap > 0 && <div aria-hidden="true" />}
                {columns.map((column) => {
                  const address = xlsxApi.utils.encode_cell({ r: worksheetRow, c: column });
                  const cell = sheet[address];
                  return (
                    <div
                      key={address}
                      className="overflow-hidden border-b border-r border-opsOutlineVariant bg-opsSurfaceLowest px-2 py-1"
                      style={{ width: columnWidth(sheet, column), height: ROW_HEIGHT, ...getCellStyle(cell) }}
                      title={formattedValue(cell, xlsxApi)}
                    >
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{formattedValue(cell, xlsxApi)}</span>
                    </div>
                  );
                })}
                {rightGap > 0 && <div aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="shrink-0 border-t border-opsOutlineVariant bg-opsSurfaceContainer px-3 py-1.5 text-xs text-opsMuted" aria-live="polite">
        {range.rowCount} rows · {range.columnCount} columns · {activeSheet}
      </div>
    </section>
  );
}
