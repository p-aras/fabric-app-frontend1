import React, { useState, useEffect, useMemo } from 'react';
import { store, BASE_URL } from '../store.js';
import {
  FileText, Search, RefreshCw, CheckCircle2,
  AlertTriangle, AlertCircle, ArrowUpDown, ChevronDown, Check,
  Database, ShoppingBag, Eye, TrendingDown, TrendingUp
} from 'lucide-react';

const FabricPoAudit = () => {
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');

  // Sorting states
  const [sortField, setSortField] = useState('poNumber');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  useEffect(() => {
    fetchAuditReport();
  }, []);

  const fetchAuditReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/po/audit`);
      if (!res.ok) {
        throw new Error(`Failed to retrieve audit: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success && data.report) {
        const fabricOnly = data.report.filter(item => 
          item.department && item.department.toLowerCase() === 'fabric'
        );
        setAuditData(fabricOnly);
      } else {
        throw new Error('Invalid format returned from audit API');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to connect to sheets server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAuditReport();
  };

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const depts = new Set();
    auditData.forEach(item => {
      if (item.department) depts.add(item.department);
    });
    return ['All', ...Array.from(depts)];
  }, [auditData]);

  // Handle sort toggle
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and Sort audit data
  const processedData = useMemo(() => {
    let filtered = [...auditData];

    // Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.poNumber && item.poNumber.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.department && item.department.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Department filter
    if (deptFilter !== 'All') {
      filtered = filtered.filter(item => item.department === deptFilter);
    }

    // Sorting logic
    filtered.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Treat null/undefined as empty values
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
    });

    return filtered;
  }, [auditData, searchQuery, statusFilter, deptFilter, sortField, sortOrder]);

  // Compute overall KPI stats
  const stats = useMemo(() => {
    let totalPos = new Set();
    let totalItems = auditData.length;
    let matches = 0;
    let shortages = 0;
    let excesses = 0;

    auditData.forEach(item => {
      if (item.poNumber) totalPos.add(item.poNumber.toLowerCase());
      if (item.status === 'Match') matches++;
      else if (item.status === 'Shortage') shortages++;
      else if (item.status === 'Excess') excesses++;
    });

    return {
      poCount: totalPos.size,
      itemCount: totalItems,
      matchCount: matches,
      shortageCount: shortages,
      excessCount: excesses,
      matchRate: totalItems ? Math.round((matches / totalItems) * 100) : 0
    };
  }, [auditData]);

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 40px',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      backgroundColor: '#fff',
      color: '#1e293b'
    }}>
      {/* Header section */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
            border: '1px solid rgba(79, 70, 229, 0.15)',
            padding: 12, borderRadius: 16, color: '#4f46e5'
          }}>
            <Database size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.75px' }}>
              Fabric PO Audit
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 4, marginBottom: 0, fontWeight: 500 }}>
              Verify Purchase Order quantities in Google Sheet against actual received rolls and measurements in database.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 12, border: '1px solid #cbd5e1',
            background: '#fff', color: '#475569', fontWeight: '800', fontSize: '13px',
            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing...' : 'Refresh Report'}
        </button>
      </div>

      {/* KPI Stats Panel */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28
      }}>
        {[
          { label: 'Total Audited POs', value: stats.poCount, desc: 'Unique PO references', icon: ShoppingBag, color: '#4f46e5', bg: '#f5f3ff' },
          { label: 'Total Items List', value: stats.itemCount, desc: 'Line items in spreadsheet', icon: FileText, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Perfect Matches', value: stats.matchCount, desc: `${stats.matchRate}% Audit rate match`, icon: CheckCircle2, color: '#10b981', bg: '#f0fdf4' },
          { label: 'Pending Shortages', value: stats.shortageCount, desc: 'Awaiting items supply', icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Excess Received', value: stats.excessCount, desc: 'Over-received quantities', icon: TrendingUp, color: '#8b5cf6', bg: '#faf5ff' }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 22,
              display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.03)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.01)';
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '850', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</span>
                <div style={{ background: kpi.bg, color: kpi.color, padding: 8, borderRadius: 10 }}>
                  <Icon size={16} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a' }}>{kpi.value}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: 4, fontWeight: '600' }}>{kpi.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters Toolbar */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '18px 24px',
        display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
      }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 12, padding: '8px 14px', flex: 1, maxWidth: 360 }}>
          <Search size={16} style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search PO #, Dept, Description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%', fontWeight: '600', color: '#1e293b' }}
          />
        </div>

        {/* Quick Filter Selectors */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '850', color: '#64748b', textTransform: 'uppercase', marginRight: 8 }}>Department:</label>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1',
                fontSize: '12px', fontWeight: '700', color: '#475569', outline: 'none', background: '#fff'
              }}
            >
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '850', color: '#64748b', textTransform: 'uppercase', marginRight: 8 }}>Status:</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1',
                fontSize: '12px', fontWeight: '700', color: '#475569', outline: 'none', background: '#fff'
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Match">Perfect Match</option>
              <option value="Shortage">Shortage</option>
              <option value="Excess">Excess</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table view */}
      {loading ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '80px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12
        }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>Weaving PO Audit Report...</span>
        </div>
      ) : error ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '48px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center'
        }}>
          <AlertCircle size={36} style={{ color: '#ef4444' }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: '800', color: '#1e293b' }}>Google Sheet Load Failed</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', maxWidth: 460 }}>{error}</p>
          <button onClick={fetchAuditReport} style={{
            marginTop: 12, padding: '8px 16px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff',
            fontSize: '12px', fontWeight: '800', cursor: 'pointer'
          }}>Retry Sync</button>
        </div>
      ) : processedData.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '64px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          <CheckCircle2 size={32} style={{ color: '#94a3b8' }} />
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>No audit records found matching selected filters.</span>
        </div>
      ) : (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
          overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.01)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {[
                    { label: 'PO Number', field: 'poNumber' },
                    { label: 'Department', field: 'department' },
                    { label: 'Item Description', field: 'description' },
                    { label: 'UOM', field: 'uom' },
                    { label: 'Ordered Qty', field: 'orderedQty' },
                    { label: 'Rec. Rolls', field: 'receivedRolls' },
                    { label: 'Rec. Qty', field: 'receivedQty' },
                    { label: 'Difference', field: 'difference' },
                    { label: 'Status', field: 'status' }
                  ].map((col, idx) => (
                    <th
                      key={idx}
                      onClick={() => toggleSort(col.field)}
                      style={{
                        padding: '14px 20px', fontWeight: '900', color: '#475569',
                        cursor: 'pointer', userSelect: 'none', transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{col.label}</span>
                        <ArrowUpDown size={12} style={{ color: sortField === col.field ? '#4f46e5' : '#94a3b8' }} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedData.map((row, idx) => {
                  let statusBg = '#f0fdf4';
                  let statusColor = '#15803d';
                  let statusBorder = '#bbf7d0';
                  
                  if (row.status === 'Shortage') {
                    statusBg = '#fffbeb';
                    statusColor = '#b45309';
                    statusBorder = '#fef3c7';
                  } else if (row.status === 'Excess') {
                    statusBg = '#faf5ff';
                    statusColor = '#6b21a8';
                    statusBorder = '#f3e8ff';
                  }

                  return (
                    <tr key={idx} style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '14px 20px', fontWeight: '800', color: '#1e293b' }}>{row.poNumber}</td>
                      <td style={{ padding: '14px 20px', fontWeight: '600', color: '#475569' }}>{row.department}</td>
                      <td style={{ padding: '14px 20px', fontWeight: '700', color: '#0f172a' }}>{row.description}</td>
                      <td style={{ padding: '14px 20px', fontWeight: '800', color: '#475569', letterSpacing: '0.25px' }}>{row.uom}</td>
                      <td style={{ padding: '14px 20px', fontWeight: '900', color: '#1e293b' }}>{row.orderedQty}</td>
                      <td style={{ padding: '14px 20px', fontWeight: '800', color: '#475569' }}>{row.receivedRolls}</td>
                      <td style={{ padding: '14px 20px', fontWeight: '900', color: '#4f46e5' }}>{row.receivedQty}</td>
                      <td style={{
                        padding: '14px 20px', fontWeight: '900',
                        color: row.difference > 0 ? '#b45309' : row.difference < 0 ? '#6b21a8' : '#15803d'
                      }}>
                        {row.difference > 0 ? `+${row.difference}` : row.difference}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          background: statusBg, color: statusColor, padding: '3px 10px',
                          borderRadius: 12, fontSize: '11px', fontWeight: '800', border: `1px solid ${statusBorder}`,
                          display: 'inline-flex', alignItems: 'center', gap: 4
                        }}>
                          {row.status === 'Match' && <Check size={10} />}
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '750', color: '#64748b' }}>
            <span>Showing {processedData.length} audit lines</span>
            <span>Google Sheet Sync Status: Active</span>
          </div>
        </div>
      )}

      {/* Spinner animation keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default FabricPoAudit;
