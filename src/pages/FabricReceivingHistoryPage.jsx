import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Printer, RotateCcw, Package, Calendar, User, Info, ArrowLeft, Download, X, Clock, Filter, FileText } from 'lucide-react';
import { BASE_URL } from '../store.js';

async function loadJsPDF() {
  const mod = await import('jspdf');
  return mod.jsPDF || mod.default;
}

export default function FabricReceivingHistoryPage() {
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState('all');
  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD for date-wise filter

  const API_URL = `${BASE_URL}/fabric-receiving/receiving-history`;

  // Helper to extract YYYY-MM-DD from item timestamp or date string
  const getItemDateString = (item) => {
    if (!item) return '';
    const dateVal = item.createdAt || item.returnDate || item.date || item.timestamp;
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) {
        const match = String(dateVal).match(/\d{4}-\d{2}-\d{2}/);
        return match ? match[0] : '';
      }
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setHistoryData(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to retrieve history');
      }
    } catch (err) {
      console.error('Error fetching receiving history:', err);
      setError(err.message || 'Failed to load receiving history. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique table numbers for dropdown filter
  const uniqueTables = useMemo(() => {
    const tables = new Set();
    historyData.forEach(item => {
      if (item.tableNumber && item.tableNumber !== '—') {
        item.tableNumber.split(', ').forEach(t => {
          if (t.trim()) tables.add(t.trim());
        });
      }
    });
    return Array.from(tables).sort();
  }, [historyData]);

  // Filter logic
  const filteredData = useMemo(() => {
    let data = historyData;

    // Filter by specific Date (YYYY-MM-DD)
    if (selectedDate) {
      data = data.filter(item => {
        const itemDate = getItemDateString(item);
        return itemDate === selectedDate;
      });
    }

    // Filter by table number dropdown
    if (selectedTable !== 'all') {
      data = data.filter(item => {
        if (!item.tableNumber || item.tableNumber === '—') return false;
        const tables = item.tableNumber.split(', ').map(t => t.trim());
        return tables.includes(selectedTable);
      });
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return data;
    return data.filter(item => {
      return (
        String(item.lotNumber || '').toLowerCase().includes(q) ||
        String(item.barcodeId || '').toLowerCase().includes(q) ||
        String(item.originalBarcodeId || '').toLowerCase().includes(q) ||
        String(item.shade || '').toLowerCase().includes(q) ||
        String(item.receivedBy || '').toLowerCase().includes(q) ||
        String(item.reason || '').toLowerCase().includes(q) ||
        String(item.tableNumber || '').toLowerCase().includes(q)
      );
    });
  }, [searchQuery, historyData, selectedTable, selectedDate]);

  // Group returns by lot number
  const groupedData = useMemo(() => {
    const groups = {};
    filteredData.forEach(item => {
      const lot = String(item.lotNumber || '—').trim();
      if (!groups[lot]) {
        groups[lot] = {
          lotNumber: lot,
          createdAt: item.createdAt,
          originalBarcodes: new Set(),
          shades: new Set(),
          returnedWeight: 0,
          receivedBy: new Set(),
          reasons: new Set(),
          tableNumbers: new Set()
        };
      }

      if (item.createdAt && (!groups[lot].createdAt || new Date(item.createdAt) > new Date(groups[lot].createdAt))) {
        groups[lot].createdAt = item.createdAt;
      }

      if (item.originalBarcodeId) groups[lot].originalBarcodes.add(item.originalBarcodeId);
      if (item.shade) groups[lot].shades.add(item.shade);
      groups[lot].returnedWeight += parseFloat(item.returnedWeight || 0);
      if (item.receivedBy) groups[lot].receivedBy.add(item.receivedBy);
      if (item.reason && item.reason !== '—') groups[lot].reasons.add(item.reason);
      if (item.tableNumber && item.tableNumber !== '—') {
        item.tableNumber.split(', ').forEach(t => groups[lot].tableNumbers.add(t.trim()));
      }
    });

    return Object.values(groups).map(g => ({
      ...g,
      originalBarcodeId: Array.from(g.originalBarcodes).join(', '),
      shade: Array.from(g.shades).join(', '),
      receivedBy: Array.from(g.receivedBy).join(', ') || 'System',
      reason: Array.from(g.reasons).join(' | ') || '—',
      tableNumber: Array.from(g.tableNumbers).join(', ') || '—'
    }));
  }, [filteredData]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalWeight = 0;
    const uniqueLots = new Set();
    filteredData.forEach(item => {
      totalWeight += parseFloat(item.returnedWeight || 0);
      if (item.lotNumber) {
        uniqueLots.add(String(item.lotNumber).trim());
      }
    });

    return {
      totalWeight,
      transactionCount: filteredData.length,
      lotCount: uniqueLots.size
    };
  }, [filteredData]);

  const handleDownloadPDF = async () => {
    try {
      const jsPDF = await loadJsPDF();
      const doc = new jsPDF('l', 'pt', 'a4');

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 30;
      let y = 35;

      const columns = [
        { key: 'date', label: 'DATE & TIME', w: 100, align: 'left' },
        { key: 'lot', label: 'LOT NO', w: 50, align: 'left' },
        { key: 'table', label: 'TABLE NO', w: 60, align: 'left' },
        { key: 'barcodes', label: 'ORIGINAL BARCODE ID', w: 170, align: 'left' },
        { key: 'shade', label: 'SHADE (COLOR)', w: 130, align: 'left' },
        { key: 'weight', label: 'RETURNED WT', w: 65, align: 'right' },
        { key: 'receiver', label: 'RECEIVED BY', w: 75, align: 'left' },
        { key: 'reason', label: 'REASON / DETAILS', w: 130, align: 'left' }
      ];

      const tableWidth = columns.reduce((sum, col) => sum + col.w, 0);

      const checkPage = (neededHeight) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = 35;
          drawHeader(true);
          drawColumnTitles();
        }
      };

      const drawHeader = (isSubsequent = false) => {
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);

        if (!isSubsequent) {
          // Double top line
          doc.setLineWidth(1.5);
          doc.line(margin, y, margin + tableWidth, y);
          y += 3;
          doc.line(margin, y, margin + tableWidth, y);
          y += 18;

          // Title
          doc.setFont('Courier', 'bold');
          doc.setFontSize(16);
          const title = 'FABRIC RECEIVED AGAINST LOT REPORT';
          const titleWidth = doc.getTextWidth(title);
          doc.text(title, margin + (tableWidth - titleWidth) / 2, y);
          y += 14;

          // Subtitle
          doc.setFont('Courier', 'bold');
          doc.setFontSize(10);
          const subtitle = 'COMPLETE REGISTER OF FABRIC RETURNS BY LOT NUMBER';
          const subWidth = doc.getTextWidth(subtitle);
          doc.text(subtitle, margin + (tableWidth - subWidth) / 2, y);
          y += 15;

          // Divider
          doc.setLineWidth(1);
          doc.line(margin, y, margin + tableWidth, y);
          y += 15;

          // Meta
          doc.setFont('Courier', 'bold');
          doc.setFontSize(9);
          doc.text('REPORT TYPE  : FABRIC RETURNS LEDGER', margin + 5, y);
          const dateStr = new Date().toLocaleString().toUpperCase();
          doc.text(`PRINTED ON   : ${dateStr}`, margin + tableWidth - 220, y);
          y += 12;

          const dateFilterLabel = selectedDate
            ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
            : 'ALL DATES (FULL HISTORY)';
          doc.text(`DATE FILTER  : ${dateFilterLabel}`, margin + 5, y);
          doc.text(`TABLE FILTER : ${selectedTable !== 'all' ? selectedTable.toUpperCase() : 'ALL TABLES'}`, margin + tableWidth - 220, y);
          y += 12;

          doc.text(`TOTAL LOTS   : ${metrics.lotCount}`, margin + 5, y);
          doc.text(`TOTAL WEIGHT : ${metrics.totalWeight.toFixed(2)} KG`, margin + tableWidth - 220, y);
          y += 12;

          // Divider
          doc.line(margin, y, margin + tableWidth, y);
          y += 20;
        } else {
          doc.setLineWidth(1);
          doc.line(margin, y, margin + tableWidth, y);
          y += 12;
          doc.setFont('Courier', 'bold');
          doc.setFontSize(9);
          doc.text('FABRIC RECEIVED AGAINST LOT REPORT (CONTINUED)', margin + 5, y);
          y += 8;
          doc.line(margin, y, margin + tableWidth, y);
          y += 15;
        }
      };

      const drawColumnTitles = () => {
        doc.setFont('Courier', 'bold');
        doc.setFontSize(8.5);

        // Draw header row borders
        doc.setLineWidth(1);
        doc.rect(margin, y - 10, tableWidth, 18);

        let currentX = margin;
        columns.forEach(col => {
          if (currentX > margin) {
            doc.line(currentX, y - 10, currentX, y + 8);
          }
          let textX = currentX + 5;
          if (col.align === 'right') {
            textX = currentX + col.w - doc.getTextWidth(col.label) - 5;
          }
          doc.text(col.label, textX, y + 2);
          currentX += col.w;
        });

        y += 8;
        y += 12; // vertical gap to first row
      };

      drawHeader(false);
      drawColumnTitles();

      doc.setFont('Courier', 'bold');
      doc.setFontSize(8.5);

      groupedData.forEach((item) => {
        const formattedDate = item.createdAt
          ? new Date(item.createdAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).toUpperCase()
          : (item.returnDate || 'N/A').toUpperCase();

        const rowData = {
          date: formattedDate,
          lot: String(item.lotNumber).toUpperCase(),
          table: String(item.tableNumber || '—').toUpperCase(),
          barcodes: String(item.originalBarcodeId || '—').toUpperCase(),
          shade: String(item.shade || '—').toUpperCase(),
          weight: `${parseFloat(item.returnedWeight || 0).toFixed(2)} KG`,
          receiver: String(item.receivedBy || 'SYSTEM').toUpperCase(),
          reason: String(item.reason || '—').toUpperCase()
        };

        // Split text for cells
        const cellLines = {};
        let maxLines = 1;
        columns.forEach(col => {
          const lines = doc.splitTextToSize(rowData[col.key], col.w - 10);
          cellLines[col.key] = lines;
          if (lines.length > maxLines) {
            maxLines = lines.length;
          }
        });

        const rowHeight = maxLines * 11 + 8;
        checkPage(rowHeight);

        // Draw row outer rectangle
        doc.setLineWidth(0.5);
        doc.rect(margin, y - 8, tableWidth, rowHeight);

        let currentX = margin;
        columns.forEach(col => {
          // Draw cell vertical line
          if (currentX > margin) {
            doc.line(currentX, y - 8, currentX, y - 8 + rowHeight);
          }

          // Draw wrapped text inside cell
          const lines = cellLines[col.key];
          lines.forEach((lineText, lineIdx) => {
            let textX = currentX + 5;
            if (col.align === 'right') {
              textX = currentX + col.w - doc.getTextWidth(lineText) - 5;
            }
            doc.text(lineText, textX, y + 2 + (lineIdx * 11));
          });

          currentX += col.w;
        });

        y += rowHeight;
      });

      // Bottom Double Line
      y -= 4;
      doc.setLineWidth(1.5);
      doc.line(margin, y, margin + tableWidth, y);
      y += 3;
      doc.line(margin, y, margin + tableWidth, y);

      const fileDateTag = selectedDate ? selectedDate : new Date().toISOString().slice(0, 10);
      doc.save(`Fabric_Received_Report_${fileDateTag}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to export PDF: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Quick Date presets
  const todayStr = new Date().toISOString().slice(0, 10);
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const yesterdayStr = getYesterdayStr();

  return (
    <div className="receiving-history-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

        .receiving-history-app {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #1e293b;
          width: 100% !important;
          max-width: 100% !important;
          padding: 0 0 32px 0 !important;
          min-height: 100%;
          background-color: transparent;
        }

        .history-container {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Header block */
        .history-header {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        .dark .history-header {
          background: #1e293b;
          border-color: #334155;
        }

        .title-area {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .title-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
          border: 1px solid rgba(99, 102, 241, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4F46E5;
          font-size: 22px;
          flex-shrink: 0;
        }

        .title-text-group h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .dark .title-text-group h1 {
          color: #f8fafc;
        }

        .title-text-group p {
          margin: 3px 0 0 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
        }
        .dark .title-text-group p {
          color: #94a3b8;
        }

        /* Filter Controls Toolbar */
        .controls-toolbar {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          width: 100%;
          box-sizing: border-box;
        }
        .dark .controls-toolbar {
          background: #1e293b;
          border-color: #334155;
        }

        .toolbar-left-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          flex: 1;
        }

        .toolbar-right-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .date-filter-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          padding: 4px 10px;
          transition: all 0.2s ease;
        }
        .dark .date-filter-box {
          background: #0f172a;
          border-color: #334155;
        }
        .date-filter-box:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
          background: #ffffff;
        }
        .date-filter-box label {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .date-input {
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          outline: none;
          cursor: pointer;
          font-family: inherit;
        }
        .dark .date-input {
          color: #f8fafc;
        }

        .quick-date-pills {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .date-pill-btn {
          padding: 6px 11px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 750;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .dark .date-pill-btn {
          background: #0f172a;
          border-color: #334155;
          color: #94a3b8;
        }
        .date-pill-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
          border-color: #94a3b8;
        }
        .date-pill-btn.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        }

        .search-wrapper {
          position: relative;
          min-width: 260px;
          flex: 1;
          max-width: 380px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          width: 15px;
          height: 15px;
        }

        .search-input {
          width: 100%;
          padding: 8px 14px 8px 34px;
          border-radius: 10px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          font-size: 13px;
          font-weight: 600;
          outline: none;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }
        .dark .search-input {
          background: #0f172a;
          border-color: #334155;
          color: #f8fafc;
        }
        .search-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .table-select-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          padding: 2px 8px;
        }
        .dark .table-select-box {
          background: #0f172a;
          border-color: #334155;
        }
        .table-select {
          border: none;
          background: transparent;
          font-size: 12.5px;
          font-weight: 750;
          color: #0f172a;
          outline: none;
          padding: 6px 4px;
          cursor: pointer;
        }
        .dark .table-select {
          color: #f8fafc;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 750;
          font-size: 13px;
          cursor: pointer;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          transition: all 0.15s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
        }
        .dark .btn {
          background: #0f172a;
          border-color: #334155;
          color: #f8fafc;
        }
        .btn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
          transform: translateY(-1px);
        }
        .dark .btn:hover {
          background: #1e293b;
          color: #ffffff;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          color: #ffffff !important;
          border: none !important;
          box-shadow: 0 3px 10px rgba(37, 99, 235, 0.3) !important;
        }
        .btn-primary:hover {
          background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%) !important;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4) !important;
        }

        /* Active Date Banner */
        .active-date-banner {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border: 1.5px solid #93C5FD;
          border-radius: 12px;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          color: #1E40AF;
          font-size: 13px;
          font-weight: 700;
        }
        .dark .active-date-banner {
          background: rgba(37, 99, 235, 0.15);
          border-color: rgba(96, 165, 250, 0.35);
          color: #93C5FD;
        }
        .date-banner-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .date-banner-highlight {
          background: #2563EB;
          color: #FFFFFF;
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 850;
        }
        .btn-clear-date {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #FFFFFF;
          border: 1px solid #BFDBFE;
          color: #1E40AF;
          font-size: 11.5px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .dark .btn-clear-date {
          background: #1e293b;
          border-color: #334155;
          color: #93C5FD;
        }
        .btn-clear-date:hover {
          background: #DBEAFE;
        }

        /* Metrics grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
          width: 100%;
        }

        .metric-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease;
        }
        .dark .metric-card {
          background: #1e293b;
          border-color: #334155;
        }
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
          border-color: #3B82F6;
        }

        .metric-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .metric-details {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 11.5px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 800;
          letter-spacing: 0.6px;
        }
        .dark .metric-label {
          color: #94a3b8;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 900;
          margin-top: 4px;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .dark .metric-value {
          color: #f8fafc;
        }

        .metric-purple .metric-icon-box { background: rgba(99, 102, 241, 0.12); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.2); }
        .metric-emerald .metric-icon-box { background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .metric-amber .metric-icon-box { background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }

        /* Content block */
        .history-content {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
          width: 100%;
          box-sizing: border-box;
        }
        .dark .history-content {
          background: #1e293b;
          border-color: #334155;
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          width: 100%;
        }
        .dark .table-wrapper {
          border-color: #334155;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .history-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.6px;
          padding: 13px 16px;
          border: 1px solid #e2e8f0;
          text-align: left;
          white-space: nowrap;
        }
        .dark .history-table th {
          background: #0f172a;
          color: #94a3b8;
          border-color: #334155;
        }

        .history-table td {
          padding: 13px 16px;
          border: 1px solid #e2e8f0;
          color: #334155;
          font-weight: 500;
        }
        .dark .history-table td {
          border-color: #334155;
          color: #cbd5e1;
        }

        .history-table tr:hover td {
          background-color: #f8fafc;
        }
        .dark .history-table tr:hover td {
          background-color: rgba(255, 255, 255, 0.02);
        }

        .barcode-cell {
          font-family: monospace;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 12px;
          border: 1px solid #dbeafe;
        }
        .dark .barcode-cell {
          background: rgba(37, 99, 235, 0.15);
          color: #93c5fd;
          border-color: rgba(59, 130, 246, 0.3);
        }

        .lot-cell {
          font-weight: 800;
          color: #0f172a;
        }
        .dark .lot-cell {
          color: #f8fafc;
        }

        .shade-badge {
          display: inline-block;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          background-color: #f1f5f9;
          color: #475569;
          font-size: 11.5px;
          border: 1px solid #e2e8f0;
        }
        .dark .shade-badge {
          background: #0f172a;
          border-color: #334155;
          color: #94a3b8;
        }

        .weight-pill {
          display: inline-block;
          font-weight: 850;
          padding: 4px 10px;
          border-radius: 6px;
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #bbf7d0;
          font-size: 13px;
        }
        .dark .weight-pill {
          background: rgba(16, 185, 129, 0.15);
          color: #6ee7b7;
          border-color: rgba(16, 185, 129, 0.3);
        }

        /* States */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 12px;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3.5px solid #cbd5e1;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .error-state {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fca5a5;
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 13.5px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .empty-icon {
          font-size: 40px;
          margin-bottom: 12px;
          opacity: 0.6;
        }

        .empty-state h3 {
          margin: 0 0 6px 0;
          font-weight: 800;
          color: #0f172a;
          font-size: 16px;
        }
        .dark .empty-state h3 {
          color: #f8fafc;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media print {
          body {
            background: #ffffff !important;
          }
          .receiving-history-app {
            padding: 0 !important;
            background: #ffffff !important;
          }
          .history-header, .controls-toolbar, .metrics-grid, .btn:not(.print-only), .active-date-banner {
            display: none !important;
          }
          .history-content {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          .table-wrapper {
            border: none !important;
            border-radius: 0 !important;
          }
          .history-table th {
            background: #f1f5f9 !important;
            color: #000000 !important;
            border-bottom: 2px solid #000000 !important;
          }
          .history-table td {
            border-bottom: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>

      <div className="history-container">
        {/* Header Block with Back button and Title */}
        <header className="history-header">
          <div className="title-area">
            <button className="btn" onClick={() => navigate(-1)} title="Go back">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="title-icon-badge">
              📥
            </div>
            <div className="title-text-group">
              <h1>Fabric Received Against Lot Report</h1>
              <p>Complete record of received fabric returns & roll transactions from database</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn" onClick={fetchHistory} title="Refresh latest data">
              <RotateCcw size={15} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={handleDownloadPDF} title="Download PDF of current view">
              <Download size={15} /> Download PDF
            </button>
            <button className="btn btn-primary" onClick={handlePrint} title="Print current view">
              <Printer size={15} /> Print Report
            </button>
          </div>
        </header>

        {/* Filter Controls Toolbar */}
        <div className="controls-toolbar">
          <div className="toolbar-left-group">
            {/* Date-Wise Filter Input */}
            <div className="date-filter-box">
              <label>
                <Calendar size={13} />
                <span>Date:</span>
              </label>
              <input
                type="date"
                className="date-input"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                title="Select a specific day to view & download returned logs"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '0 2px' }}
                  title="Clear date filter"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Date Preset Chips */}
            <div className="quick-date-pills">
              <button
                type="button"
                className={`date-pill-btn ${!selectedDate ? 'active' : ''}`}
                onClick={() => setSelectedDate('')}
              >
                All Dates
              </button>
              <button
                type="button"
                className={`date-pill-btn ${selectedDate === todayStr ? 'active' : ''}`}
                onClick={() => setSelectedDate(todayStr)}
              >
                Today
              </button>
              <button
                type="button"
                className={`date-pill-btn ${selectedDate === yesterdayStr ? 'active' : ''}`}
                onClick={() => setSelectedDate(yesterdayStr)}
              >
                Yesterday
              </button>
            </div>

            {/* Table Dropdown Filter */}
            <div className="table-select-box">
              <span style={{ fontSize: 11, fontWeight: 800, color: '#647489', textTransform: 'uppercase' }}>Table:</span>
              <select
                value={selectedTable}
                onChange={e => setSelectedTable(e.target.value)}
                className="table-select"
              >
                <option value="all">ALL TABLES</option>
                {uniqueTables.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="toolbar-right-group">
            {/* Search Input */}
            <div className="search-wrapper">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search Lot, Barcode, Color..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Active Filter Notification Banner */}
        {selectedDate && (
          <div className="active-date-banner">
            <div className="date-banner-left">
              <span>📅 Filter Active:</span>
              <span className="date-banner-highlight">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <span>— Showing {filteredData.length} records ({metrics.totalWeight.toFixed(2)} KG returned)</span>
            </div>
            <button className="btn-clear-date" onClick={() => setSelectedDate('')}>
              <X size={13} /> Reset to All Dates
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="error-state">
            <span>⚠️</span>
            <div style={{ flex: 1 }}>{error}</div>
            <button className="btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={fetchHistory}>
              Retry
            </button>
          </div>
        )}

        {/* Metrics Grid */}
        {!loading && !error && (
          <div className="metrics-grid">
            <div className="metric-card metric-purple">
              <div className="metric-icon-box">⚖️</div>
              <div className="metric-details">
                <span className="metric-label">
                  {selectedDate ? 'Day Returned Weight' : 'Total Weight Returned'}
                </span>
                <span className="metric-value">{metrics.totalWeight.toFixed(2)} KG</span>
              </div>
            </div>

            <div className="metric-card metric-emerald">
              <div className="metric-icon-box">📦</div>
              <div className="metric-details">
                <span className="metric-label">
                  {selectedDate ? 'Day Return Records' : 'Return Transactions'}
                </span>
                <span className="metric-value">{metrics.transactionCount} Records</span>
              </div>
            </div>

            <div className="metric-card metric-amber">
              <div className="metric-icon-box">🏷️</div>
              <div className="metric-details">
                <span className="metric-label">Unique Lots Affected</span>
                <span className="metric-value">{metrics.lotCount} Lots</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Block */}
        <main className="history-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <div style={{ fontWeight: 700, color: '#64748B' }}>Loading receiving history from MySQL database...</div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>No receiving history found {selectedDate ? `for ${selectedDate}` : ''}</h3>
              <p>{searchQuery ? 'No records match your search query.' : selectedDate ? 'No fabric returns recorded on this specific date. Try selecting another date or "All Dates".' : 'No return transactions have been recorded in the database.'}</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Lot Number</th>
                    <th>Table Number</th>
                    <th>Original Barcode ID</th>
                    <th>Shade (Color)</th>
                    <th>Returned Wt (KG)</th>
                    <th>Received By</th>
                    <th>Reason / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData.map((item) => {
                    const formattedDate = item.createdAt
                      ? new Date(item.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                      : item.returnDate || 'N/A';

                    return (
                      <tr key={item.lotNumber}>
                        <td>{formattedDate}</td>
                        <td className="lot-cell">{item.lotNumber}</td>
                        <td style={{ fontWeight: 700, color: '#374151' }}>{item.tableNumber}</td>
                        <td>
                          <span className="barcode-cell" style={{ wordBreak: 'break-word', whiteSpace: 'normal', display: 'inline-block', maxWidth: '300px' }}>
                            {item.originalBarcodeId}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {item.shade ? item.shade.split(', ').map((sh, sIdx) => (
                              <span key={sIdx} className="shade-badge">{sh}</span>
                            )) : '—'}
                          </div>
                        </td>
                        <td>
                          <span className="weight-pill">{parseFloat(item.returnedWeight || 0).toFixed(2)} KG</span>
                        </td>
                        <td>{item.receivedBy}</td>
                        <td>{item.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
