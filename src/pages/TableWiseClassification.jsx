import React, { useState, useEffect } from 'react';
import { store } from '../store.js';
import {
  RefreshCw, Search, Layers, Calendar, User, UserCheck,
  MapPin, CheckCircle, AlertCircle, FileText, ClipboardList
} from 'lucide-react';

async function loadJsPDF() {
  const mod = await import('jspdf');
  return mod.jsPDF || mod.default;
}

export default function TableWiseClassification() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const response = await store.getTableWiseClassification();
      if (response && response.success) {
        setData(response.data || []);
      } else {
        setError(response?.message || 'Failed to fetch table-wise classification.');
      }
    } catch (err) {
      console.error('Error fetching table classification:', err);
      setError(err.message || 'An error occurred while fetching report data.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData(true);
  };

  const handleDownloadPDF = async () => {
    try {
      const jsPDF = await loadJsPDF();
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      let y = 15;

      const checkPage = (neededHeight) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = 15;
          drawHeader(true);
        }
      };

      const drawHeader = (isSubsequent = false) => {
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);

        if (!isSubsequent) {
          // Double top line
          doc.setLineWidth(0.6);
          doc.line(margin, y, pageWidth - margin, y);
          y += 1.5;
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;

          // Main Header Text (Tally style - uppercase, centered, bold)
          doc.setFont('Courier', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          const title = 'TABLE-WISE CLASSIFICATION REPORT';
          const titleWidth = doc.getTextWidth(title);
          doc.text(title, (pageWidth - titleWidth) / 2, y);
          y += 6;

          // Subtitle
          doc.setFont('Courier', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          const subtitle = 'ACTIVE / PENDING CUTTING LOTS PER TABLE';
          const subWidth = doc.getTextWidth(subtitle);
          doc.text(subtitle, (pageWidth - subWidth) / 2, y);
          y += 5;

          // Divider
          doc.setLineWidth(0.4);
          doc.setDrawColor(0, 0, 0);
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;

          // Tally Meta info
          doc.setFont('Courier', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(0, 0, 0);
          doc.text(`REPORT NAME   : TABLE-WISE CLASSIFICATION`, margin + 2, y);
          const dateStr = new Date().toLocaleString().toUpperCase();
          doc.text(`PRINTED ON    : ${dateStr}`, pageWidth - margin - 85, y);
          y += 4.5;
          doc.text(`ACTIVE TABLES : ${totalActiveTables}`, margin + 2, y);
          doc.text(`PENDING LOTS  : ${totalPendingLots}`, pageWidth - margin - 85, y);
          y += 4.5;

          // Divider
          doc.setLineWidth(0.4);
          doc.setDrawColor(0, 0, 0);
          doc.line(margin, y, pageWidth - margin, y);
          y += 8;
        } else {
          doc.setLineWidth(0.4);
          doc.setDrawColor(0, 0, 0);
          doc.line(margin, y, pageWidth - margin, y);
          y += 4;
          
          doc.setFont('Courier', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(0, 0, 0);
          doc.text('TABLE-WISE CLASSIFICATION REPORT (CONTINUED)', margin + 2, y);
          y += 3;
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;
        }
      };

      drawHeader(false);

      filteredData.forEach((group) => {
        if (group.lots.length === 0) return;
        
        checkPage(30);

        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);

        // Group Table Header (Tally Ledger style)
        doc.setFont('Courier', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(0, 0, 0);
        doc.text(`${group.tableNumber.toUpperCase()}`, margin + 2, y);
        y += 4;

        doc.setFont('Courier', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        const metaText = `SUPERVISOR: ${group.supervisor.toUpperCase()}  |  CUTTER MASTER: ${group.cutterMaster.toUpperCase()}  |  HALL: ${group.hall.toUpperCase()}`;
        doc.text(metaText, margin + 2, y);
        y += 3;

        // Table Header Underline
        doc.setLineWidth(0.2);
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;

        // Column Titles
        doc.setFont('Courier', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        
        const colLotX = margin + 2;
        const colJoX = margin + 25;
        const colFabricX = margin + 50;
        const colBrandX = margin + 95;
        const colStatusX = margin + 120;
        const colDateX = margin + 155;

        doc.text('LOT NO', colLotX, y);
        doc.text('JOB ORDER', colJoX, y);
        doc.text('FABRIC', colFabricX, y);
        doc.text('BRAND', colBrandX, y);
        doc.text('CUTTING STATUS', colStatusX, y);
        doc.text('ISSUED AT', colDateX, y);
        y += 3;

        doc.setDrawColor(0, 0, 0);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;

        // Lot Rows
        doc.setFont('Courier', 'normal');
        doc.setFontSize(7.5);

        group.lots.forEach((lot) => {
          checkPage(8);

          doc.setTextColor(0, 0, 0);
          doc.setDrawColor(0, 0, 0);
          doc.setFont('Courier', 'bold');
          doc.text(`${lot.lotNumber}`, colLotX, y);
          
          doc.setFont('Courier', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`${(lot.jobOrderNo || '—').toUpperCase()}`, colJoX, y);
          doc.text(`${(lot.fabric || '—').toUpperCase()}`, colFabricX, y);
          doc.text(`${(lot.brand || '—').toUpperCase()}`, colBrandX, y);
          doc.text(`${(lot.remarks || '—').toUpperCase()}`, colStatusX, y);

          let cleanDate = '';
          if (lot.issuedAt) {
            try {
              const d = new Date(lot.issuedAt);
              cleanDate = d.toLocaleDateString();
            } catch(e) {
              cleanDate = lot.issuedAt;
            }
          }
          doc.text((cleanDate || '—').toUpperCase(), colDateX, y);

          y += 5.5;
        });

        // Bottom border for the table group
        doc.setLineWidth(0.2);
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
      });

      // Save PDF
      doc.save(`TableWiseClassification_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  // Filter logic: Search by table number, lot number, fabric, brand, or supervisor
  const filteredData = data.map(tableGroup => {
    const matchedLots = tableGroup.lots.filter(lot => {
      const query = searchQuery.toLowerCase();
      return (
        lot.lotNumber.toLowerCase().includes(query) ||
        (lot.jobOrderNo || '').toLowerCase().includes(query) ||
        (lot.fabric || '').toLowerCase().includes(query) ||
        (lot.brand || '').toLowerCase().includes(query) ||
        (lot.remarks || '').toLowerCase().includes(query)
      );
    });

    return {
      ...tableGroup,
      lots: matchedLots,
      lotsCount: matchedLots.length
    };
  }).filter(tableGroup => {
    const query = searchQuery.toLowerCase();
    const tableMatches =
      tableGroup.tableNumber.toLowerCase().includes(query) ||
      (tableGroup.supervisor || '').toLowerCase().includes(query) ||
      (tableGroup.cutterMaster || '').toLowerCase().includes(query) ||
      (tableGroup.hall || '').toLowerCase().includes(query);

    // Keep the table group if the search matches the table attributes OR if there are matching lots inside it
    return tableMatches || tableGroup.lots.length > 0;
  });

  const totalActiveTables = data.length;
  const totalPendingLots = data.reduce((acc, curr) => acc + (curr.lots?.length || 0), 0);

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' ' + d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Overview Cards & Search Row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        padding: '16px 20px',
        borderRadius: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Info summaries */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ClipboardList size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Active Tables</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>
                {loading ? '...' : totalActiveTables}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Pending Lots to Cut</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>
                {loading ? '...' : totalPendingLots}
              </div>
            </div>
          </div>
        </div>

        {/* Actions (Search, Refresh) */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search table, lot, fabric..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                width: '240px',
                transition: 'all 0.15s ease',
              }}
              className="search-input"
            />
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={loading || filteredData.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 4px rgba(59,130,246,0.2)'
            }}
          >
            <FileText size={14} />
            Download PDF
          </button>

          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} style={{ transition: 'transform 0.5s ease' }} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 18px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '12px',
          color: '#b91c1c',
          fontSize: '14px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          gap: '12px'
        }}>
          <RefreshCw size={32} className="spin" style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Fetching active table information...</span>
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          gap: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '40px' }}>📦</div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>No Active Lots Pending Cutting</span>
          <span style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px' }}>
            All issued lots have been completely cut, or match your search criteria.
          </span>
        </div>
      ) : (
        /* Table Groups */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filteredData.map(group => (
            <div
              key={group.tableNumber}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 2px 14px rgba(0,0,0,0.03)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
              }}
            >
              {/* Table Header Details */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '15px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(59,130,246,0.2)'
                  }}>
                    {group.tableNumber}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
                      <User size={13} style={{ color: '#64748b' }} />
                      <span style={{ fontWeight: '500' }}>Supervisor:</span>
                      <strong style={{ color: '#1e293b' }}>{group.supervisor}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
                      <UserCheck size={13} style={{ color: '#64748b' }} />
                      <span style={{ fontWeight: '500' }}>Cutter Master:</span>
                      <strong style={{ color: '#1e293b' }}>{group.cutterMaster}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
                      <MapPin size={13} style={{ color: '#64748b' }} />
                      <span style={{ fontWeight: '500' }}>Hall:</span>
                      <strong style={{ color: '#1e293b' }}>{group.hall}</strong>
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#64748b',
                  background: '#e2e8f0',
                  padding: '4px 10px',
                  borderRadius: '20px'
                }}>
                  {group.lotsCount} Pending Lot{group.lotsCount !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Table Lots Body */}
              <div className="table-wrap" style={{ border: 'none', margin: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#ffffff' }}>
                      <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>Lot Number</th>
                      <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>Job Order</th>
                      <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>Fabric</th>
                      <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>Brand</th>
                      {/* <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>Shades</th> */}
                      {/* <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>Rolls Issued</th> */}
                      {/* <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>Weight Issued</th> */}
                      <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>Cutting Status</th>
                      <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>Issued At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lots.map((lot, lIdx) => {
                      const isPending = lot.remarks.toLowerCase().includes('pending');

                      return (
                        <tr
                          key={lot.lotNumber}
                          style={{
                            background: lIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            transition: 'background 0.15s ease'
                          }}
                          className="hover-row"
                        >
                          <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: '700', color: '#1e293b', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                            {lot.lotNumber}
                          </td>
                          <td style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#475569', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                            {lot.jobOrderNo || '—'}
                          </td>
                          <td style={{ padding: '14px 20px', fontSize: '13px', color: '#334155', fontWeight: '500', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                            {lot.fabric}
                          </td>
                          <td style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                            {lot.brand || '—'}
                          </td>
                          {/* <td style={{ padding: '14px 20px', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {lot.shades && lot.shades.length > 0 ? (
                                lot.shades.map((sh, sIdx) => (
                                  <span
                                    key={sIdx}
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid #e2e8f0'
                                    }}
                                  >
                                    {sh}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                              )}
                            </div>
                          </td> */}
                          {/* <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: '700', color: '#1e293b', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                            {lot.totalRolls}
                          </td> */}
                          {/* <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: '700', color: '#0f766e', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                            {lot.totalWeight} kg
                          </td> */}
                          <td style={{ padding: '14px 20px', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              background: isPending ? '#fffbeb' : '#f0fdf4',
                              color: isPending ? '#b45309' : '#166534',
                              border: `1px solid ${isPending ? '#fde68a' : '#bbf7d0'}`
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: isPending ? '#d97706' : '#15803d'
                              }} />
                              {lot.remarks}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '500', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <Calendar size={11} />
                              {formatDateTime(lot.issuedAt)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
