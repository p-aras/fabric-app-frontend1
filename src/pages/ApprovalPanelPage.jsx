import React, { useState, useEffect, useMemo } from 'react';
import { store } from '../store.js';
import {
  CheckCircle2, XCircle, Clock, ShieldCheck, ArrowLeftRight,
  Search, RefreshCw, Layers, AlertCircle, Filter, FileText, Check, X
} from 'lucide-react';

export default function ApprovalPanelPage() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'issuance' | 'transfers' | 'history'
  const [issuanceRequests, setIssuanceRequests] = useState([]);
  const [transferRequests, setTransferRequests] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const uData = localStorage.getItem('twms_user');
    if (uData) {
      try {
        setCurrentUser(JSON.parse(uData));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const loadAllApprovals = async () => {
    setLoading(true);
    try {
      const [issuanceData, transfersData, matsData] = await Promise.all([
        store.getApprovalRequests(),
        store.getTransfers(),
        store.getMaterials()
      ]);

      setIssuanceRequests(Array.isArray(issuanceData) ? issuanceData : []);
      setTransferRequests(Array.isArray(transfersData) ? transfersData : []);
      setMaterials(Array.isArray(matsData) ? matsData : []);
    } catch (err) {
      console.error('Error fetching approval panel data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllApprovals();
    const interval = setInterval(loadAllApprovals, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRespondIssuance = async (id, status) => {
    const adminName = currentUser?.name || 'Admin';
    setActionLoading(prev => ({ ...prev, [`iss_${id}`]: true }));
    try {
      await store.respondApprovalRequest(id, status, adminName);
      await loadAllApprovals();
    } catch (e) {
      alert(e.message || 'Error updating approval status');
    } finally {
      setActionLoading(prev => ({ ...prev, [`iss_${id}`]: false }));
    }
  };

  const handleApproveTransfer = async (id) => {
    setActionLoading(prev => ({ ...prev, [`trf_${id}`]: true }));
    try {
      await store.approveTransfer(id);
      await loadAllApprovals();
    } catch (e) {
      alert(e.message || 'Error approving transfer');
    } finally {
      setActionLoading(prev => ({ ...prev, [`trf_${id}`]: false }));
    }
  };

  const handleRejectTransfer = async (id) => {
    setActionLoading(prev => ({ ...prev, [`trf_${id}`]: true }));
    try {
      await store.rejectTransfer(id);
      await loadAllApprovals();
    } catch (e) {
      alert(e.message || 'Error rejecting transfer');
    } finally {
      setActionLoading(prev => ({ ...prev, [`trf_${id}`]: false }));
    }
  };

  const getMaterialName = (matId) => {
    return materials.find(m => m.id === matId)?.name || `Material #${matId}`;
  };

  // Filtered lists
  const pendingIssuances = useMemo(() => {
    return issuanceRequests.filter(r => (r.status || '').toLowerCase() === 'pending');
  }, [issuanceRequests]);

  const pendingTransfers = useMemo(() => {
    return transferRequests.filter(t => (t.status || '').toLowerCase() === 'pending');
  }, [transferRequests]);

  const processedIssuances = useMemo(() => {
    return issuanceRequests.filter(r => (r.status || '').toLowerCase() !== 'pending');
  }, [issuanceRequests]);

  const processedTransfers = useMemo(() => {
    return transferRequests.filter(t => (t.status || '').toLowerCase() !== 'pending');
  }, [transferRequests]);

  const filteredIssuances = useMemo(() => {
    let list = activeTab === 'pending' ? pendingIssuances
      : activeTab === 'issuance' ? issuanceRequests
      : processedIssuances;

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(r =>
      (r.lotNumber || '').toLowerCase().includes(term) ||
      (r.tableNo || '').toLowerCase().includes(term) ||
      (r.requestedBy || '').toLowerCase().includes(term) ||
      (r.reason || '').toLowerCase().includes(term)
    );
  }, [activeTab, issuanceRequests, pendingIssuances, processedIssuances, searchTerm]);

  const filteredTransfers = useMemo(() => {
    let list = activeTab === 'pending' ? pendingTransfers
      : activeTab === 'transfers' ? transferRequests
      : processedTransfers;

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(t =>
      (t.transferredBy || '').toLowerCase().includes(term) ||
      (t.fromLocation || '').toLowerCase().includes(term) ||
      (t.toLocation || '').toLowerCase().includes(term) ||
      getMaterialName(t.materialId).toLowerCase().includes(term)
    );
  }, [activeTab, transferRequests, pendingTransfers, processedTransfers, searchTerm, materials]);

  return (
    <div style={{
      padding: '24px 32px',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: '26px',
            fontWeight: '900',
            color: 'var(--text-primary, #0f172a)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <ShieldCheck size={28} color="#2563eb" />
            Admin Approval Panel
          </h1>
          <p style={{
            fontSize: '13.5px',
            color: 'var(--text-secondary, #64748b)',
            margin: '4px 0 0 0'
          }}>
            Review and update pending special issuance eligibility overrides & material transfer requests
          </p>
        </div>

        <button
          onClick={loadAllApprovals}
          className="btn btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh Panel
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Total Pending Card */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.05)'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pending Approvals
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e3a8a', marginTop: '4px' }}>
              {pendingIssuances.length + pendingTransfers.length}
            </div>
            <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px', fontWeight: '600' }}>
              {pendingIssuances.length} Issuance | {pendingTransfers.length} Transfer
            </div>
          </div>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Clock size={24} />
          </div>
        </div>

        {/* Special Issuance Pending */}
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '1px solid #fca5a5',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Issuance Eligibility Overrides
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#7f1d1d', marginTop: '4px' }}>
              {pendingIssuances.length}
            </div>
            <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px', fontWeight: '600' }}>
              Action Required for Table Locks
            </div>
          </div>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Layers size={24} />
          </div>
        </div>

        {/* Transfer Pending */}
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1px solid #fde68a',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Material Transfers
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#78350f', marginTop: '4px' }}>
              {pendingTransfers.length}
            </div>
            <div style={{ fontSize: '11px', color: '#d97706', marginTop: '2px', fontWeight: '600' }}>
              Shelf & Location Moves
            </div>
          </div>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <ArrowLeftRight size={24} />
          </div>
        </div>

        {/* Approved Total */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #86efac',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Processed Approvals
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#14532d', marginTop: '4px' }}>
              {processedIssuances.length + processedTransfers.length}
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px', fontWeight: '600' }}>
              Approved & Rejected Records
            </div>
          </div>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs & Search */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '2px solid var(--border-light, #e2e8f0)',
        paddingBottom: '12px'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'pending', label: `⚡ Action Required (${pendingIssuances.length + pendingTransfers.length})` },
            { id: 'issuance', label: `🔐 Special Issuances (${issuanceRequests.length})` },
            { id: 'transfers', label: `📦 Material Transfers (${transferRequests.length})` },
            { id: 'history', label: `📜 Approval History (${processedIssuances.length + processedTransfers.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: activeTab === tab.id ? '800' : '600',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: activeTab === tab.id ? '#2563eb' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary, #475569)',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === tab.id ? '0 4px 10px rgba(37, 99, 235, 0.2)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{
          position: 'relative',
          width: '280px'
        }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search lot, table, requester..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1.5px solid var(--border, #cbd5e1)',
              outline: 'none',
              fontWeight: '600',
              boxSizing: 'border-box',
              background: 'var(--surface, #ffffff)',
              color: 'var(--text-primary, #0f172a)'
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* 1. SPECIAL ISSUANCE APPROVAL REQUESTS */}
        {(activeTab === 'pending' || activeTab === 'issuance' || activeTab === 'history') && (
          <div style={{
            backgroundColor: 'var(--surface, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border, #e2e8f0)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 24px',
              backgroundColor: 'var(--bg-light, #f8fafc)',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🔐</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary, #0f172a)' }}>
                    Special Issuance Eligibility Overrides
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                    Approval requests sent from IssuePage when cutting table capacity is reached (2+ active lots)
                  </p>
                </div>
              </div>

              <span className="badge" style={{
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                fontSize: '11px',
                fontWeight: '800',
                padding: '4px 10px',
                borderRadius: '20px'
              }}>
                {filteredIssuances.length} Items
              </span>
            </div>

            {filteredIssuances.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 size={40} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                <p style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>No Special Issuance Requests Found</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg, #f1f5f9)', color: 'var(--text-secondary, #475569)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Req ID / Date</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Lot Number</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Table Number</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Requested By</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Reason / Remarks</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Status</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800', textAlign: 'right' }}>Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssuances.map(req => {
                      const isPending = (req.status || '').toLowerCase() === 'pending';
                      const isApproved = (req.status || '').toLowerCase() === 'approved';
                      const isRejected = (req.status || '').toLowerCase() === 'rejected';
                      const isWorking = actionLoading[`iss_${req.id}`];

                      return (
                        <tr key={req.id} style={{
                          borderBottom: '1px solid var(--border-light, #f1f5f9)',
                          backgroundColor: isPending ? 'rgba(239, 68, 68, 0.02)' : 'transparent'
                        }}>
                          <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>#{req.id}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {req.createdAt ? new Date(req.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just Now'}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              fontWeight: '900',
                              color: '#0f172a',
                              backgroundColor: '#f1f5f9',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              letterSpacing: '0.5px'
                            }}>
                              {req.lotNumber}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ fontWeight: '800', color: '#dc2626' }}>
                              {req.tableNo}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {req.requestedBy}
                          </td>

                          <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                            <div style={{ fontStyle: 'italic', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              "{req.reason || 'Eligibility Override'}"
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            {isPending && (
                              <span style={{
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                fontSize: '11px',
                                fontWeight: '800',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                border: '1px solid #fde68a',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Clock size={12} /> PENDING REVIEW
                              </span>
                            )}
                            {isApproved && (
                              <div>
                                <span style={{
                                  backgroundColor: '#dcfce7',
                                  color: '#15803d',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  border: '1px solid #86efac',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Check size={12} /> ALLOWED
                                </span>
                                <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '2px' }}>
                                  by {req.respondedBy || 'Admin'}
                                </div>
                              </div>
                            )}
                            {isRejected && (
                              <div>
                                <span style={{
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  border: '1px solid #fca5a5',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <X size={12} /> REJECTED
                                </span>
                                <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '2px' }}>
                                  by {req.respondedBy || 'Admin'}
                                </div>
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            {isPending ? (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  disabled={isWorking}
                                  onClick={() => handleRespondIssuance(req.id, 'Approved')}
                                  style={{
                                    backgroundColor: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '7px 14px',
                                    borderRadius: '6px',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                                  }}
                                >
                                  <Check size={14} /> ALLOW
                                </button>
                                <button
                                  disabled={isWorking}
                                  onClick={() => handleRespondIssuance(req.id, 'Rejected')}
                                  style={{
                                    backgroundColor: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '7px 14px',
                                    borderRadius: '6px',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                                  }}
                                >
                                  <X size={14} /> REJECT
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                                Decision logged
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. MATERIAL TRANSFERS APPROVAL REQUESTS */}
        {(activeTab === 'pending' || activeTab === 'transfers' || activeTab === 'history') && (
          <div style={{
            backgroundColor: 'var(--surface, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border, #e2e8f0)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 24px',
              backgroundColor: 'var(--bg-light, #f8fafc)',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📦</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary, #0f172a)' }}>
                    Material Transfer Location Move Approvals
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                    Approval requests for moving stock rolls between warehouse rooms, racks, and shelves
                  </p>
                </div>
              </div>

              <span className="badge" style={{
                backgroundColor: '#fef3c7',
                color: '#b45309',
                fontSize: '11px',
                fontWeight: '800',
                padding: '4px 10px',
                borderRadius: '20px'
              }}>
                {filteredTransfers.length} Items
              </span>
            </div>

            {filteredTransfers.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 size={40} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                <p style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>No Transfer Requests Found</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg, #f1f5f9)', color: 'var(--text-secondary, #475569)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>TRF No / Date</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Material Item</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Rolls Qty</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Location Route</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Requested By</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800' }}>Status</th>
                      <th style={{ padding: '12px 18px', fontWeight: '800', textAlign: 'right' }}>Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransfers.map(trf => {
                      const isPending = (trf.status || '').toLowerCase() === 'pending';
                      const isCompleted = (trf.status || '').toLowerCase() === 'completed';
                      const isRejected = (trf.status || '').toLowerCase() === 'rejected';
                      const isWorking = actionLoading[`trf_${trf.id}`];

                      return (
                        <tr key={trf.id} style={{
                          borderBottom: '1px solid var(--border-light, #f1f5f9)',
                          backgroundColor: isPending ? 'rgba(217, 119, 6, 0.02)' : 'transparent'
                        }}>
                          <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{trf.transferNo || `#TRF-${trf.id}`}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{trf.date || 'Today'}</div>
                          </td>

                          <td style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {getMaterialName(trf.materialId)}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ fontWeight: '900', color: '#2563eb' }}>
                              {trf.rolls} Rolls
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                              <span style={{ padding: '3px 8px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontWeight: '700', border: '1px solid #cbd5e1' }}>
                                {trf.fromLocation}
                              </span>
                              <span style={{ color: '#94a3b8', fontWeight: '900' }}>➔</span>
                              <span style={{ padding: '3px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: '700', border: '1px solid #93c5fd' }}>
                                {trf.toLocation}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {trf.transferredBy}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            {isPending && (
                              <span style={{
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                fontSize: '11px',
                                fontWeight: '800',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                border: '1px solid #fde68a',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Clock size={12} /> PENDING APPROVAL
                              </span>
                            )}
                            {isCompleted && (
                              <span style={{
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                fontSize: '11px',
                                fontWeight: '800',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                border: '1px solid #86efac',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Check size={12} /> COMPLETED / APPROVED
                              </span>
                            )}
                            {isRejected && (
                              <span style={{
                                backgroundColor: '#fee2e2',
                                color: '#b91c1c',
                                fontSize: '11px',
                                fontWeight: '800',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                border: '1px solid #fca5a5',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <X size={12} /> REJECTED
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            {isPending ? (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  disabled={isWorking}
                                  onClick={() => handleApproveTransfer(trf.id)}
                                  style={{
                                    backgroundColor: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '7px 14px',
                                    borderRadius: '6px',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                                  }}
                                >
                                  <Check size={14} /> APPROVE
                                </button>
                                <button
                                  disabled={isWorking}
                                  onClick={() => handleRejectTransfer(trf.id)}
                                  style={{
                                    backgroundColor: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '7px 14px',
                                    borderRadius: '6px',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                                  }}
                                >
                                  <X size={14} /> REJECT
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                                Processed
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
