import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../store.js';

const STATUS_COLORS = {
  Missing: { bg: '#fff5f5', border: '#fee2e2', text: '#e53e3e', dot: '#f56565' },
  Saved: { bg: '#f0fdf4', border: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  Corrupt: { bg: '#fff7ed', border: '#ffedd5', text: '#c2410c', dot: '#f97316' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Lots' },
  { value: 'missing', label: 'Missing Parta' },
  { value: 'kharcha', label: 'Pending Kharcha' },
  { value: 'vapsi', label: 'Pending Kapda Wapsi' },
  { value: 'unchecked', label: 'Not Confirmed' },
];

export default function PartaPendingPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/parta/pending-report`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load report');
      setReports(json.reports || []);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message || 'Unable to load pending report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const stats = useMemo(() => {
    const total = reports.length;
    const missing = reports.filter(r => r.status === 'Missing').length;
    const pendingKharcha = reports.filter(r => r.kharchaPending).length;
    const pendingVapsi = reports.filter(r => r.vapsiPending).length;
    const unchecked = reports.filter(r => r.checkedBySahilSir !== 'yes').length;
    const fullyComplete = reports.filter(
      r => r.status === 'Saved' && !r.kharchaPending && !r.vapsiPending && r.checkedBySahilSir === 'yes'
    ).length;
    return { total, missing, pendingKharcha, pendingVapsi, unchecked, fullyComplete };
  }, [reports]);

  const filteredReports = useMemo(() => {
    let filtered = [...reports];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(r => String(r.lotNumber).toLowerCase().includes(s) || r.fabricName?.toLowerCase().includes(s));
    }
    if (filter === 'missing') filtered = filtered.filter(r => r.status === 'Missing');
    else if (filter === 'kharcha') filtered = filtered.filter(r => r.kharchaPending);
    else if (filter === 'vapsi') filtered = filtered.filter(r => r.vapsiPending);
    else if (filter === 'unchecked') filtered = filtered.filter(r => r.checkedBySahilSir !== 'yes');
    return filtered;
  }, [reports, search, filter]);

  const handleGoToParta = (lotNumber) => {
    navigate(`/parta?lot=${encodeURIComponent(lotNumber)}`);
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const pendingBadge = (label, pending, value = null, colorPending = '#ef4444', colorOk = '#10b981') => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      fontSize: '11px', fontWeight: '800', letterSpacing: '0.3px',
      background: pending ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
      color: pending ? colorPending : colorOk,
      border: `1px solid ${pending ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
    }}>
      <span style={{ fontSize: 9 }}>{pending ? '●' : '✓'}</span>
      {label}{value !== null && !pending ? `: ${value}` : ''}
    </span>
  );

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 40px',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      backgroundColor: '#f8fafc',
      color: '#1e293b'
    }}>
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '900',
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.75px',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              ⚠️ Pending Info in Parta
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: 8, marginBottom: 0, fontWeight: 500 }}>
              Live audit of lot numbers with missing or incomplete Parta data in the database
              {lastRefreshed && (
                <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: '13px', fontWeight: 'normal' }}>
                  · Last refreshed at {formatTime(lastRefreshed)}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 12, border: 'none',
              background: loading ? '#e2e8f0' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: loading ? '#94a3b8' : '#fff', fontWeight: '800', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(79, 70, 229, 0.35)'; } }}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.25)'; } }}
          >
            <span style={{
              fontSize: 16,
              display: 'inline-block',
              animation: loading ? 'spin 1s linear infinite' : 'none'
            }}>{loading ? '⏳' : '🔄'}</span>
            {loading ? 'Refreshing...' : 'Refresh Report'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 16,
          padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12,
          color: '#991b1b', fontWeight: '600', fontSize: '14px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
        }}>
          <span style={{ fontSize: 20 }}>❌</span>
          {error}
          <button onClick={fetchReport} style={{
            marginLeft: 'auto', padding: '6px 16px', borderRadius: 10,
            border: '1px solid #fca5a5', background: '#fff', color: '#991b1b',
            fontWeight: '700', cursor: 'pointer', fontSize: '13px',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
        {[
          { label: 'Total Lots Tracked', value: stats.total, icon: '📦', color: '#4f46e5', bg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', border: 'rgba(79, 70, 229, 0.15)' },
          { label: 'Fully Complete', value: stats.fullyComplete, icon: '✅', color: '#16a34a', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: 'rgba(22, 163, 74, 0.15)' },
          { label: 'Missing Parta', value: stats.missing, icon: '🚫', color: '#dc2626', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: 'rgba(220, 38, 38, 0.15)' },
          { label: 'Pending Kharcha', value: stats.pendingKharcha, icon: '💰', color: '#d97706', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: 'rgba(217, 119, 6, 0.15)' },
          { label: 'Pending Kapda Wapsi', value: stats.pendingVapsi, icon: '🔄', color: '#0891b2', bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: 'rgba(8, 145, 178, 0.15)' },
          { label: 'Not Confirmed', value: stats.unchecked, icon: '⏳', color: '#7c3aed', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: 'rgba(124, 58, 237, 0.15)' },
        ].map(card => (
          <div key={card.label} style={{
            background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16,
            padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 24px -10px ${card.color}44`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: card.color, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.75px' }}>{card.label}</span>
              <span style={{ fontSize: 22, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: card.color, lineHeight: 1.1, marginTop: 4 }}>{loading ? '—' : card.value}</div>
          </div>
        ))}
      </div>

      {/* Control Toolbar */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center',
        background: '#fff', padding: '16px 20px', borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 300px', minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 14, top: '55%', transform: 'translateY(-50%)', fontSize: 16, color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Lot Number or Fabric type..."
            style={{
              width: '100%', padding: '12px 14px 12px 42px', border: '1.5px solid #e2e8f0',
              borderRadius: 12, fontSize: '14px', color: '#0f172a', outline: 'none',
              background: '#f8fafc', boxSizing: 'border-box',
              transition: 'all 0.2s',
              fontWeight: 500
            }}
            onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(opt => {
            const isActive = filter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                style={{
                  padding: '9px 18px', borderRadius: 10, fontSize: '13px', fontWeight: '800', cursor: 'pointer',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : '#f1f5f9',
                  color: isActive ? '#fff' : '#475569',
                  boxShadow: isActive ? '0 4px 10px rgba(79,70,229,0.2)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = '#e2e8f0'; }}
                onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = '#f1f5f9'; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Count display */}
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', fontWeight: '700', whiteSpace: 'nowrap' }}>
          Showing <span style={{ color: '#4f46e5', fontWeight: '800' }}>{filteredReports.length}</span> of <span style={{ fontWeight: '800' }}>{reports.length}</span> lots
        </div>
      </div>

      {/* Table Container */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
        overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        marginBottom: 32
      }}>
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#64748b' }}>
            <div style={{
              width: 50, height: 50, border: '4px solid #f1f5f9', borderTopColor: '#4f46e5',
              borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite',
              marginBottom: 16
            }} />
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Loading pending reports...</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: 4 }}>Accessing database logs</div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '48px', marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
              {search || filter !== 'all' ? 'No lots match your filters' : 'All Clear! No pending reports'}
            </div>
            <div style={{ fontSize: '14px', color: '#94a3b8', maxWidth: 400, margin: '0 auto' }}>
              {search || filter !== 'all' ? 'Try adjusting your search query or selecting a different filter option.' : 'Every lot in the active database has complete and verified Parta information.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Lot Number', 'Fabric & Brand details', 'Parta Status', 'Kharcha Info', 'Kapda Wapsi (KG)', 'Sahil Sir Check', 'Action'].map((header, i) => (
                    <th key={i} style={{
                      padding: '18px 24px', color: '#475569',
                      fontWeight: '800', fontSize: '12px', letterSpacing: '0.75px', textTransform: 'uppercase',
                      whiteSpace: 'nowrap'
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report, idx) => {
                  const sc = STATUS_COLORS[report.status] || STATUS_COLORS.Saved;
                  return (
                    <tr
                      key={report.lotNumber}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f8fafc'}
                    >
                      {/* Lot Number */}
                      <td style={{ padding: '18px 24px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: sc.dot, flexShrink: 0,
                            boxShadow: `0 0 8px ${sc.dot}`
                          }} />
                          <span style={{ fontWeight: '900', color: '#0f172a', fontSize: '16px', letterSpacing: '-0.25px' }}>
                            {report.lotNumber}
                          </span>
                        </div>
                      </td>

                      {/* Fabric / Brand */}
                      <td style={{ padding: '18px 24px' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
                          {report.fabricName || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 'normal' }}>Name not registered</span>}
                        </div>
                        {report.brand && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: 4, fontWeight: '500' }}>{report.brand}</div>
                        )}
                      </td>

                      {/* Parta Status */}
                      <td style={{ padding: '18px 24px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px', borderRadius: 20,
                          background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                          fontSize: '12px', fontWeight: '800',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                          {report.status === 'Missing' ? '🚫' : report.status === 'Corrupt' ? '⚠️' : '💾'}
                          {report.status}
                        </span>
                      </td>

                      {/* Kharcha */}
                      <td style={{ padding: '18px 24px' }}>
                        {pendingBadge(
                          report.kharchaPending ? 'Pending' : 'Done',
                          report.kharchaPending,
                          !report.kharchaPending ? `₹${report.kharchaValue}` : null,
                          '#ef4444',
                          '#10b981'
                        )}
                      </td>

                      {/* Kapda Wapsi */}
                      <td style={{ padding: '18px 24px' }}>
                        {pendingBadge(
                          report.vapsiPending ? 'Pending' : `${parseFloat(report.vapsiValue || 0).toFixed(2)} KG`,
                          report.vapsiPending,
                          null,
                          '#0891b2',
                          '#0891b2'
                        )}
                      </td>

                      {/* Confirmed */}
                      <td style={{ padding: '18px 24px' }}>
                        {report.checkedBySahilSir === 'yes' ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 12px', borderRadius: 20, fontSize: '12px', fontWeight: '800',
                            background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                          }}>✓ Confirmed</span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 12px', borderRadius: 20, fontSize: '12px', fontWeight: '800',
                            background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.2)',
                          }}>⏳ Pending</span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '18px 24px' }}>
                        <button
                          onClick={() => handleGoToParta(report.lotNumber)}
                          style={{
                            padding: '8px 16px', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            color: '#fff', fontWeight: '800', fontSize: '12px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 14px rgba(79, 70, 229, 0.3)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 10px rgba(79, 70, 229, 0.2)'; }}
                          title={`Open Lot ${report.lotNumber} in Parta editor`}
                        >
                          <span>🔗</span> Open Lot
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {!loading && filteredReports.length > 0 && (
          <div style={{
            padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
              📊 {filteredReports.length} lot(s) displayed · {stats.missing} missing entirely · {stats.pendingKharcha} pending Kharcha · {stats.pendingVapsi} pending Kapda Wapsi
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {stats.fullyComplete > 0 && (
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: 20 }}>
                  ✅ {stats.fullyComplete} complete
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend Card */}
      <div style={{
        padding: '20px 24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center'
      }}>
        <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.75px' }}>Report Legend:</span>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { icon: '🚫', label: 'Missing Parta: No records saved', color: '#dc2626' },
            { icon: '💾', label: 'Saved: Record exists', color: '#16a34a' },
            { icon: '⚠️', label: 'Corrupt: Data error', color: '#f97316' },
            { icon: '● Pending', label: 'Required fields missing', color: '#ef4444' },
            { icon: '✓ Done', label: 'Verification fields complete', color: '#10b981' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: '#475569', fontWeight: 500 }}>
              <span style={{ color: item.color, fontWeight: '800' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
}

