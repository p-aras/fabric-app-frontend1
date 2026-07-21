import { useState, useEffect } from 'react';
import { store } from '../store.js';
import {
  Calendar, Search, Download, RefreshCw, FileText,
  Layers, Scale, Tag, Ruler
} from 'lucide-react';
import * as XLSX from "xlsx-js-style";
import { jsPDF } from 'jspdf';

export default function DailyInventoryQuantity() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [oldRollsFilter, setOldRollsFilter] = useState('all'); // 'all', 'skip', 'only'

  const fetchReport = async (dateStr) => {
    setLoading(true);
    try {
      const response = await store.getDailyInventoryReport(dateStr);
      if (response && response.success) {
        const mappedData = (response.data || []).map(item => ({
          ...item,
          rolls: 1
        }));
        setReportData(mappedData);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error("Error loading daily inventory quantity report:", err);
      alert("Failed to load report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate]);

  // Filtered rows matching search term and old rolls filter
  const filteredData = reportData.filter(item => {
    // 1. Search filter
    const q = searchTerm.toLowerCase().trim();
    if (q) {
      const matchSearch = (
        String(item.barcode).toLowerCase().includes(q) ||
        String(item.name).toLowerCase().includes(q) ||
        String(item.shade).toLowerCase().includes(q) ||
        String(item.lotNo).toLowerCase().includes(q) ||
        String(item.type).toLowerCase().includes(q)
      );
      if (!matchSearch) return false;
    }

    // 2. Old rolls filter (barcodes starting with '9')
    const barcodeStr = String(item.barcode || '').trim();
    const startsWith9 = barcodeStr.startsWith('9');
    if (oldRollsFilter === 'skip') {
      return !startsWith9;
    } else if (oldRollsFilter === 'only') {
      return startsWith9;
    }

    return true;
  });

  // Calculate statistics
  const stats = filteredData.reduce((acc, curr) => {
    const isMtr = String(curr.unit || '').toUpperCase() === 'MTR';
    if (!isMtr) {
      acc.totalWeight += curr.weight || 0;
      if (curr.type === 'Material') {
        acc.materialWeight += curr.weight || 0;
      } else {
        acc.dyeingWeight += curr.weight || 0;
      }
    } else {
      acc.totalMeters += curr.weight || 0;
    }
    acc.totalRolls += curr.rolls || 0;
    if (curr.type === 'Material') {
      acc.materialRolls += curr.rolls || 0;
    } else {
      acc.dyeingRolls += curr.rolls || 0;
    }
    return acc;
  }, { totalWeight: 0, totalRolls: 0, materialRolls: 0, dyeingRolls: 0, totalMeters: 0, materialWeight: 0, dyeingWeight: 0 });

  // Export to Excel
  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const data = filteredData.map((item, idx) => ({
      "SR": idx + 1,
      "Barcode ID": item.barcode,
      "Type": item.type,
      "Item Description": item.name,
      "Shade": item.shade,
      "Lot Number": item.lotNo,
      "Location": item.location,
      "Quantity": item.weight,
      "Unit": item.unit || "Roll",
      "Rolls": item.rolls
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Apply basic header styling
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[headerCell]) {
        ws[headerCell].s = {
          fill: { fgColor: { rgb: "5F3DC4" } }, // brand primary
          font: { bold: true, color: { rgb: "FFFFFF" }, name: "Calibri", sz: 11 },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    }

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // SR
      { wch: 16 }, // Barcode ID
      { wch: 16 }, // Type
      { wch: 32 }, // Item Description
      { wch: 15 }, // Shade
      { wch: 15 }, // Lot Number
      { wch: 15 }, // Location
      { wch: 12 }, // Weight
      { wch: 10 }  // Rolls
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Inventory Report");
    XLSX.writeFile(wb, `Daily_Inventory_Quantity_${selectedDate}.xlsx`);
  };

  const getTodayAttendanceText = async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let hodsPresent = 0;
    let supervisorsPresent = 0;
    let helpersPresent = 0;
    const absentees = [];

    const safeParseJSON = (val) => {
      if (!val) return [];
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch (e) { return []; }
    };

    try {
      const attRes = await store.getAttendance(todayStr);
      if (attRes && attRes.success && attRes.data) {
        attRes.data.forEach(record => {
          const recordHods = safeParseJSON(record.hods);
          const recordSups = safeParseJSON(record.supervisors);
          const recordHelpers = safeParseJSON(record.helpers);

          recordHods.forEach(h => {
            if (h.status === 'Present' || h.status === 'Half Day') {
              hodsPresent++;
            } else if (h.status === 'Absent') {
              absentees.push(`${h.name} (HOD)`);
            }
          });

          recordSups.forEach(s => {
            if (s.status === 'Present' || s.status === 'Half Day') {
              supervisorsPresent++;
            } else if (s.status === 'Absent') {
              absentees.push(`${s.name} (Supervisor)`);
            }
          });

          recordHelpers.forEach(hp => {
            if (hp.status === 'Present' || hp.status === 'Half Day') {
              helpersPresent++;
            } else if (hp.status === 'Absent') {
              absentees.push(`${hp.name} (Helper)`);
            }
          });
        });
      }
    } catch (e) {
      console.error("Failed to load today's attendance for PDF:", e);
    }

    const uniqueAbsentees = [...new Set(absentees)];

    return {
      summary: `HODs Present: ${hodsPresent} | Supervisors Present: ${supervisorsPresent} | Helpers Present: ${helpersPresent}`,
      absenteesText: uniqueAbsentees.length > 0 ? `Absentees: ${uniqueAbsentees.join(', ')}` : "Absentees: None"
    };
  };

  // Export to PDF Summary (Black & White Report Casing)
  const exportToPdf = async () => {
    if (filteredData.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Fetch today's attendance
    const attData = await getTodayAttendanceText();

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4"
    });

    const PAGE_W = doc.internal.pageSize.getWidth();
    const PAGE_H = doc.internal.pageSize.getHeight();
    const M = 30; // Margins
    let y = 35;

    // Helper functions
    const setFont = (style, size) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
    };

    // Draw page border
    const drawPageBorder = () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.2);
      doc.rect(M - 10, 15, PAGE_W - 2 * (M - 10), PAGE_H - 30);
    };

    // Draw border on first page
    drawPageBorder();

    // --- Header Block (Pure Black & White) ---
    doc.setTextColor(0, 0, 0);
    setFont("bold", 14);
    doc.text("DAILY INVENTORY SUMMARY REPORT", M + 15, y + 15);

    setFont("normal", 9);
    doc.text(`Date: ${selectedDate}  |  Generated on: ${new Date().toLocaleString()}`, M + 15, y + 29);

    // Right Side - Today's Attendance Block
    setFont("bold", 8);
    doc.text("TODAY'S ATTENDANCE SUMMARY", PAGE_W - M - 230, y + 10);
    setFont("normal", 7.5);
    doc.text(attData.summary, PAGE_W - M - 230, y + 21);
    doc.text(attData.absenteesText, PAGE_W - M - 230, y + 31);

    // Header underline divider
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(M, y + 39, PAGE_W - M, y + 39);

    y += 54;

    // --- Table Column Settings ---
    const headers = [
      { label: "SR", w: 30, align: "center" },
      { label: "Barcode ID", w: 75, align: "left" },
      { label: "Type", w: 75, align: "left" },
      { label: "Fabric Description", w: 155, align: "left" },
      { label: "Shade", w: 80, align: "left" },
      { label: "Lot No", w: 60, align: "left" },
      { label: "Qty", w: 55, align: "right" },
      { label: "Unit", w: 45, align: "center" }
    ];

    const totalTableWidth = headers.reduce((sum, h) => sum + h.w, 0);
    const scaleFactor = (PAGE_W - 2 * M) / totalTableWidth;

    // Scale column widths to fit page exactly
    headers.forEach(h => { h.w = h.w * scaleFactor; });

    // Helper to draw Table Header row
    const drawTableHeader = (currentY) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.1);
      doc.rect(M, currentY, PAGE_W - 2 * M, 22); // Outer border of header row

      doc.setTextColor(0, 0, 0);
      setFont("bold", 9);

      let curX = M;
      headers.forEach(h => {
        let xOffset = 5;
        if (h.align === "right") xOffset = h.w - 5;
        else if (h.align === "center") xOffset = h.w / 2;

        doc.text(h.label, curX + xOffset, currentY + 14, { align: h.align });

        // Vertical lines inside header
        if (curX > M) {
          doc.line(curX, currentY, curX, currentY + 22);
        }
        curX += h.w;
      });
    };

    // Draw header on page 1
    drawTableHeader(y);
    y += 22;

    // --- Table Rows ---
    filteredData.forEach((item, idx) => {
      // Check page overflow
      if (y > PAGE_H - 55) {
        doc.addPage();
        drawPageBorder();
        y = 40;
        drawTableHeader(y);
        y += 22;
      }

      // Draw row outer box
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.7);
      doc.rect(M, y, PAGE_W - 2 * M, 20);

      doc.setTextColor(0, 0, 0);
      setFont("normal", 8.5);

      let rowX = M;
      const rowVals = [
        (idx + 1).toString(),
        item.barcode || "—",
        item.type || "—",
        String(item.name || "—").length > 32 ? String(item.name).substring(0, 29) + "..." : (item.name || "—"),
        item.shade || "—",
        item.lotNo || "—",
        parseFloat(item.weight || 0).toFixed(2),
        item.unit || "Roll"
      ];

      headers.forEach((h, colIdx) => {
        let xOffset = 5;
        if (h.align === "right") xOffset = h.w - 5;
        else if (h.align === "center") xOffset = h.w / 2;

        doc.text(rowVals[colIdx], rowX + xOffset, y + 13, { align: h.align });

        // Vertical grid lines to separate cells / columns
        if (rowX > M) {
          doc.line(rowX, y, rowX, y + 20);
        }
        rowX += h.w;
      });

      y += 20;
    });

    // Check page overflow for total row
    if (y > PAGE_H - 55) {
      doc.addPage();
      drawPageBorder();
      y = 40;
      drawTableHeader(y);
      y += 22;
    }

    // Draw total row box
    doc.setFillColor(250, 250, 250);
    doc.rect(M, y, PAGE_W - 2 * M, 20, "F");
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.1);
    doc.rect(M, y, PAGE_W - 2 * M, 20);

    const totalQtyVal = filteredData.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0).toFixed(2);

    doc.setTextColor(0, 0, 0);
    setFont("bold", 8.5);

    let rowX = M;
    headers.forEach((h, colIdx) => {
      let xOffset = 5;
      if (h.align === "right") xOffset = h.w - 5;
      else if (h.align === "center") xOffset = h.w / 2;

      let val = "";
      if (colIdx === 5) {
        val = "Total:";
      } else if (colIdx === 6) {
        val = totalQtyVal;
      }

      if (val) {
        doc.text(val, rowX + xOffset, y + 13, { align: h.align });
      }

      if (rowX > M) {
        doc.line(rowX, y, rowX, y + 20);
      }
      rowX += h.w;
    });
    y += 20;

    // Save PDF Document
    doc.save(`Daily_Inventory_Summary_${selectedDate}.pdf`);
  };

  // Export to Grouped Fabric/Shade PDF Summary (Black & White)
  const exportGroupedPdf = async () => {
    if (filteredData.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Fetch today's attendance
    const attData = await getTodayAttendanceText();

    // Group filteredData by fabric name (item name), shade, and unit
    const grouped = {};
    filteredData.forEach(item => {
      const key = `${item.name || '—'}::${item.shade || '—'}::${item.unit || 'Roll'}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: item.name || '—',
          shade: item.shade || '—',
          unit: item.unit || 'Roll',
          totalRolls: 0,
          totalWeight: 0
        };
      }
      grouped[key].totalRolls += item.rolls || 1;
      grouped[key].totalWeight += item.weight || 0;
    });

    const groupedList = Object.values(grouped);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4"
    });

    const PAGE_W = doc.internal.pageSize.getWidth();
    const PAGE_H = doc.internal.pageSize.getHeight();
    const M = 30; // Margins
    let y = 35;

    // Helper functions
    const setFont = (style, size) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
    };

    // Draw page border
    const drawPageBorder = () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.2);
      doc.rect(M - 10, 15, PAGE_W - 2 * (M - 10), PAGE_H - 30);
    };

    // Draw border on first page
    drawPageBorder();

    // --- Header Block (Pure Black & White) ---
    doc.setTextColor(0, 0, 0);
    setFont("bold", 14);
    doc.text("DAILY FABRIC RECEIVED ", M + 15, y + 15);

    setFont("normal", 9);
    doc.text(`Date: ${selectedDate}  |  Generated on: ${new Date().toLocaleString()}`, M + 15, y + 29);

    // Right Side - Today's Attendance Block
    setFont("bold", 8);
    doc.text("TODAY'S ATTENDANCE SUMMARY", PAGE_W - M - 230, y + 10);
    setFont("normal", 7.5);
    doc.text(attData.summary, PAGE_W - M - 230, y + 21);
    doc.text(attData.absenteesText, PAGE_W - M - 230, y + 31);

    // Header underline divider
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(M, y + 39, PAGE_W - M, y + 39);

    y += 54;

    // --- Summary Metrics Box Grid (Border box, no fills) ---
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(M, y, PAGE_W - 2 * M, 45); // Outer border box

    // Metrics vertical divider lines (3 columns)
    const colWidth = (PAGE_W - 2 * M) / 3;
    doc.line(M + colWidth, y, M + colWidth, y + 45);
    doc.line(M + 2 * colWidth, y, M + 2 * colWidth, y + 45);

    doc.setTextColor(0, 0, 0);
    setFont("bold", 8.5);
    doc.text("TOTAL WEIGHT", M + 15, y + 16);
    doc.text("TOTAL METERS", M + colWidth + 15, y + 16);
    doc.text("TOTAL ROLLS / PKGS", M + 2 * colWidth + 15, y + 16);

    setFont("bold", 11);
    doc.text(`${stats.totalWeight.toFixed(2)} KG`, M + 15, y + 34);
    doc.text(`${stats.totalMeters.toFixed(2)} MTR`, M + colWidth + 15, y + 34);
    doc.text(`${stats.totalRolls}`, M + 2 * colWidth + 15, y + 34);

    y += 65;

    // --- Table Column Settings ---
    const headers = [
      { label: "SR", w: 35, align: "center" },
      { label: "Fabric Description (Item Name)", w: 220, align: "left" },
      { label: "Shade", w: 120, align: "left" },
      { label: "Total Rolls", w: 70, align: "right" },
      { label: "Total Quantity", w: 90, align: "right" }
    ];

    const totalTableWidth = headers.reduce((sum, h) => sum + h.w, 0);
    const scaleFactor = (PAGE_W - 2 * M) / totalTableWidth;

    // Scale column widths to fit page exactly
    headers.forEach(h => { h.w = h.w * scaleFactor; });

    // Helper to draw Table Header row
    const drawTableHeader = (currentY) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.1);
      doc.rect(M, currentY, PAGE_W - 2 * M, 22); // Outer border of header row

      doc.setTextColor(0, 0, 0);
      setFont("bold", 9);

      let curX = M;
      headers.forEach(h => {
        let xOffset = 5;
        if (h.align === "right") xOffset = h.w - 5;
        else if (h.align === "center") xOffset = h.w / 2;

        doc.text(h.label, curX + xOffset, currentY + 14, { align: h.align });

        // Vertical lines inside header
        if (curX > M) {
          doc.line(curX, currentY, curX, currentY + 22);
        }
        curX += h.w;
      });
    };

    // Draw header on page 1
    drawTableHeader(y);
    y += 22;

    // --- Table Rows ---
    groupedList.forEach((item, idx) => {
      // Check page overflow
      if (y > PAGE_H - 55) {
        doc.addPage();
        drawPageBorder();
        y = 40;
        drawTableHeader(y);
        y += 22;
      }

      // Draw row outer box
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.7);
      doc.rect(M, y, PAGE_W - 2 * M, 20);

      doc.setTextColor(0, 0, 0);
      setFont("normal", 8.5);

      let rowX = M;
      const qtyStr = `${parseFloat(item.totalWeight).toFixed(2)} ${item.unit}`;
      const rowVals = [
        (idx + 1).toString(),
        String(item.name).length > 42 ? String(item.name).substring(0, 39) + "..." : item.name,
        item.shade,
        item.totalRolls.toString(),
        qtyStr
      ];

      headers.forEach((h, colIdx) => {
        let xOffset = 5;
        if (h.align === "right") xOffset = h.w - 5;
        else if (h.align === "center") xOffset = h.w / 2;

        doc.text(rowVals[colIdx], rowX + xOffset, y + 13, { align: h.align });

        // Vertical grid lines to separate cells / columns
        if (rowX > M) {
          doc.line(rowX, y, rowX, y + 20);
        }
        rowX += h.w;
      });

      y += 20;
    });

    // Check page overflow for total row
    if (y > PAGE_H - 55) {
      doc.addPage();
      drawPageBorder();
      y = 40;
      drawTableHeader(y);
      y += 22;
    }

    // Draw total row box
    doc.setFillColor(250, 250, 250);
    doc.rect(M, y, PAGE_W - 2 * M, 20, "F");
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.1);
    doc.rect(M, y, PAGE_W - 2 * M, 20);

    const sumRolls = groupedList.reduce((sum, item) => sum + item.totalRolls, 0);
    const sumQtyVal = groupedList.reduce((sum, item) => sum + item.totalWeight, 0).toFixed(2);

    doc.setTextColor(0, 0, 0);
    setFont("bold", 8.5);

    let rowX = M;
    headers.forEach((h, colIdx) => {
      let xOffset = 5;
      if (h.align === "right") xOffset = h.w - 5;
      else if (h.align === "center") xOffset = h.w / 2;

      let val = "";
      if (colIdx === 2) {
        val = "Total:";
      } else if (colIdx === 3) {
        val = sumRolls.toString();
      } else if (colIdx === 4) {
        val = sumQtyVal;
      }

      if (val) {
        doc.text(val, rowX + xOffset, y + 13, { align: h.align });
      }

      if (rowX > M) {
        doc.line(rowX, y, rowX, y + 20);
      }
      rowX += h.w;
    });
    y += 20;

    // Save PDF Document
    doc.save(`Daily_Inventory_Grouped_Summary_${selectedDate}.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: '2000px', margin: '0 auto' }}>
      <style>{`
        .custom-report-table {
          width: 100%;
          border-collapse: collapse;
          font-family: inherit;
        }
        .custom-report-table th {
          background-color: var(--surface) !important;
          color: var(--text-primary) !important;
          font-weight: 700;
          font-size: 13px;
          padding: 12px 16px;
          text-align: left;
          border: 1px solid var(--border) !important;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .custom-report-table td {
          padding: 12px 16px;
          font-size: 13px;
          color: var(--text-primary);
          border: 1px solid var(--border) !important;
          transition: background-color 0.2s ease;
        }
        .custom-report-table tr:hover td {
          background-color: var(--bg-hover) !important;
        }
        .custom-report-table tr:nth-child(even) td {
          background-color: rgba(255, 255, 255, 0.015);
        }
      `}</style>

      {/* HEADER SECTION */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px',
        backgroundColor: 'var(--surface)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Daily Inventory Report (Quantity Wise)</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            List of materials & dyeing fabric stock added to the inventory database on a specific date.
          </p>
        </div>

        {/* CONTROLS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8 }}>
            <Calendar size={16} style={{ color: 'var(--primary)' }} />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 13
              }}
            />
          </div>

          <button
            className="btn btn-outline"
            onClick={() => fetchReport(selectedDate)}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <RefreshCw size={14} className={loading ? "spin-animation" : ""} />
            Refresh
          </button>

          <button
            className="btn btn-outline"
            onClick={exportToPdf}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            <FileText size={14} />
            Download PDF
          </button>

          <button
            className="btn btn-outline"
            onClick={exportGroupedPdf}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
          >
            <Layers size={14} />
            Download Itemwise PDF
          </button>

          <button
            className="btn btn-primary"
            onClick={exportToExcel}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={14} />
            Export Excel
          </button>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>

        {/* TOTAL WEIGHT CARD */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Scale size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Weight Received</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {stats.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 12, fontWeight: 600 }}>KG</span>
            </div>
          </div>
        </div>

        {/* TOTAL METERS CARD */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'rgba(11,114,133,0.1)',
            color: 'var(--secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Ruler size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Meters Received</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {stats.totalMeters.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 12, fontWeight: 600 }}>MTR</span>
            </div>
          </div>
        </div>

        {/* TOTAL ROLLS CARD */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--secondary-light)',
            color: 'var(--secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Rolls / Pkgs</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {stats.totalRolls.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 600 }}>Rolls</span>
            </div>
          </div>
        </div>

        {/* MATERIAL ROLLS CARD */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'rgba(12,166,120,0.1)',
            color: '#0ca678',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Material Master (Direct)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {stats.materialRolls.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 600 }}>Rolls</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
              Weight: {stats.materialWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
            </div>
          </div>
        </div>

        {/* DYEING ROLLS CARD */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'rgba(245,158,11,0.1)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Tag size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Dyeing Stock (Weighed)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {stats.dyeingRolls.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 600 }}>Rolls</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
              Weight: {stats.dyeingWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
            </div>
          </div>
        </div>

      </div>

      {/* FILTER & GRID */}
      <div className="card" style={{ border: '1px solid var(--border)', overflow: 'hidden', padding: 0 }}>

        {/* TABLE FILTER BLOCK */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface)',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="topbar-search" style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 12px',
              width: '280px'
            }}>
              <Search size={14} className="search-icon" style={{ color: 'var(--text-muted)' }} />
              <input
                placeholder="Search table rows..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  width: '100%'
                }}
              />
            </div>

            {/* OLD ROLLS STATUS FILTER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Old Rolls:</span>
              <select
                value={oldRollsFilter}
                onChange={e => setOldRollsFilter(e.target.value)}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Show All</option>
                <option value="skip">Skip Old Rolls (Skip '9')</option>
                <option value="only">Only Old Rolls ('9' Prefix)</option>
              </select>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredData.length}</strong> entries
          </div>
        </div>

        {/* TABLE WRAP */}
        <div className="table-wrap" style={{ margin: 0, overflowX: 'auto', border: 'none' }}>
          <table className="custom-report-table">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                <th style={{ width: '50px', textAlign: 'center' }}>SR</th>
                <th>Barcode ID</th>
                <th>Type</th>
                <th>Item Description</th>
                <th>Shade</th>
                <th>Lot No</th>
                <th>Store Location</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th style={{ textAlign: 'center' }}>Unit</th>
                <th style={{ textAlign: 'right' }}>Rolls</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                      <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading daily database report...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-flex',
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text-muted)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12
                      }}><Layers size={22} /></div>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>No inventory entries found</h3>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                        No materials or dyeing fabric stock was registered on {selectedDate}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={`${item.barcode}-${idx}`} className="hover-row" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      <span style={{ display: 'inline-block', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--primary-light)', fontSize: 11 }}>
                        {item.barcode}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${item.type === 'Material' ? 'badge-secondary' : 'badge-primary'}`} style={{ fontSize: 10, fontWeight: 700 }}>
                        {item.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                    <td>{item.shade}</td>
                    <td style={{ fontWeight: 600 }}>{item.lotNo}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                        {item.location}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {parseFloat(item.weight).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-outline" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                        {item.unit || 'Roll'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.rolls}</td>
                  </tr>
                ))
              )}
              {!loading && filteredData.length > 0 && (
                <tr style={{ backgroundColor: 'var(--bg-hover)', fontWeight: 800, borderTop: '2.5px double var(--border)', borderBottom: '2.5px double var(--border)' }}>
                  <td colSpan={7} style={{ textAlign: 'right', padding: '10px 15px', color: 'var(--text-primary)', fontSize: 13, fontWeight: 800 }}>
                    Total:
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontSize: 13, fontWeight: 800 }}>
                    {filteredData.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0).toFixed(2)}
                  </td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontSize: 13, fontWeight: 800 }}>
                    {filteredData.reduce((sum, item) => sum + (item.rolls || 0), 0)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
