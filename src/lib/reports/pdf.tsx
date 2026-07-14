import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import type { ReportTable } from "./types";

// Helvetica (the @react-pdf/renderer default) has no glyph for ₹ (U+20B9).
// DejaVu Sans does, so register it and use it everywhere instead —
// bundled under public/fonts (Bitstream Vera license, free to embed).
let fontRegistered = false;
function ensureFontRegistered() {
  if (fontRegistered) return;
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "DejaVu Sans",
    fonts: [
      { src: path.join(fontsDir, "DejaVuSans.ttf"), fontWeight: 400 },
      { src: path.join(fontsDir, "DejaVuSans-Bold.ttf"), fontWeight: 700 },
    ],
  });
  fontRegistered = true;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "DejaVu Sans", color: "#111827" },
  brand: { fontSize: 9, color: "#0f5c7a", marginBottom: 8, fontWeight: 700 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#555555", marginBottom: 14 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  summaryItem: {
    border: "1pt solid #dde3e8",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 108,
    marginRight: 8,
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 7, color: "#6b7280" },
  summaryValue: { fontSize: 11, fontWeight: 700, marginTop: 2 },
  tableRowHeader: {
    flexDirection: "row",
    backgroundColor: "#0f5c7a",
    color: "#ffffff",
    paddingVertical: 5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #e5e7eb",
    paddingVertical: 4,
  },
  tableRowEven: { backgroundColor: "#f7fafc" },
  cell: { paddingHorizontal: 4, fontSize: 8 },
  cellRight: { textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#9ca3af",
    textAlign: "center",
  },
});

function ReportDocument({ table }: { table: ReportTable }) {
  const colWidth = `${100 / Math.max(table.columns.length, 1)}%`;
  const landscape = table.columns.length > 6;

  return (
    <Document title={table.title}>
      <Page size="A4" orientation={landscape ? "landscape" : "portrait"} style={styles.page}>
        <Text style={styles.brand}>FLYING FISH SCUBA SCHOOL — OPERATIONS ERP</Text>
        <Text style={styles.title}>{table.title}</Text>
        <Text style={styles.subtitle}>{table.subtitle}</Text>

        {table.summary.length > 0 ? (
          <View style={styles.summaryRow}>
            {table.summary.map((s) => (
              <View key={s.label} style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{s.label}</Text>
                <Text style={styles.summaryValue}>{s.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View>
          <View style={styles.tableRowHeader}>
            {table.columns.map((c) => (
              <Text
                key={c.key}
                style={[styles.cell, { width: colWidth, fontWeight: 700 }, c.align === "right" ? styles.cellRight : {}]}
              >
                {c.header}
              </Text>
            ))}
          </View>
          {table.rows.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={styles.cell}>No data for this period.</Text>
            </View>
          ) : (
            table.rows.map((row, i) => (
              <View key={i} style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowEven] : [])]} wrap={false}>
                {table.columns.map((c) => (
                  <Text
                    key={c.key}
                    style={[styles.cell, { width: colWidth }, c.align === "right" ? styles.cellRight : {}]}
                  >
                    {String(row[c.key] ?? "")}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Generated ${format(table.generatedAt, "d MMM yyyy, HH:mm")} · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function renderReportPdf(table: ReportTable): Promise<Buffer> {
  ensureFontRegistered();
  return renderToBuffer(<ReportDocument table={table} />);
}
