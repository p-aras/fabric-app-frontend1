import React, { useState, useEffect, useMemo } from 'react';
import { store } from '../store.js';
import {
  Calendar, Search, Download, RefreshCw, Layers, Scissors, CheckCircle, Home, Table as TableIcon, Users
} from 'lucide-react';
import * as XLSX from "xlsx-js-style";
import { jsPDF } from 'jspdf';

export default function HallWiseCuttingReport() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [tablesConfig, setTablesConfig] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHall, setSelectedHall] = useState('All');

  const fetchReport = async (refresh = false) => {
    setLoading(true);
    try {
      const [tablesRes, response] = await Promise.all([
        store.getTables(),
        store.getDailyCuttingCompletedReport(refresh)
      ]);

      if (tablesRes && tablesRes.success) {
        setTablesConfig(tablesRes.data || []);
      }
      if (response && response.success) {
        setReportData(response.data || []);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error("Error loading hall wise report:", err);
      alert("Failed to load report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(false);
  }, []);

  // Map each cutting row to its configured Hall and details (exploding multi-table rows)
  const resolvedCuttingData = useMemo(() => {
    const tableMap = {};
    tablesConfig.forEach(t => {
      if (t.name) {
        const cleanName = String(t.name).toLowerCase().replace('table', '').trim();
        tableMap[cleanName] = t;
        tableMap[String(t.name).toLowerCase().trim()] = t;
      }
    });

    const exploded = [];
    reportData.forEach(item => {
      const rawTable = String(item["Cutting Table"] || '').trim();
      // Split by commas, slashes, or spaces
      const tablesList = rawTable.split(/[,/\s]+/).map(t => t.toLowerCase().replace('table', '').trim()).filter(Boolean);
      const qty = parseFloat(item["Total Qty"]) || 0;

      if (tablesList.length > 0) {
        const share = qty / tablesList.length;
        tablesList.forEach(tbl => {
          const config = tableMap[tbl] || tableMap['table ' + tbl];
          exploded.push({
            ...item,
            resolvedTable: config ? config.name : `Table ${tbl}`,
            hall: config?.hall || 'Unassigned Hall',
            supervisor: config?.Supervisor?.name || 'Unassigned',
            cutterMaster: config?.CutterMaster?.name || 'Unassigned',
            date: item["Cutting Date"] || '',
            sharedQty: share
          });
        });
      } else {
        exploded.push({
          ...item,
          resolvedTable: 'Unknown Table',
          hall: 'Unassigned Hall',
          supervisor: 'Unassigned',
          cutterMaster: 'Unassigned',
          date: item["Cutting Date"] || '',
          sharedQty: qty
        });
      }
    });
    return exploded;
  }, [reportData, tablesConfig]);

  // Filter based on selected date, hall and search term
  const filteredData = useMemo(() => {
    return resolvedCuttingData.filter(item => {
      // Date filter
      const dateMatch = item.date === selectedDate;

      // Hall filter
      const hallMatch = selectedHall === 'All' || item.hall === selectedHall;

      // Search filter
      const q = searchTerm.trim().toLowerCase();
      const searchMatch = !q ||
        String(item["Lot No"] || '').toLowerCase().includes(q) ||
        String(item["Job Order No"] || '').toLowerCase().includes(q) ||
        String(item["Fabric"] || '').toLowerCase().includes(q) ||
        String(item["Brand"] || '').toLowerCase().includes(q) ||
        String(item["Garment Type"] || '').toLowerCase().includes(q) ||
        String(item["Party Name"] || '').toLowerCase().includes(q) ||
        String(item.hall || '').toLowerCase().includes(q) ||
        String(item.supervisor || '').toLowerCase().includes(q) ||
        String(item.cutterMaster || '').toLowerCase().includes(q) ||
        String(item.resolvedTable || '').toLowerCase().includes(q) ||
        String(item["Cutting Table"] || '').toLowerCase().includes(q);

      return dateMatch && hallMatch && searchMatch;
    });
  }, [resolvedCuttingData, selectedDate, selectedHall, searchTerm]);

  // Get list of unique halls for dropdown filter
  const uniqueHallsList = useMemo(() => {
    const halls = resolvedCuttingData.map(item => item.hall).filter(Boolean);
    return ['All', ...new Set(halls)].sort();
  }, [resolvedCuttingData]);

  // Grouped quantities by Hall and Table for display
  const groupedReport = useMemo(() => {
    const groups = {};

    filteredData.forEach(item => {
      const hall = item.hall || 'Unassigned Hall';
      const table = item.resolvedTable || 'Unknown Table';
      const key = `${hall}::${table}`;

      const qty = item.sharedQty || 0;
      const lot = item["Lot No"] ? String(item["Lot No"]).trim() : '';
      const fabric = item["Fabric"] ? String(item["Fabric"]).trim() : '';

      if (!groups[key]) {
        groups[key] = {
          hall,
          table,
          supervisor: item.supervisor,
          cutterMaster: item.cutterMaster,
          lots: new Set(),
          fabrics: new Set(),
          totalQty: 0
        };
      }

      groups[key].totalQty += qty;
      if (lot) groups[key].lots.add(lot);
      if (fabric) groups[key].fabrics.add(fabric);
    });

    return Object.values(groups).map(g => ({
      ...g,
      lots: Array.from(g.lots).join(', '),
      fabrics: Array.from(g.fabrics).join(', '),
      totalQty: Math.round(g.totalQty)
    })).sort((a, b) => a.hall.localeCompare(b.hall) || a.table.localeCompare(b.table));
  }, [filteredData]);

  // Summary Metrics per Hall
  const hallSummaries = useMemo(() => {
    const summary = {};
    let grandTotal = 0;

    groupedReport.forEach(item => {
      summary[item.hall] = (summary[item.hall] || 0) + item.totalQty;
      grandTotal += item.totalQty;
    });

    return {
      halls: Object.entries(summary).map(([name, qty]) => ({ name, qty })),
      grandTotal
    };
  }, [groupedReport]);

  const handleExportExcel = () => {
    if (groupedReport.length === 0) {
      alert("No data available to export.");
      return;
    }

    try {
      const headers = ["Hall Name", "Table Name", "Supervisor", "Cutter Master", "Lots Processed", "Fabric Types", "Total Qty Cut (Pcs)"];
      const rows = groupedReport.map(g => [
        g.hall,
        g.table,
        g.supervisor,
        g.cutterMaster,
        g.lots || '—',
        g.fabrics || '—',
        g.totalQty
      ]);

      // Add Grand Total row
      rows.push([
        "GRAND TOTAL",
        "",
        "",
        "",
        "",
        "",
        hallSummaries.grandTotal
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "HallWiseReport");

      // Apply Excel styles
      const colWidths = [18, 15, 18, 18, 25, 25, 18];
      ws['!cols'] = colWidths.map(w => ({ wch: w }));

      XLSX.writeFile(wb, `Hall_Wise_Cutting_Report_${selectedDate}.xlsx`);
    } catch (e) {
      alert("Excel export failed: " + e.message);
    }
  };

  const handleExportPdf = () => {
    if (groupedReport.length === 0) {
      alert("No data available to export.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4"
      });

      const PAGE_W = doc.internal.pageSize.getWidth();
      const PAGE_H = doc.internal.pageSize.getHeight();
      const M = 30; // Margins
      let y = 35;

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

      drawPageBorder();

      // Heading and Subtitle
      doc.setTextColor(0, 0, 0);
      setFont("bold", 14);
      doc.text("HALL WISE CUTTING REPORT", M + 15, y + 15);

      setFont("normal", 9);
      doc.text(`Report Date: ${selectedDate}  |  Generated on: ${new Date().toLocaleString()}`, M + 15, y + 29);

      // Brief Description
      setFont("italic", 8.5);
      doc.setTextColor(80, 80, 80);
      doc.text("This report briefs the daily cutting quantity achieved across different production halls and their respective tables, under supervisor control.", M + 15, y + 42);

      // Divider Line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(M, y + 49, PAGE_W - M, y + 49);

      y += 62;

      // Hall Summaries Box (Total of pcs hall wise)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(M, y, PAGE_W - 2 * M, 45); // Outer border box

      // Divide the box width by number of halls + 1 for grand total
      const totalHalls = hallSummaries.halls.length;
      const numColumns = totalHalls + 1;
      const boxWidth = (PAGE_W - 2 * M) / numColumns;

      // Draw vertical separators in summaries box
      for (let i = 1; i < numColumns; i++) {
        doc.line(M + (i * boxWidth), y, M + (i * boxWidth), y + 45);
      }

      // Draw Grand Total Summary
      doc.setTextColor(0, 0, 0);
      setFont("bold", 8);
      doc.text("GRAND TOTAL CUT", M + 15, y + 16);
      setFont("bold", 11);
      doc.text(`${hallSummaries.grandTotal.toLocaleString()} Pcs`, M + 15, y + 34);

      // Draw Hall Wise Summaries
      hallSummaries.halls.forEach((hall, idx) => {
        const startX = M + ((idx + 1) * boxWidth);
        doc.setTextColor(0, 0, 0);
        setFont("bold", 8);
        doc.text(String(hall.name).toUpperCase() + " TOTAL", startX + 15, y + 16);
        setFont("bold", 11);
        doc.text(`${hall.qty.toLocaleString()} Pcs`, startX + 15, y + 34);
      });

      y += 65;

      // Table Columns definition
      const headers = [
        { label: "SR", w: 25, align: "center" },
        { label: "Hall Name", w: 100, align: "left" },
        { label: "Table Name", w: 80, align: "left" },
        { label: "Supervisor", w: 110, align: "left" },
        { label: "Cutter Master", w: 110, align: "left" },
        { label: "Lots Processed", w: 140, align: "left" },
        { label: "Fabric Types", w: 140, align: "left" },
        { label: "Qty Cut (Pcs)", w: 75, align: "right" }
      ];

      // Calculate total table width and scale headers to fit page width
      const totalWidth = headers.reduce((sum, h) => sum + h.w, 0);
      const scaleFactor = (PAGE_W - 2 * M) / totalWidth;
      headers.forEach(h => { h.w = h.w * scaleFactor; });

      // Draw table header helper
      const drawTableHeader = (currentY) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1.1);
        doc.rect(M, currentY, PAGE_W - 2 * M, 22);

        doc.setTextColor(0, 0, 0);
        setFont("bold", 8.5);

        let curX = M;
        headers.forEach((h, hIdx) => {
          let xOffset = 5;
          if (h.align === "right") xOffset = h.w - 5;
          else if (h.align === "center") xOffset = h.w / 2;

          doc.text(h.label, curX + xOffset, currentY + 14, { align: h.align });

          if (hIdx > 0) {
            doc.line(curX, currentY, curX, currentY + 22);
          }
          curX += h.w;
        });
      };

      drawTableHeader(y);
      y += 22;

      // Data Rows rendering
      groupedReport.forEach((g, idx) => {
        const rowData = [
          String(idx + 1),
          g.hall,
          g.table,
          g.supervisor,
          g.cutterMaster,
          g.lots || '—',
          g.fabrics || '—',
          g.totalQty.toLocaleString()
        ];

        const cellLines = rowData.map((val, colIdx) => {
          return doc.splitTextToSize(String(val), headers[colIdx].w - 10);
        });

        const maxLines = Math.max(...cellLines.map(lines => lines.length));
        const rowHeight = 12 + (maxLines * 10);

        // Page break check
        if (y + rowHeight > PAGE_H - 45) {
          doc.addPage();
          drawPageBorder();
          y = 35;
          drawTableHeader(y);
          y += 22;
        }

        // Zebra striping
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, y, PAGE_W - 2 * M, rowHeight, 'F');
        }

        // Draw row border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.6);
        doc.rect(M, y, PAGE_W - 2 * M, rowHeight);

        // Draw vertical column dividers
        let divX = M;
        headers.forEach((h, hIdx) => {
          if (hIdx > 0) {
            doc.line(divX, y, divX, y + rowHeight);
          }
          divX += h.w;
        });

        // Draw cell values
        doc.setTextColor(0, 0, 0);
        setFont("normal", 8);

        let curX = M;
        headers.forEach((h, colIdx) => {
          const lines = cellLines[colIdx];
          let startX = curX + 5;
          if (h.align === "right") startX = curX + h.w - 5;
          else if (h.align === "center") startX = curX + h.w / 2;

          lines.forEach((line, lineIdx) => {
            doc.text(line, startX, y + 12 + (lineIdx * 10), { align: h.align });
          });
          curX += h.w;
        });

        y += rowHeight;
      });

      // Grand Total Row rendering
      if (y + 20 > PAGE_H - 45) {
        doc.addPage();
        drawPageBorder();
        y = 35;
        drawTableHeader(y);
        y += 22;
      }

      doc.setFillColor(250, 250, 250);
      doc.rect(M, y, PAGE_W - 2 * M, 20, "F");
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.1);
      doc.rect(M, y, PAGE_W - 2 * M, 20);

      doc.setTextColor(0, 0, 0);
      setFont("bold", 8.5);

      let rowX = M;
      headers.forEach((h, colIdx) => {
        let xOffset = 5;
        if (h.align === "right") xOffset = h.w - 5;
        else if (h.align === "center") xOffset = h.w / 2;

        let val = "";
        if (colIdx === 6) {
          val = "GRAND TOTAL:";
        } else if (colIdx === 7) {
          val = hallSummaries.grandTotal.toLocaleString();
        }

        if (val) {
          doc.text(val, rowX + xOffset, y + 13, { align: h.align });
        }

        if (colIdx > 0) {
          doc.line(rowX, y, rowX, y + 20);
        }
        rowX += h.w;
      });

      doc.save(`Hall_Wise_Cutting_Report_${selectedDate}.pdf`);
    } catch (e) {
      alert("PDF generation failed: " + e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header section */}
      <div className="page-header">
        <div>
          <div className="breadcrumb"><span>Reports</span><span>/</span><span>Hall Wise Cutting Report</span></div>
          <h1 style={{ margin: 0 }}>Hall Wise Cutting Report</h1>
          <p style={{ margin: '4px 0 0 0' }}>Daily cutting quantities grouped by table location and hall assignment.</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}><Download size={14} /> Export Excel</button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportPdf}><Download size={14} /> Export PDF</button>
          <button className="btn btn-primary btn-sm" onClick={() => fetchReport(true)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Date & Filters Toolbar */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '160px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              title="Select report date"
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
            <select
              className="form-control"
              value={selectedHall}
              onChange={e => setSelectedHall(e.target.value)}
              title="Select Hall Filter"
            >
              <option value="All">All Halls</option>
              {uniqueHallsList.filter(h => h !== 'All').map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div className="search-bar" style={{ flex: 1, minWidth: '240px', margin: 0 }}>
            <Search size={14} className="icon" />
            <input
              placeholder="Search by lot, fabric, supervisor, cutter master, table..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px', background: 'var(--surface)', borderRadius: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>TOTAL PIECES CUT</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>
            {hallSummaries.grandTotal.toLocaleString()} Pcs
          </div>
        </div>
        {hallSummaries.halls.map(hall => (
          <div key={hall.name} className="card" style={{ padding: '14px 18px', background: 'var(--surface)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {hall.name} CUT QUANTITY
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)', marginTop: '4px' }}>
              {hall.qty.toLocaleString()} Pcs
            </div>
          </div>
        ))}
      </div>

      {/* Main Report Table Card */}
      <div className="old-inventory-card">
        <div className="old-inventory-table-wrap">
          <table className="old-inventory-table">
            <thead>
              <tr>
                <th>Hall Name</th>
                <th>Table Name</th>
                <th>Supervisor</th>
                <th>Cutter Master</th>
                <th>Lots Processed</th>
                <th>Fabric Types</th>
                <th style={{ textAlign: 'right' }}>Total Qty Cut (Pcs)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '50px 0',
                      gap: 12
                    }}>
                      <RefreshCw size={26} className="spin" style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>Fetching Daily Cutting Data...</span>
                    </div>
                  </td>
                </tr>
              ) : groupedReport.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Scissors size={28} /></div>
                      <h3>No Cutting Data Found</h3>
                      <p>Try switching report dates or check database assignments.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {groupedReport.map((g, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13 }}>
                        <span className="tag" style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {g.hall}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{g.table}</td>
                      <td>{g.supervisor}</td>
                      <td>{g.cutterMaster}</td>
                      <td style={{ fontSize: 11, maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={g.lots}>
                        {g.lots || '—'}
                      </td>
                      <td style={{ fontSize: 11, maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={g.fabrics}>
                        {g.fabrics || '—'}
                      </td>
                      <td style={{ fontWeight: 700, textAlign: 'right', fontSize: 13 }}>{g.totalQty.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* Grand Total Row */}
                  <tr style={{ background: 'var(--primary-light)', fontWeight: 'bold' }}>
                    <td colSpan={6} style={{ color: 'var(--primary)', fontSize: 13 }}>GRAND TOTAL</td>
                    <td style={{ textAlign: 'right', color: 'var(--primary)', fontSize: 13 }}>
                      {hallSummaries.grandTotal.toLocaleString()}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
