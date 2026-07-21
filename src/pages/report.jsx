import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store.js';
import * as XLSX from 'xlsx-js-style';
import {
  Search, Printer, Download, ArrowLeft, AlertTriangle, CheckCircle2,
  Droplets, RefreshCw, SlidersHorizontal, Scale, ArrowUpDown
} from 'lucide-react';

export default function DyeingShortageReport() {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('shortagePctDesc');

  // Load report data on mount
  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await store.getDyeingShortageReportFromSheet();
      if (res && res.success) {
        setReportData(res.data || []);
      } else {
        throw new Error(res.message || 'Failed to retrieve report data');
      }
    } catch (err) {
      console.error('Error fetching dyeing shortage report:', err);
      setError(err.message || 'Failed to load report. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Filter and Sort Logic
  const processedData = useMemo(() => {
    let result = [...reportData];

    // Search query filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(item => 
        String(item.lotNumber || '').toLowerCase().includes(q) ||
        String(item.billNumber || '').toLowerCase().includes(q) ||
        String(item.brand || '').toLowerCase().includes(q) ||
        String(item.fabric || '').toLowerCase().includes(q) ||
        String(item.sentShade || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(item => item.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'shortagePctDesc':
          return b.shortagePct - a.shortagePct;
        case 'shortagePctAsc':
          return a.shortagePct - b.shortagePct;
        case 'lotNumberAsc':
          return String(a.lotNumber).localeCompare(String(b.lotNumber));
        case 'lotNumberDesc':
          return String(b.lotNumber).localeCompare(String(a.lotNumber));
        case 'sentWeightDesc':
          return b.sentWeight - a.sentWeight;
        case 'weightDiffDesc':
          return b.weightDiff - a.weightDiff;
        default:
          return 0;
      }
    });

    return result;
  }, [reportData, searchQuery, statusFilter, sortBy]);

  // Summary KPI Metrics
  const metrics = useMemo(() => {
    let totalSentWeight = 0;
    let totalReceivedWeight = 0;
    let totalWeightShortage = 0;
    let rejectCount = 0;
    let approvedCount = 0;

    processedData.forEach(item => {
      totalSentWeight += item.sentWeight || 0;
      totalReceivedWeight += item.receivedWeight || 0;
      totalWeightShortage += item.weightDiff || 0;
      if (item.status === 'Reject') {
        rejectCount++;
      } else {
        approvedCount++;
      }
    });

    const overallShortagePct = totalSentWeight > 0 
      ? parseFloat(((totalWeightShortage / totalSentWeight) * 100).toFixed(2))
      : 0;

    return {
      totalSentWeight,
      totalReceivedWeight,
      totalWeightShortage,
      overallShortagePct,
      rejectCount,
      approvedCount,
      totalCount: processedData.length
    };
  }, [processedData]);

  // Export to CSV
  const handleExport = () => {
    if (!processedData.length) return;

    const data = processedData.map((item, index) => ({
      "S.No": index + 1,
      "Bill Number": item.billNumber || '—',
      "Lot Number": item.lotNumber || '—',
      "Batch Number": item.batchNumber || '—',
      "Party/Brand": item.brand || '—',
      "Fabric Name": item.fabric || '—',
      "Shade": item.sentShade || '—',
      "Sent Rolls": item.sentRolls || 0,
      "Received Rolls": item.receivedRolls || 0,
      "Roll Shortage": item.rollDiff || 0,
      "Sent Weight (KG)": item.sentWeight || 0,
      "Received Weight (KG)": item.receivedWeight || 0,
      "Weight Shortage (KG)": item.weightDiff || 0,
      "Shortage %": `${item.shortagePct}%`,
      "Status": item.status || '—'
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Apply header styling
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[headerCell]) {
        ws[headerCell].s = {
          fill: { fgColor: { rgb: "3B82F6" } }, // blue-500
          font: { bold: true, color: { rgb: "FFFFFF" }, name: "Calibri", sz: 11 },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    }

    // Apply alignment & font colors
    for (let r = 1; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          let align = "left";
          if ([0, 1, 2, 3, 13, 14].includes(c)) {
            align = "center";
          } else if ([7, 8, 9, 10, 11, 12].includes(c)) {
            align = "right";
          }

          ws[cellRef].s = {
            font: { name: "Calibri", sz: 10 },
            alignment: { horizontal: align, vertical: "center" }
          };

          // Reject color vs Approved color
          if (c === 14) {
            if (ws[cellRef].v === 'Reject') {
              ws[cellRef].s.font.color = { rgb: "EF4444" };
              ws[cellRef].s.font.bold = true;
            } else if (ws[cellRef].v === 'Approved') {
              ws[cellRef].s.font.color = { rgb: "10B981" };
              ws[cellRef].s.font.bold = true;
            }
          }
        }
      }
    }

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // S.No
      { wch: 15 },  // Bill Number
      { wch: 15 },  // Lot Number
      { wch: 15 },  // Batch Number
      { wch: 25 },  // Party/Brand
      { wch: 25 },  // Fabric Name
      { wch: 15 },  // Shade
      { wch: 12 },  // Sent Rolls
      { wch: 15 },  // Received Rolls
      { wch: 14 },  // Roll Shortage
      { wch: 18 },  // Sent Weight (KG)
      { wch: 20 },  // Received Weight (KG)
      { wch: 20 },  // Weight Shortage (KG)
      { wch: 12 },  // Shortage %
      { wch: 12 }   // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shortage Report");
    XLSX.writeFile(wb, `Dyeing_Shortage_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="dyeing-report-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .dyeing-report-app {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: var(--text-primary, #1E293B);
          padding: 24px;
          min-height: calc(100vh - 70px);
          background-color: var(--bg-main, #F8FAFC);
        }

        .report-container {
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Top Header Area */
        .report-header {
          background: var(--bg-card, #FFFFFF);
          border: 1px solid var(--border-color, #E2E8F0);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          transition: all 0.3s ease;
        }

        .header-title-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-muted, #64748B);
          font-weight: 500;
        }

        .breadcrumb-separator {
          color: var(--text-muted, #94A3B8);
        }

        .report-header h1 {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0;
          background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .report-header p {
          font-size: 14px;
          color: var(--text-muted, #64748B);
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        /* KPI Dashboard Cards */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
        }

        .kpi-card {
          background: var(--bg-card, #FFFFFF);
          border: 1px solid var(--border-color, #E2E8F0);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
        }

        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
        }

        .kpi-card.sent::before { background: #2563EB; }
        .kpi-card.received::before { background: #10B981; }
        .kpi-card.shortage::before { background: #F59E0B; }
        .kpi-card.status-rate::before { background: #EF4444; }

        .kpi-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-card.sent .kpi-icon-wrap { background: #EFF6FF; color: #2563EB; }
        .kpi-card.received .kpi-icon-wrap { background: #ECFDF5; color: #10B981; }
        .kpi-card.shortage .kpi-icon-wrap { background: #FEF3C7; color: #D97706; }
        .kpi-card.status-rate .kpi-icon-wrap { background: #FEE2E2; color: #EF4444; }

        .kpi-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .kpi-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted, #64748B);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .kpi-value {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .kpi-subtext {
          font-size: 11px;
          color: var(--text-muted, #94A3B8);
        }

        /* Interactive Filter Bar */
        .filter-card {
          background: var(--bg-card, #FFFFFF);
          border: 1px solid var(--border-color, #E2E8F0);
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
        }

        .filter-row {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-container {
          flex: 1;
          min-width: 280px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
        }

        .search-input {
          width: 100%;
          padding: 10px 14px 10px 42px;
          border: 1.5px solid var(--border-color, #E2E8F0);
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          background: var(--bg-card, #FFFFFF);
          color: var(--text-primary, #1E293B);
          transition: all 0.2s ease;
        }

        .search-input:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary, #475569);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .select-input {
          padding: 10px 14px;
          border: 1.5px solid var(--border-color, #E2E8F0);
          border-radius: 10px;
          font-size: 14px;
          background: var(--bg-card, #FFFFFF);
          color: var(--text-primary, #1E293B);
          outline: none;
          min-width: 160px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .select-input:focus {
          border-color: #3B82F6;
        }

        .btn-refresh {
          padding: 10px;
          border-radius: 10px;
          border: 1.5px solid var(--border-color, #E2E8F0);
          background: var(--bg-card, #FFFFFF);
          color: var(--text-secondary, #475569);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .btn-refresh:hover {
          background: #F1F5F9;
          color: #1E293B;
          border-color: #CBD5E1;
        }

        /* Data Table & Grid Layout */
        .table-card {
          background: var(--bg-card, #FFFFFF);
          border: 1px solid var(--border-color, #E2E8F0);
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }

        .table-header-row {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color, #E2E8F0);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .table-header-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary, #1E293B);
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          background: var(--bg-header, #F8FAFC);
          padding: 14px 20px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary, #475569);
          border-bottom: 1.5px solid var(--border-color, #E2E8F0);
        }

        td {
          padding: 16px 20px;
          font-size: 14px;
          color: var(--text-primary, #334155);
          border-bottom: 1px solid var(--border-color, #F1F5F9);
          vertical-align: middle;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover td {
          background: var(--bg-row-hover, #F8FAFC);
        }

        /* Badges for Status */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge-approved {
          background-color: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }

        .badge-reject {
          background-color: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FEE2E2;
          animation: pulse-red 2s infinite;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: #FFFFFF;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
          box-shadow: 0 6px 14px rgba(37, 99, 235, 0.3);
        }

        .btn-secondary {
          background: #FFFFFF;
          color: var(--text-secondary, #475569);
          border: 1.5px solid var(--border-color, #E2E8F0);
        }

        .btn-secondary:hover {
          background: #F8FAFC;
          color: #0F172A;
          border-color: #CBD5E1;
        }

        .btn-back {
          background: #F1F5F9;
          color: #475569;
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .btn-back:hover {
          background: #E2E8F0;
          color: #1E293B;
        }

        /* Weight and discrepancy items styling */
        .text-bold {
          font-weight: 700;
        }

        .text-error {
          color: #EF4444;
          font-weight: 700;
        }

        .text-muted {
          color: #94A3B8;
          font-size: 12px;
        }

        .text-right {
          text-align: right;
        }

        .nowrap {
          white-space: nowrap;
        }

        /* Animations */
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        }

        /* Loading & Empty State */
        .loading-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 16px;
          background: var(--bg-card, #FFFFFF);
          border-radius: 16px;
          border: 1px solid var(--border-color, #E2E8F0);
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #E2E8F0;
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .empty-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 16px;
          background: var(--bg-card, #FFFFFF);
          border-radius: 16px;
          border: 1px solid var(--border-color, #E2E8F0);
          text-align: center;
        }

        .empty-icon-wrap {
          width: 64px;
          height: 64px;
          background: #ECFDF5;
          color: #10B981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-wrap h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .empty-wrap p {
          margin: 0;
          color: var(--text-muted, #64748B);
          font-size: 14px;
          max-width: 400px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Dark Mode overrides */
        html.dark .dyeing-report-app {
          --bg-main: #0F172A;
          --bg-card: #1E293B;
          --border-color: #334155;
          --text-primary: #F8FAFC;
          --text-secondary: #CBD5E1;
          --text-muted: #94A3B8;
          --bg-header: #1E293B;
          --bg-row-hover: #1E293B;
        }

        html.dark td {
          border-bottom: 1px solid #334155;
        }

        html.dark tr:hover td {
          background: #334155;
        }

        html.dark .select-input, html.dark .search-input, html.dark .btn-refresh {
          background: #1E293B;
          border-color: #334155;
          color: #F8FAFC;
        }

        html.dark .btn-secondary {
          background: #1E293B;
          color: #CBD5E1;
          border-color: #334155;
        }

        html.dark .btn-secondary:hover {
          background: #334155;
          color: #FFFFFF;
        }

        html.dark .btn-back {
          background: #334155;
          color: #CBD5E1;
        }

        html.dark .btn-back:hover {
          background: #475569;
          color: #FFFFFF;
        }

        /* Print media query style */
        @media print {
          .dyeing-report-app {
            padding: 0;
            background: white;
            color: black;
          }
          .report-header {
            box-shadow: none;
            border: none;
            padding: 0;
            margin-bottom: 20px;
          }
          .header-actions, .filter-card, .btn-back, .table-header-row .btn {
            display: none !important;
          }
          .kpi-card {
            box-shadow: none !important;
            border: 1px solid #CBD5E1 !important;
          }
          table {
            border: 1px solid #CBD5E1;
          }
          th, td {
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
          }
        }
      `}</style>

      <div className="report-container">
        {/* Navigation / Header */}
        <div className="report-header">
          <div className="header-title-block">
            <div className="breadcrumb">
              <button className="btn-back" onClick={() => navigate('/')}>
                <ArrowLeft size={14} /> Back
              </button>
              <span className="breadcrumb-separator">/</span>
              <span>Reports</span>
              <span className="breadcrumb-separator">/</span>
              <span style={{ color: '#3B82F6' }}>Dyeing Shortage</span>
            </div>
            <h1>Dyeing Shortage Report</h1>
            <p>Monitors fabric roll and weight shortage discrepancies between dispatch issuance and received dyeing lots.</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
            <button className="btn btn-primary" onClick={handleExport} disabled={!processedData.length}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Loading / Error / KPI cards */}
        {loading ? (
          <div className="loading-wrap">
            <div className="spinner"></div>
            <p>Loading shortage analysis data...</p>
          </div>
        ) : error ? (
          <div className="empty-wrap" style={{ borderColor: '#FEE2E2', background: '#FFF5F5' }}>
            <div className="empty-icon-wrap" style={{ background: '#FEE2E2', color: '#EF4444' }}>
              <AlertTriangle size={32} />
            </div>
            <h3>Error Loading Report</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchReport}>
              Retry Load
            </button>
          </div>
        ) : (
          <>
            {/* KPI Metrics Widgets */}
            <div className="kpi-grid">
              <div className="kpi-card sent">
                <div className="kpi-icon-wrap">
                  <Scale size={24} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Sent Weight</span>
                  <span className="kpi-value">{metrics.totalSentWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</span>
                  <span className="kpi-subtext">Weight dispatched to dyeing</span>
                </div>
              </div>

              <div className="kpi-card received">
                <div className="kpi-icon-wrap">
                  <CheckCircle2 size={24} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Received Weight</span>
                  <span className="kpi-value">{metrics.totalReceivedWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</span>
                  <span className="kpi-subtext">Weight received after dyeing</span>
                </div>
              </div>

              <div className="kpi-card shortage">
                <div className="kpi-icon-wrap">
                  <AlertTriangle size={24} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Shortage</span>
                  <span className="kpi-value text-error">{metrics.totalWeightShortage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</span>
                  <span className="kpi-subtext">Discrepancy loss</span>
                </div>
              </div>

              <div className="kpi-card status-rate">
                <div className="kpi-icon-wrap">
                  <Droplets size={24} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Overall Shortage Rate</span>
                  <span className="kpi-value">{metrics.overallShortagePct}%</span>
                  <span className="kpi-subtext">Average weight loss percentage</span>
                </div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="filter-card">
              <div className="filter-row">
                <div className="search-container">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by Lot No, Bill No, Brand, or Fabric..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="filter-item">
                  <span className="filter-label"><SlidersHorizontal size={14} /> Status:</span>
                  <select
                    className="select-input"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Approved">Approved (≤ 10%)</option>
                    <option value="Reject">Reject (&gt; 10%)</option>
                  </select>
                </div>

                <div className="filter-item">
                  <span className="filter-label"><ArrowUpDown size={14} /> Sort By:</span>
                  <select
                    className="select-input"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="shortagePctDesc">Shortage % (High to Low)</option>
                    <option value="shortagePctAsc">Shortage % (Low to High)</option>
                    <option value="lotNumberAsc">Lot Number (A-Z)</option>
                    <option value="lotNumberDesc">Lot Number (Z-A)</option>
                    <option value="sentWeightDesc">Sent Weight (High to Low)</option>
                    <option value="weightDiffDesc">Shortage Weight (High to Low)</option>
                  </select>
                </div>

                <button className="btn-refresh" onClick={fetchReport} title="Refresh Data">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* Main Table card */}
            <div className="table-card">
              <div className="table-header-row">
                <div className="table-header-title">
                  Shortage Comparison Table ({processedData.length} records matching)
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Reject Count: <span className="text-error">{metrics.rejectCount}</span> / Approved Count: <span style={{ color: '#10B981', fontWeight: 700 }}>{metrics.approvedCount}</span>
                </div>
              </div>

              {processedData.length === 0 ? (
                <div className="empty-wrap" style={{ border: 'none' }}>
                  <div className="empty-icon-wrap">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3>No Shortages Detected</h3>
                  <p>All matching logs are within perfect limits or no data matches your filters.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Bill No.</th>
                        <th>Lot No.</th>
                        <th>Batch No.</th>
                        <th>Brand / Party</th>
                        <th>Fabric Type</th>
                        <th>Shade</th>
                        <th className="text-right">Sent (Rolls / Kg)</th>
                        <th className="text-right">Received (Rolls / Kg)</th>
                        <th className="text-right">Shortage (Rolls / Kg)</th>
                        <th className="text-right">Shortage %</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.map((r, idx) => (
                        <tr key={idx}>
                          <td className="nowrap">{r.billNumber}</td>
                          <td className="text-bold nowrap">{r.lotNumber}</td>
                          <td className="nowrap">{r.batchNumber}</td>
                          <td>{r.brand}</td>
                          <td>{r.fabric}</td>
                          <td className="nowrap">{r.sentShade}</td>
                          <td className="text-right nowrap">
                            <span className="text-bold">{r.sentRolls}</span> rolls
                            <br />
                            <span className="text-muted">{r.sentWeight.toFixed(2)} kg</span>
                          </td>
                          <td className="text-right nowrap">
                            <span className="text-bold">{r.receivedRolls}</span> rolls
                            <br />
                            <span className="text-muted">{r.receivedWeight.toFixed(2)} kg</span>
                          </td>
                          <td className="text-right nowrap">
                            {r.rollDiff > 0 ? (
                              <span className="text-error">{r.rollDiff} rolls</span>
                            ) : (
                              <span>0 rolls</span>
                            )}
                            <br />
                            {r.weightDiff > 0 ? (
                              <span className="text-error">{r.weightDiff.toFixed(2)} kg</span>
                            ) : (
                              <span>0.00 kg</span>
                            )}
                          </td>
                          <td className={`text-right text-bold nowrap ${r.status === 'Reject' ? 'text-error' : ''}`} style={{ fontSize: '15px' }}>
                            {r.shortagePct}%
                          </td>
                          <td style={{ textAlign: 'center', width: '120px' }}>
                            {r.status === 'Reject' ? (
                              <span className="badge badge-reject">
                                <AlertTriangle size={12} /> Reject
                              </span>
                            ) : (
                              <span className="badge badge-approved">
                                <CheckCircle2 size={12} /> Approved
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}