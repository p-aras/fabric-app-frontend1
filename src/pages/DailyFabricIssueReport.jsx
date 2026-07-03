import { useState, useEffect, useMemo } from 'react';
import { store } from '../store.js';
import {
  Calendar, Search, Download, RefreshCw, FileText,
  Layers, Scale, Tag, Scissors
} from 'lucide-react';
import * as XLSX from "xlsx-js-style";
import { jsPDF } from 'jspdf';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie, Legend, ComposedChart, Line, LineChart
} from 'recharts';

const CHART_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

// Custom Glassmorphic Tooltip for Professional Graphs
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '10px 14px',
        borderRadius: '8px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        color: '#fff',
        fontSize: '11px',
        fontFamily: 'inherit'
      }}>
        <p style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color || entry.fill, display: 'inline-block' }} />
            <span style={{ color: '#cbd5e1' }}>{entry.name}:</span>
            <span style={{ fontWeight: 800, color: '#f8fafc' }}>
              {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              {entry.name.toLowerCase().includes('weight') ? ' KG' : ' Roll(s)'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DailyFabricIssueReport() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await store.getDailyFabricIssuanceReport(startDate, endDate);
      if (response && response.success) {
        setReportData(response.data || []);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error("Error loading daily fabric issue report:", err);
      alert("Failed to load report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  // General Text Filtering
  const filteredData = useMemo(() => {
    return reportData.filter(item => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        String(item.tableNumber).toLowerCase().includes(q) ||
        String(item.fabric).toLowerCase().includes(q) ||
        String(item.lotNumber).toLowerCase().includes(q) ||
        String(item.jobOrderNo).toLowerCase().includes(q) ||
        String(item.shade).toLowerCase().includes(q) ||
        String(item.issuedBy).toLowerCase().includes(q)
      );
    });
  }, [reportData, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    return filteredData.reduce((acc, curr) => {
      acc.totalRolls += curr.rolls || 0;
      acc.totalWeight += curr.weight || 0;
      acc.uniqueLots.add(curr.lotNumber);
      acc.activeTables.add(curr.tableNumber);
      acc.uniqueFabrics.add(curr.fabric);
      return acc;
    }, {
      totalRolls: 0,
      totalWeight: 0,
      uniqueLots: new Set(),
      activeTables: new Set(),
      uniqueFabrics: new Set()
    });
  }, [filteredData]);

  // Aggregation 1: Table-wise Issuance Summary
  const tableSummary = useMemo(() => {
    const summaryMap = {};
    filteredData.forEach(item => {
      const tbl = item.tableNumber || 'N/A';
      if (!summaryMap[tbl]) {
        summaryMap[tbl] = { name: tbl, rolls: 0, weight: 0, lots: new Set() };
      }
      summaryMap[tbl].rolls += item.rolls || 0;
      summaryMap[tbl].weight += item.weight || 0;
      summaryMap[tbl].lots.add(item.lotNumber);
    });

    return Object.values(summaryMap)
      .map(item => ({
        ...item,
        uniqueLotsCount: item.lots.size,
        percentage: stats.totalRolls > 0 ? Math.round((item.rolls / stats.totalRolls) * 100) : 0
      }))
      .sort((a, b) => b.rolls - a.rolls);
  }, [filteredData, stats.totalRolls]);

  // Aggregation 2: Fabric-wise Summary
  const fabricSummary = useMemo(() => {
    const summaryMap = {};
    filteredData.forEach(item => {
      const fab = item.fabric || '—';
      if (!summaryMap[fab]) {
        summaryMap[fab] = { name: fab, rolls: 0, weight: 0, lots: new Set(), shades: new Set() };
      }
      summaryMap[fab].rolls += item.rolls || 0;
      summaryMap[fab].weight += item.weight || 0;
      summaryMap[fab].lots.add(item.lotNumber);
      summaryMap[fab].shades.add(item.shade);
    });

    return Object.values(summaryMap)
      .map(item => ({
        ...item,
        uniqueLotsCount: item.lots.size,
        uniqueShadesCount: item.shades.size,
        percentage: stats.totalRolls > 0 ? Math.round((item.rolls / stats.totalRolls) * 100) : 0
      }))
      .sort((a, b) => b.rolls - a.rolls);
  }, [filteredData, stats.totalRolls]);

  // Aggregation 3: Daily Issuance Trend
  const trendChartData = useMemo(() => {
    const dailyMap = {};
    filteredData.forEach(item => {
      const date = item.date || 'No Date';
      if (!dailyMap[date]) {
        dailyMap[date] = { date, rolls: 0, weight: 0 };
      }
      dailyMap[date].rolls += item.rolls || 0;
      dailyMap[date].weight += item.weight || 0;
    });
    return Object.values(dailyMap)
      .map(item => ({
        ...item,
        formattedDate: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // Chart 1: Table-wise Composed Data (rolls and weight combined)
  const tableChartData = useMemo(() => {
    return tableSummary.map(item => ({
      name: item.name,
      rolls: item.rolls,
      weight: item.weight
    }));
  }, [tableSummary]);

  // Chart 2: Fabric-wise (Top 6)
  const fabricChartData = useMemo(() => {
    const data = fabricSummary.map(item => ({
      name: item.name.length > 20 ? item.name.slice(0, 18) + '...' : item.name,
      value: item.rolls
    }));
    if (data.length <= 6) return data;
    const top = data.slice(0, 5);
    const otherRolls = data.slice(5).reduce((acc, curr) => acc + curr.value, 0);
    top.push({ name: 'Other Fabrics', value: otherRolls });
    return top;
  }, [fabricSummary]);

  // Excel exporter (Multi-sheet summary with lot list)
  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const tableData = tableSummary.map((item, idx) => ({
      "SR": idx + 1,
      "Table Name": item.name,
      "Lot Number(s)": Array.from(item.lots).sort().join(', '),
      "Total Rolls Issued": item.rolls,
      "Total Weight Issued (KG)": parseFloat(item.weight.toFixed(2)),
      "Unique Lots Count": item.uniqueLotsCount,
      "Roll Share (%)": `${item.percentage}%`
    }));

    const fabricData = fabricSummary.map((item, idx) => ({
      "SR": idx + 1,
      "Fabric Description": item.name,
      "Lot Number(s)": Array.from(item.lots).sort().join(', '),
      "Total Rolls Issued": item.rolls,
      "Total Weight Issued (KG)": parseFloat(item.weight.toFixed(2)),
      "Unique Lots Count": item.uniqueLotsCount,
      "Unique Shades Count": item.uniqueShadesCount,
      "Roll Share (%)": `${item.percentage}%`
    }));

    const wb = XLSX.utils.book_new();

    // Sheet 1: Table Summary
    const wsTable = XLSX.utils.json_to_sheet(tableData);
    let range = XLSX.utils.decode_range(wsTable['!ref']);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c });
      if (wsTable[headerCell]) {
        wsTable[headerCell].s = {
          fill: { fgColor: { rgb: "334155" } }, // Slate-700
          font: { bold: true, color: { rgb: "FFFFFF" }, name: "Calibri", sz: 11 },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    }
    wsTable['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 25 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsTable, "Table-wise Summary");

    // Sheet 2: Fabric Summary
    const wsFabric = XLSX.utils.json_to_sheet(fabricData);
    range = XLSX.utils.decode_range(wsFabric['!ref']);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c });
      if (wsFabric[headerCell]) {
        wsFabric[headerCell].s = {
          fill: { fgColor: { rgb: "475569" } }, // Slate-600
          font: { bold: true, color: { rgb: "FFFFFF" }, name: "Calibri", sz: 11 },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    }
    wsFabric['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 25 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsFabric, "Fabric-wise Summary");

    XLSX.writeFile(wb, `Daily_Fabric_Issue_Summary_${startDate}_to_${endDate}.xlsx`);
  };

  // PDF exporter (Grayscale / Professional Layout)
  const exportToPdf = () => {
    if (filteredData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4"
    });

    const PAGE_W = doc.internal.pageSize.getWidth();
    const PAGE_H = doc.internal.pageSize.getHeight();
    const M = 40; // Margin
    let y = 50;

    const setFont = (style, size) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
    };

    // Header Title
    setFont("bold", 15);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("DAILY FABRIC ISSUANCE ANALYSIS", M, y);
    y += 18;

    // Date range
    setFont("normal", 9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Reporting Period: ${startDate} to ${endDate}  |  Generated: ${new Date().toLocaleDateString()}`, M, y);
    y += 15;

    // Elegant thin black separator line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1);
    doc.line(M, y, PAGE_W - M, y);
    y += 20;

    // Grayscale Summary Box
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.rect(M, y, PAGE_W - 2 * M, 45);

    setFont("bold", 8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("TOTAL ROLLS ISSUED", M + 20, y + 18);
    doc.text("TOTAL WEIGHT ISSUED", M + 150, y + 18);
    doc.text("ENGAGED TABLES", M + 280, y + 18);
    doc.text("UNIQUE FABRIC TYPES", M + 400, y + 18);

    setFont("bold", 12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${stats.totalRolls}`, M + 20, y + 34);
    doc.text(`${stats.totalWeight.toFixed(1)} kg`, M + 150, y + 34);
    doc.text(`${stats.activeTables.size}`, M + 280, y + 34);
    doc.text(`${stats.uniqueFabrics.size}`, M + 400, y + 34);
    y += 70;

    // ── SECTION 1: CUTTING TABLE SUMMARY ──────────────────────────────────
    setFont("bold", 11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("1. Cutting Table Summary", M, y);
    y += 12;

    const tHeaders = ["Table", "Lot Numbers", "Rolls", "Weight (KG)", "Share (%)"];
    const tColWidths = [100, 180, 60, 100, 75];
    let tTotalW = tColWidths.reduce((a, b) => a + b, 0);

    // Thick border above table header
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.5);
    doc.line(M, y, M + tTotalW, y);

    setFont("bold", 9);
    doc.setTextColor(15, 23, 42);
    let tx = M;
    tHeaders.forEach((h, idx) => {
      const align = (idx === 2 || idx === 3 || idx === 4) ? "right" : "left";
      const offset = align === "right" ? tColWidths[idx] - 10 : 10;
      doc.text(h, tx + offset, y + 14, { align });
      tx += tColWidths[idx];
    });

    // Divider line underneath headers
    doc.setLineWidth(0.75);
    doc.line(M, y + 20, M + tTotalW, y + 20);
    y += 20;

    setFont("normal", 8.5);
    doc.setTextColor(51, 65, 85);
    tableSummary.forEach((item) => {
      const lotsStr = Array.from(item.lots).sort().join(', ');
      const truncatedLots = lotsStr.length > 38 ? lotsStr.slice(0, 35) + '...' : lotsStr;

      let rx = M;
      doc.text(item.name, rx + 10, y + 11); rx += tColWidths[0];
      doc.text(truncatedLots, rx + 10, y + 11); rx += tColWidths[1];
      doc.text(String(item.rolls), rx + tColWidths[2] - 10, y + 11, { align: "right" }); rx += tColWidths[2];
      doc.text(item.weight.toFixed(1), rx + tColWidths[3] - 10, y + 11, { align: "right" }); rx += tColWidths[3];
      doc.text(`${item.percentage}%`, rx + tColWidths[4] - 10, y + 11, { align: "right" });

      y += 16;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(M, y, M + tTotalW, y);
    });

    // Table bottom border
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1);
    doc.line(M, y, M + tTotalW, y);
    y += 35;

    // ── SECTION 2: FABRIC TYPE SUMMARY ────────────────────────────────────
    if (y + 160 > PAGE_H) {
      doc.addPage();
      y = 50;
    }

    setFont("bold", 11);
    doc.setTextColor(30, 41, 59);
    doc.text("2. Fabric Description Summary", M, y);
    y += 12;

    const fHeaders = ["Fabric Description", "Lot Numbers", "Rolls", "Weight (KG)", "Share (%)"];
    const fColWidths = [120, 150, 60, 100, 75];
    let fTotalW = fColWidths.reduce((a, b) => a + b, 0);

    // Thick border above table header
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.5);
    doc.line(M, y, M + fTotalW, y);

    setFont("bold", 9);
    doc.setTextColor(15, 23, 42);
    tx = M;
    fHeaders.forEach((h, idx) => {
      const align = (idx === 2 || idx === 3 || idx === 4) ? "right" : "left";
      const offset = align === "right" ? fColWidths[idx] - 10 : 10;
      doc.text(h, tx + offset, y + 14, { align });
      tx += fColWidths[idx];
    });

    // Divider line underneath headers
    doc.setLineWidth(0.75);
    doc.line(M, y + 20, M + fTotalW, y + 20);
    y += 20;

    setFont("normal", 8.5);
    doc.setTextColor(51, 65, 85);
    fabricSummary.forEach((item) => {
      if (y + 20 > PAGE_H - 40) {
        doc.addPage();
        y = 50;
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(1.5);
        doc.line(M, y, M + fTotalW, y);

        setFont("bold", 9);
        doc.setTextColor(15, 23, 42);
        let tfx = M;
        fHeaders.forEach((h, fIdx) => {
          const align = (fIdx === 2 || fIdx === 3 || fIdx === 4) ? "right" : "left";
          const offset = align === "right" ? fColWidths[fIdx] - 10 : 10;
          doc.text(h, tfx + offset, y + 14, { align });
          tfx += fColWidths[fIdx];
        });
        y += 20;
        setFont("normal", 8.5);
        doc.setTextColor(51, 65, 85);
      }

      const lotsStr = Array.from(item.lots).sort().join(', ');
      const truncatedLots = lotsStr.length > 32 ? lotsStr.slice(0, 29) + '...' : lotsStr;

      let rx = M;
      doc.text(item.name.length > 25 ? item.name.slice(0, 22) + '...' : item.name, rx + 10, y + 11); rx += fColWidths[0];
      doc.text(truncatedLots, rx + 10, y + 11); rx += fColWidths[1];
      doc.text(String(item.rolls), rx + fColWidths[2] - 10, y + 11, { align: "right" }); rx += fColWidths[2];
      doc.text(item.weight.toFixed(1), rx + fColWidths[3] - 10, y + 11, { align: "right" }); rx += fColWidths[3];
      doc.text(`${item.percentage}%`, rx + fColWidths[4] - 10, y + 11, { align: "right" });

      y += 16;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(M, y, M + fTotalW, y);
    });

    // Table bottom border
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1);
    doc.line(M, y, M + fTotalW, y);

    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      setFont("italic", 8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Daily Fabric Issuance Analysis  |  Page ${p} of ${pages}`, M, PAGE_H - 20);
    }

    doc.save(`Daily_Fabric_Issue_Summary_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Styles Injection for clean White & Royal Blue theme, glassmorphic filters, animations and glow */}
      <style>{`
        .gradient-title {
          background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 900;
          letter-spacing: -0.8px;
        }
        
        .premium-card {
          background: #ffffff !important;
          border: 1px solid rgba(37, 99, 235, 0.12) !important;
          box-shadow: 0 4px 20px -2px rgba(37, 99, 235, 0.04) !important;
          border-radius: 12px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .premium-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -5px rgba(37, 99, 235, 0.1) !important;
          border-color: rgba(37, 99, 235, 0.25) !important;
        }

        .kpi-card-glow {
          position: relative;
          overflow: hidden;
        }

        .kpi-card-glow::before {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 4px; height: 100%;
        }
        
        .kpi-purple::before { background: #2563eb; }
        .kpi-emerald::before { background: #3b82f6; }
        .kpi-amber::before { background: #1d4ed8; }
        .kpi-sky::before { background: #60a5fa; }

        .glow-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          transition: transform 0.4s ease;
        }

        .premium-card:hover .glow-icon-box {
          transform: scale(1.1) rotate(4deg);
        }

        .custom-gradient-progress {
          background: linear-gradient(90deg, #2563eb 0%, #60a5fa 100%) !important;
        }

        .lot-pill {
          font-size: 9.5px;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 750;
          letter-spacing: 0.2px;
          transition: all 0.2s ease;
          cursor: default;
        }

        .lot-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.12);
        }

        /* High Visibility Solid Borders for Tables */
        .custom-table-bordered {
          border-collapse: collapse !important;
          width: 100% !important;
          border: 2px solid #94a3b8 !important;
        }

        .custom-table-bordered th {
          background: #e2e8f0 !important;
          color: #0f172a !important;
          font-weight: 850 !important;
          border: 1px solid #94a3b8 !important;
          padding: 12px 14px !important;
          font-size: 11px !important;
        }

        .custom-table-bordered td {
          color: #0f172a !important;
          font-weight: 600 !important;
          border: 1px solid #94a3b8 !important;
          padding: 12px 14px !important;
          background: #ffffff !important;
        }

        .custom-table-bordered tr:nth-child(even) td {
          background: #f8fafc !important;
        }

        .custom-table-bordered tr:hover td {
          background: rgba(37, 99, 235, 0.05) !important;
        }

        .modern-select-input {
          border-radius: 8px !important;
          border: 1.5px solid #94a3b8 !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-weight: 600 !important;
          transition: all 0.2s ease;
          padding: 8px 12px !important;
        }

        .modern-select-input:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
        }

        @keyframes progress-pulsate {
          0% { opacity: 0.95; }
          50% { opacity: 1; }
          100% { opacity: 0.95; }
        }
      `}</style>

      {/* Header Panel */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-title-block">
          <div className="breadcrumb" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#0f172a', fontWeight: 700 }}>
            <span>Home</span><span>/</span><span>Reports</span>
          </div>
          <h1 className="gradient-title" style={{ fontSize: '28px', marginTop: '6px' }}>Daily Fabric Issue Analytics</h1>
          <p style={{ color: '#0f172a', fontSize: '14px', marginTop: '4px', fontWeight: 650 }}>
            Visual distribution matrix mapping overall volume and weights across tables & fabric styles.
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportToExcel} disabled={loading || filteredData.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, borderRadius: 10, border: '2px solid #2563eb', color: '#2563eb', fontWeight: 750, background: '#ffffff' }}>
            <Download size={14} /> Export Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportToPdf} disabled={loading || filteredData.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, borderRadius: 10, background: '#2563eb', border: '1px solid #2563eb', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.2)', fontWeight: 750 }}>
            <FileText size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Glassmorphic Filter Card */}
      <div className="card premium-card" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', padding: '18px 20px' }}>
          
          {/* Start Date */}
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Start Date</label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                className="input modern-select-input"
                style={{ width: '100%', paddingLeft: 34 }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <Calendar size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#2563eb' }} />
            </div>
          </div>

          {/* End Date */}
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>End Date</label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                className="input modern-select-input"
                style={{ width: '100%', paddingLeft: 34 }}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
              <Calendar size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#2563eb' }} />
            </div>
          </div>

          {/* Text Search */}
          <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Search Filter</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input modern-select-input"
                placeholder="Search summaries by lot, shade, fabric name..."
                style={{ width: '100%', paddingLeft: 36 }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#0f172a' }} />
            </div>
          </div>

          {/* Refresh Action */}
          <div>
            <button className="btn btn-secondary" onClick={fetchReport} title="Reload Data" style={{ height: 38, width: 38, padding: 0, display: 'flex', alignItems: 'center', justify: 'center', borderRadius: 10, border: '2px solid #2563eb', background: 'white' }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} style={{ color: '#2563eb', strokeWidth: 2.5 }} />
            </button>
          </div>

        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-4" style={{ gap: 20 }}>
        {/* KPI 1 */}
        <div className="card premium-card kpi-card-glow kpi-purple">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
            <div className="glow-icon-box" style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}>
              <Scissors size={22} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#0f172a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Issued Rolls</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 2, letterSpacing: '-0.5px' }}>{stats.totalRolls}</div>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="card premium-card kpi-card-glow kpi-emerald">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
            <div className="glow-icon-box" style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}>
              <Scale size={22} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#0f172a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Weight</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 2, letterSpacing: '-0.5px' }}>
                {stats.totalWeight.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 650, color: '#0f172a' }}>KG</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="card premium-card kpi-card-glow kpi-amber">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
            <div className="glow-icon-box" style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#0f172a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Unique Lots</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 2, letterSpacing: '-0.5px' }}>{stats.uniqueLots.size}</div>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="card premium-card kpi-card-glow kpi-sky">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
            <div className="glow-icon-box" style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}>
              <Tag size={22} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#0f172a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Cutting Tables</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 2, letterSpacing: '-0.5px' }}>{stats.activeTables.size}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern High-Quality Chart 1: Daily Issuance Trend (Area Chart) */}
      {filteredData.length > 0 && (
        <div className="card premium-card" style={{ overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 14, background: '#2563eb', borderRadius: 2 }} />
              <div style={{ fontSize: '13px', fontWeight: 850, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Issuance Volume & Weight Trend</div>
            </div>
            <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 800 }}>Daily Performance Curve</span>
          </div>
          <div className="card-body" style={{ padding: '24px 20px 10px 10px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                <XAxis dataKey="formattedDate" tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 700 }} />
                <YAxis yAxisId="left" label={{ value: 'Rolls', angle: -90, position: 'insideLeft', offset: -5, fill: '#0f172a', fontSize: 10, fontWeight: 800 }} tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 700 }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Weight (KG)', angle: 90, position: 'insideRight', offset: -5, fill: '#0f172a', fontSize: 10, fontWeight: 800 }} tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 700 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 750, color: '#0f172a' }} />
                <Line yAxisId="left" type="monotone" dataKey="rolls" name="Rolls Issued" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, stroke: '#2563eb', strokeWidth: 1 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="weight" name="Weight (KG)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, stroke: '#10b981', strokeWidth: 1 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Aggregated Summaries (Dual Cards side-by-side with proper borders) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
        
        {/* Table-wise Summary Card */}
        <div className="card premium-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '2px solid #cbd5e1', background: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 14, background: '#2563eb', borderRadius: 2 }} />
            <div style={{ fontSize: '13px', fontWeight: 850, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Table-wise Summary</div>
          </div>
          <div className="card-body" style={{ padding: 16 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : tableSummary.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#0f172a', fontSize: 13 }}>No records found.</div>
            ) : (
              <div className="table-wrap" style={{ border: 'none' }}>
                <table className="custom-table-bordered">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Table</th>
                      <th style={{ textAlign: 'left' }}>Lot Numbers</th>
                      <th style={{ textAlign: 'right' }}>Rolls</th>
                      <th style={{ textAlign: 'right' }}>Weight (KG)</th>
                      <th style={{ textAlign: 'center' }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableSummary.map(item => (
                      <tr key={item.name}>
                        <td style={{ fontWeight: 800 }}>
                          <span style={{ fontSize: '12px', color: '#1e3a8a' }}>
                            {item.name}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: '170px' }}>
                            {Array.from(item.lots).sort().map(lot => (
                              <span key={lot} className="lot-pill" style={{ background: '#dbeafe', color: '#1e40af', border: '1.5px solid #3b82f6' }}>
                                {lot}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: 900, textAlign: 'right', fontSize: '13px' }}>{item.rolls}</td>
                        <td style={{ fontWeight: 900, textAlign: 'right', fontSize: '13px', color: '#10b981' }}>{item.weight.toFixed(1)}</td>
                        <td style={{ width: '100px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                            <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div className="custom-gradient-progress" style={{ width: `${item.percentage}%`, height: '100%', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>{item.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Fabric-wise Summary Card */}
        <div className="card premium-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '2px solid #cbd5e1', background: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 14, background: '#2563eb', borderRadius: 2 }} />
            <div style={{ fontSize: '13px', fontWeight: 850, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fabric-wise Summary</div>
          </div>
          <div className="card-body" style={{ padding: 16 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : fabricSummary.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#0f172a', fontSize: 13 }}>No fabric records found.</div>
            ) : (
              <div className="table-wrap" style={{ border: 'none' }}>
                <table className="custom-table-bordered">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Fabric Description</th>
                      <th style={{ textAlign: 'left' }}>Lot Numbers</th>
                      <th style={{ textAlign: 'right' }}>Rolls</th>
                      <th style={{ textAlign: 'right' }}>Weight (KG)</th>
                      <th style={{ textAlign: 'center' }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fabricSummary.map(item => (
                      <tr key={item.name}>
                        <td style={{ fontWeight: 850, maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                          {item.name}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: '170px' }}>
                            {Array.from(item.lots).sort().map(lot => (
                              <span key={lot} className="lot-pill" style={{ background: '#dbeafe', color: '#1e40af', border: '1.5px solid #3b82f6' }}>
                                {lot}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: 900, textAlign: 'right', fontSize: '13px' }}>{item.rolls}</td>
                        <td style={{ fontWeight: 900, textAlign: 'right', fontSize: '13px', color: '#10b981' }}>{item.weight.toFixed(1)}</td>
                        <td style={{ width: '100px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                            <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div className="custom-gradient-progress" style={{ width: `${item.percentage}%`, height: '100%', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>{item.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Sub-Charts Section: Table ComposedChart + Fabric Doughnut Chart */}
      {filteredData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
          
          {/* Chart 2: Table-wise Composed Chart (Vibrant Bars + curved Line overlay) */}
          <div className="card premium-card" style={{ overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              <div className="card-title" style={{ fontSize: '13px', fontWeight: 850, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.5px' }}>Table Performance (Rolls & Weights)</div>
            </div>
            <div className="card-body" style={{ padding: '20px 10px 10px 10px' }}>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={tableChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 700 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 700 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 700 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.02)' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 750 }} />
                  <Bar yAxisId="left" dataKey="rolls" name="Rolls Issued" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {tableChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="weight" name="Weight (KG)" stroke="#e11d48" strokeWidth={3} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Fabric-wise Doughnut (Pie) Chart (Colorful Slices) */}
          <div className="card premium-card" style={{ overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              <div className="card-title" style={{ fontSize: '13px', fontWeight: 850, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.5px' }}>Fabric Share Ratio</div>
            </div>
            <div className="card-body" style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ flex: 1.2, height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fabricChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {fabricChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="#ffffff" strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom aligned side legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 12 }}>
                {fabricChartData.map((entry, idx) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '11px', fontWeight: 700 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[idx % CHART_COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }} title={entry.name}>
                      {entry.name}
                    </span>
                    <span style={{ color: '#475569', marginLeft: 'auto' }}>({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
