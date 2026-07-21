import { useState, useEffect, useMemo } from 'react';
import { store } from '../store.js';
import {
  Calendar, Search, Download, RefreshCw, FileText,
  Layers, Scale, Tag, Users, LayoutGrid
} from 'lucide-react';
import * as XLSX from "xlsx-js-style";
import { jsPDF } from 'jspdf';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function SupervisorWiseReport() {
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
  const [selectedSupervisor, setSelectedSupervisor] = useState('All');
  const [selectedTable, setSelectedTable] = useState('All');

  const fetchReport = async () => {
    setLoading(true);
    try {
      // Fetch table supervisor mapping and issuance report concurrently
      const [tablesRes, response] = await Promise.all([
        store.getTables(),
        store.getSupervisorIssuanceReport(startDate, endDate)
      ]);

      const tableSupervisorMap = {};
      if (tablesRes && tablesRes.success) {
        (tablesRes.data || []).forEach(t => {
          if (t.name && t.Supervisor && t.Supervisor.name) {
            tableSupervisorMap[String(t.name).trim().toLowerCase()] = t.Supervisor.name;
          }
        });
      }

      if (response && response.success) {
        const rawData = response.data || [];
        const mappedData = rawData.map(item => {
          const tblKey = String(item.tableNumber || '').trim().toLowerCase();
          const assignedSupervisor = tableSupervisorMap[tblKey];
          return {
            ...item,
            supervisor: assignedSupervisor || item.supervisor || 'Unassigned'
          };
        });
        setReportData(mappedData);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error("Error loading supervisor wise report:", err);
      alert("Failed to load report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  // Get unique supervisors and tables from the raw data for filter dropdowns
  const uniqueSupervisors = useMemo(() => {
    const sups = reportData.map(item => item.supervisor).filter(Boolean);
    return ['All', ...new Set(sups)].sort();
  }, [reportData]);

  const uniqueTables = useMemo(() => {
    const tbls = reportData.map(item => item.tableNumber).filter(Boolean);
    return ['All', ...new Set(tbls)].sort();
  }, [reportData]);

  // Filtered rows matching search term and dropdown selections
  const filteredData = useMemo(() => {
    return reportData.filter(item => {
      // Supervisor filter
      if (selectedSupervisor !== 'All' && item.supervisor !== selectedSupervisor) {
        return false;
      }
      // Table filter
      if (selectedTable !== 'All' && item.tableNumber !== selectedTable) {
        return false;
      }
      
      // Search term filter
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        String(item.supervisor).toLowerCase().includes(q) ||
        String(item.tableNumber).toLowerCase().includes(q) ||
        String(item.lotNumber).toLowerCase().includes(q) ||
        String(item.fabric).toLowerCase().includes(q) ||
        String(item.shade).toLowerCase().includes(q)
      );
    });
  }, [reportData, searchTerm, selectedSupervisor, selectedTable]);

  // Calculate statistics
  const stats = useMemo(() => {
    return filteredData.reduce((acc, curr) => {
      acc.totalRolls += curr.rolls || 0;
      acc.totalWeight += curr.weight || 0;
      acc.supervisors.add(curr.supervisor);
      acc.tables.add(curr.tableNumber);
      return acc;
    }, {
      totalRolls: 0,
      totalWeight: 0,
      supervisors: new Set(),
      tables: new Set()
    });
  }, [filteredData]);

  // Prepare chart data: aggregate rolls by Date
  const chartData = useMemo(() => {
    const dailyMap = {};
    filteredData.forEach(item => {
      const date = item.date || 'No Date';
      dailyMap[date] = (dailyMap[date] || 0) + (item.rolls || 0);
    });
    
    return Object.entries(dailyMap)
      .map(([date, rolls]) => ({ date, rolls }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // Prepare supervisor performance chart data
  const supervisorChartData = useMemo(() => {
    const supMap = {};
    filteredData.forEach(item => {
      const sup = item.supervisor || 'System';
      supMap[sup] = (supMap[sup] || 0) + (item.rolls || 0);
    });
    
    return Object.entries(supMap)
      .map(([supervisor, rolls]) => ({ supervisor, rolls }))
      .sort((a, b) => b.rolls - a.rolls);
  }, [filteredData]);

  // Export to Excel
  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const data = filteredData.map((item, idx) => ({
      "SR": idx + 1,
      "Date": item.date,
      "Supervisor": item.supervisor,
      "Table": item.tableNumber,
      "Fabric Description": item.fabric,
      "Lot Number": item.lotNumber,
      "Shade": item.shade,
      "Rolls": item.rolls,
      "Weight (KG)": item.weight
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Apply header styling
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[headerCell]) {
        ws[headerCell].s = {
          fill: { fgColor: { rgb: "4F46E5" } }, // indigo-600
          font: { bold: true, color: { rgb: "FFFFFF" }, name: "Calibri", sz: 11 },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    }

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // SR
      { wch: 15 }, // Date
      { wch: 20 }, // Supervisor
      { wch: 15 }, // Table
      { wch: 30 }, // Fabric Description
      { wch: 15 }, // Lot Number
      { wch: 15 }, // Shade
      { wch: 10 }, // Rolls
      { wch: 12 }  // Weight
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supervisor Issuance Report");
    XLSX.writeFile(wb, `Supervisor_Issuance_Report_${startDate}_to_${endDate}.xlsx`);
  };

  // Export to PDF Summary
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
    const M = 30; // Margins
    let y = 45;

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

    // Header
    doc.setTextColor(0, 0, 0);
    setFont("bold", 15);
    doc.text("SUPERVISOR WISE ISSUANCE REPORT", M + 15, y + 20);

    setFont("normal", 9.5);
    doc.text(`Period: ${startDate} to ${endDate}  |  Generated on: ${new Date().toLocaleString()}`, M + 15, y + 36);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(M, y + 48, PAGE_W - M, y + 48);

    y += 65;

    // Summary Metrics Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(M, y, PAGE_W - 2 * M, 45); // Outer border box

    // Metrics vertical divider lines
    doc.line(M + 130, y, M + 130, y + 45);
    doc.line(M + 260, y, M + 260, y + 45);
    doc.line(M + 395, y, M + 395, y + 45);

    doc.setTextColor(0, 0, 0);
    setFont("bold", 8);
    doc.text("TOTAL ROLLS ISSUED", M + 10, y + 16);
    doc.text("TOTAL WEIGHT ISSUED", M + 140, y + 16);
    doc.text("ACTIVE SUPERVISORS", M + 270, y + 16);
    doc.text("ACTIVE TABLES", M + 405, y + 16);

    setFont("bold", 11);
    doc.text(`${stats.totalRolls} Rolls`, M + 10, y + 34);
    doc.text(`${stats.totalWeight.toFixed(2)} KG`, M + 140, y + 34);
    doc.text(`${stats.supervisors.size}`, M + 270, y + 34);
    doc.text(`${stats.tables.size}`, M + 405, y + 34);

    y += 65;

    // Table Columns
    const headers = [
      { label: "SR", w: 30, align: "center" },
      { label: "Date", w: 60, align: "left" },
      { label: "Supervisor", w: 90, align: "left" },
      { label: "Table", w: 55, align: "left" },
      { label: "Lot Number", w: 65, align: "left" },
      { label: "Fabric Description", w: 120, align: "left" },
      { label: "Shade", w: 60, align: "left" },
      { label: "Rolls", w: 45, align: "right" }
    ];

    const totalTableWidth = headers.reduce((sum, h) => sum + h.w, 0);
    const scaleFactor = (PAGE_W - 2 * M) / totalTableWidth;
    headers.forEach(h => { h.w = h.w * scaleFactor; });

    const drawTableHeader = (currentY) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.1);
      doc.rect(M, currentY, PAGE_W - 2 * M, 22);

      doc.setTextColor(0, 0, 0);
      setFont("bold", 9);

      let curX = M;
      headers.forEach(h => {
        let xOffset = 5;
        if (h.align === "right") xOffset = h.w - 5;
        else if (h.align === "center") xOffset = h.w / 2;

        doc.text(h.label, curX + xOffset, currentY + 14, { align: h.align });

        if (curX > M) {
          doc.line(curX, currentY, curX, currentY + 22);
        }
        curX += h.w;
      });
    };

    drawTableHeader(y);
    y += 22;

    filteredData.forEach((item, idx) => {
      if (y > PAGE_H - 55) {
        doc.addPage();
        drawPageBorder();
        y = 40;
        drawTableHeader(y);
        y += 22;
      }

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.7);
      doc.rect(M, y, PAGE_W - 2 * M, 20);

      doc.setTextColor(0, 0, 0);
      setFont("normal", 8.5);

      let rowX = M;
      const rowVals = [
        (idx + 1).toString(),
        item.date || "—",
        item.supervisor || "—",
        item.tableNumber || "—",
        item.lotNumber || "—",
        String(item.fabric || "—").length > 25 ? String(item.fabric).substring(0, 22) + "..." : (item.fabric || "—"),
        item.shade || "—",
        (item.rolls || 0).toString()
      ];

      headers.forEach((h, colIdx) => {
        let xOffset = 5;
        if (h.align === "right") xOffset = h.w - 5;
        else if (h.align === "center") xOffset = h.w / 2;

        doc.text(rowVals[colIdx], rowX + xOffset, y + 13, { align: h.align });

        if (rowX > M) {
          doc.line(rowX, y, rowX, y + 20);
        }
        rowX += h.w;
      });

      y += 20;
    });

    doc.save(`Supervisor_Wise_Issuance_Report_${startDate}_to_${endDate}.pdf`);
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
        .filter-select {
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 6px 12px;
          borderRadius: 8px;
          outline: none;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        .filter-select option {
          background: var(--surface);
          color: var(--text-primary);
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
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Supervisor Wise Issuance Report</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Summary of fabric rolls issued to different production tables, grouped by supervisor.
          </p>
        </div>

        {/* CONTROLS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8 }}>
            <Calendar size={16} style={{ color: 'var(--primary)' }} />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 13
              }}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
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
            onClick={fetchReport}
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
        {/* TOTAL ROLLS CARD */}
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
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Rolls Issued</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {stats.totalRolls.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 600 }}>Rolls</span>
            </div>
          </div>
        </div>

        {/* TOTAL WEIGHT CARD */}
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
            <Scale size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Weight Issued</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {stats.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 12, fontWeight: 600 }}>KG</span>
            </div>
          </div>
        </div>

        {/* UNIQUE SUPERVISORS */}
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
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Active Supervisors</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {stats.supervisors.size} <span style={{ fontSize: 12, fontWeight: 600 }}>Supervisors</span>
            </div>
          </div>
        </div>

        {/* ACTIVE TABLES */}
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
            <LayoutGrid size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Active Tables</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {stats.tables.size} <span style={{ fontSize: 12, fontWeight: 600 }}>Tables</span>
            </div>
          </div>
        </div>
      </div>

      {/* VISUAL CHARTS SECTION */}
      {filteredData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 16 }}>
          {/* DAILY ROLLS TREND */}
          <div className="card" style={{ border: '1px solid var(--border)', padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Daily Rolls Issuance Trend</h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 8 }}
                    labelStyle={{ fontWeight: 700, color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="rolls" name="Rolls Issued" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SUPERVISOR PERFORMANCE */}
          <div className="card" style={{ border: '1px solid var(--border)', padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Rolls Issued by Supervisor</h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={supervisorChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="supervisor" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 8 }}
                    labelStyle={{ fontWeight: 700, color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="rolls" name="Total Rolls" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & GRID */}
      <div className="card" style={{ border: '1px solid var(--border)', overflow: 'hidden', padding: 0 }}>
        {/* TABLE FILTER BLOCK */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          backgroundColor: 'var(--surface)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            {/* Search */}
            <div className="topbar-search" style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 12px',
              width: '240px'
            }}>
              <Search size={14} className="search-icon" style={{ color: 'var(--text-muted)', marginRight: 6 }} />
              <input
                placeholder="Search report rows..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  width: '90%'
                }}
              />
            </div>

            {/* Supervisor Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Supervisor:</span>
              <select
                className="filter-select"
                value={selectedSupervisor}
                onChange={e => setSelectedSupervisor(e.target.value)}
              >
                {uniqueSupervisors.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>

            {/* Table Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Table:</span>
              <select
                className="filter-select"
                value={selectedTable}
                onChange={e => setSelectedTable(e.target.value)}
              >
                {uniqueTables.map(tbl => (
                  <option key={tbl} value={tbl}>{tbl}</option>
                ))}
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
                <th>Date</th>
                <th>Supervisor</th>
                <th>Table</th>
                <th>Fabric Description</th>
                <th>Lot No</th>
                <th>Shade</th>
                <th style={{ textAlign: 'right' }}>Rolls</th>
                <th style={{ textAlign: 'right' }}>Weight (KG)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                      <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading report...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9}>
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
                      <h3 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>No issuances found</h3>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                        No fabric issuances match the current filter criteria for the period {startDate} to {endDate}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={item.id} className="hover-row" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.date}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      <span style={{ display: 'inline-block', padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--primary-light)', fontSize: 11 }}>
                        {item.supervisor}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                        {item.tableNumber}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.fabric}</td>
                    <td style={{ fontWeight: 600 }}>{item.lotNumber}</td>
                    <td>{item.shade}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{item.rolls}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {parseFloat(item.weight).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
