import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Scissors, Layers, Package, Droplets, AlertTriangle,
  UserCheck, Users, Building, Database, CheckCircle2, Clock,
  ExternalLink, Download, Share2, Copy, Sparkles, Send,
  Calendar, Check, ArrowRight, ShieldCheck, Printer
} from 'lucide-react';
import { store } from '../store.js';

export const MD_REPORTS_REGISTRY = [
  {
    id: 'rep-01',
    number: 1,
    numberLabel: '1st Report',
    code: '#01',
    title: 'Daily Fabric Issue Report',
    subtitle: 'Table-wise fabric rolls, meterage & weight issuance analytics',
    path: '/reports/daily-fabric-issue',
    icon: FileText,
    category: 'Issuance & Cutting',
    gradient: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
    badgeColor: '#2563EB',
    frequency: 'Daily (Every Evening)',
    description: 'Tracks all fabric lots issued to Cutting Tables 1–20. Includes weight variances, roll barcodes, and cutter approvals.'
  },
  {
    id: 'rep-02',
    number: 2,
    numberLabel: '2nd Report',
    code: '#02',
    title: 'Daily Cutting Production Report',
    subtitle: 'Comprehensive piece output, lay count & style-wise yields',
    path: '/reports/daily-cutting-report',
    icon: Scissors,
    category: 'Cutting Operations',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    badgeColor: '#10B981',
    frequency: 'Daily (End of Shift)',
    description: 'Summarizes cutting hall outputs across all fabric styles, job order progress, and piece output rates.'
  },
  {
    id: 'rep-03',
    number: 3,
    numberLabel: '3rd Report',
    code: '#03',
    title: 'Table-Wise Classification Report',
    subtitle: 'Production efficiency & volume distribution across Tables 1–20',
    path: '/reports/table-wise-classification',
    icon: Layers,
    category: 'Floor Utilization',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
    badgeColor: '#8B5CF6',
    frequency: 'Daily',
    description: 'Provides deep operational breakdown of individual table capacities, idle vs active cutting hours, and table output.'
  },
  {
    id: 'rep-04',
    number: 4,
    numberLabel: '4th Report',
    code: '#04',
    title: 'Daily Inventory Quantity-Wise Report',
    subtitle: 'Warehouse balance, roll counts & stock movement delta',
    path: '/reports/daily-inventory/quantity-wise',
    icon: Package,
    category: 'Warehouse Inventory',
    gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    badgeColor: '#F59E0B',
    frequency: 'Daily (Morning & Evening)',
    description: 'Opening vs Closing fabric stock balances, inward GRN additions, outward deductions, and total storage occupancy.'
  },
  {
    id: 'rep-05',
    number: 5,
    numberLabel: '5th Report',
    code: '#05',
    title: 'Dyeing Shortage & Loss Report',
    subtitle: 'Mill shrinkage, process loss & shade discrepancy audit',
    path: '/reports/dyeing-shortage',
    icon: Droplets,
    category: 'Quality & Process',
    gradient: 'linear-gradient(135deg, #0284C7 0%, #06B6D4 100%)',
    badgeColor: '#06B6D4',
    frequency: 'Daily / Lot-wise',
    description: 'Calculates exact weight delta between raw grey fabric sent to mills and finished dyed rolls received back.'
  },
  {
    id: 'rep-06',
    number: 6,
    numberLabel: '6th Report',
    code: '#06',
    title: 'Production Shortage & QC Log',
    subtitle: 'Defect tags, end-bits, damage rolls & shortage claims',
    path: '/shortage-report-form',
    icon: AlertTriangle,
    category: 'Quality & Shortage',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
    badgeColor: '#EF4444',
    frequency: 'Daily (Immediate Log)',
    description: 'Critical QC report submitted to MD documenting fabric defects, end-bit wastage, and vendor shortage adjustments.'
  },
  {
    id: 'rep-07',
    number: 7,
    numberLabel: '7th Report',
    code: '#07',
    title: 'Cutter Master Wise Report',
    subtitle: 'Individual cutter master efficiency, speed & error rates',
    path: '/reports/daily-cutting/cutter-master',
    icon: UserCheck,
    category: 'Labor Efficiency',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    badgeColor: '#6366F1',
    frequency: 'Daily / Shift-wise',
    description: 'Performance auditing for each cutter master, monitoring cutting accuracy, output speed, and fabric saving.'
  },
  {
    id: 'rep-08',
    number: 8,
    numberLabel: '8th Report',
    code: '#08',
    title: 'Supervisor Shift Summary Report',
    subtitle: 'Floor supervisor sign-offs, shift totals & verification',
    path: '/reports/daily-cutting/supervisor',
    icon: Users,
    category: 'Shift Management',
    gradient: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
    badgeColor: '#14B8A6',
    frequency: 'Daily (Shift Change)',
    description: 'Shift supervisor performance summary ensuring all table jobs and shift issuances have been verified before handover.'
  },
  {
    id: 'rep-09',
    number: 9,
    numberLabel: '9th Report',
    code: '#09',
    title: 'Hall & Location Wise Cutting Report',
    subtitle: 'Departmental volume breakdown (Hall 1, Hall 2, Hall 3)',
    path: '/reports/daily-cutting/hall',
    icon: Building,
    category: 'Departmental Audit',
    gradient: 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)',
    badgeColor: '#A855F7',
    frequency: 'Daily',
    description: 'Multi-hall cutting volume comparison to balance production workloads between Hall 1, Hall 2, and specialized cutting sections.'
  },
  {
    id: 'rep-10',
    number: 10,
    numberLabel: '10th Report',
    code: '#10',
    title: 'Fabric Inward & PO Audit Log',
    subtitle: 'Physical receipt vs Purchase Order reconciliation audit',
    path: '/fabric-po-audit',
    icon: Database,
    category: 'Inward & Procurement',
    gradient: 'linear-gradient(135deg, #374151 0%, #4B5563 100%)',
    badgeColor: '#4B5563',
    frequency: 'Daily (Post-GRN)',
    description: 'Complete audit trail matching supplier challans against generated Purchase Orders to prevent unauthorized entries.'
  }
];

export default function MDReportsHub() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [filterCategory, setFilterCategory] = useState('All');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Storage key for dispatch status per date
  const dispatchKey = `twms_md_dispatch_${selectedDate}`;

  const [dispatchStatus, setDispatchStatus] = useState(() => {
    try {
      const saved = localStorage.getItem(`twms_md_dispatch_${new Date().toISOString().split('T')[0]}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Reload dispatch status when date changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(dispatchKey);
      setDispatchStatus(saved ? JSON.parse(saved) : {});
    } catch {
      setDispatchStatus({});
    }
  }, [selectedDate, dispatchKey]);

  // Toggle sent status for a report
  const toggleSentStatus = (reportId) => {
    const isCurrentlySent = !!dispatchStatus[reportId]?.sent;
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newStatus = {
      ...dispatchStatus,
      [reportId]: isCurrentlySent
        ? { sent: false, timestamp: null }
        : { sent: true, timestamp: `${timeString} on ${selectedDate}` }
    };

    setDispatchStatus(newStatus);
    try {
      localStorage.setItem(dispatchKey, JSON.stringify(newStatus));
    } catch (e) {
      console.error(e);
    }
  };

  // Mark all as sent
  const markAllSent = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const allStatus = {};
    MD_REPORTS_REGISTRY.forEach(r => {
      allStatus[r.id] = { sent: true, timestamp: `${timeString} on ${selectedDate}` };
    });
    setDispatchStatus(allStatus);
    try {
      localStorage.setItem(dispatchKey, JSON.stringify(allStatus));
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered list
  const filteredReports = useMemo(() => {
    if (filterCategory === 'All') return MD_REPORTS_REGISTRY;
    return MD_REPORTS_REGISTRY.filter(r => r.category.toLowerCase().includes(filterCategory.toLowerCase()));
  }, [filterCategory]);

  // Progress metrics
  const completedCount = useMemo(() => {
    return MD_REPORTS_REGISTRY.filter(r => dispatchStatus[r.id]?.sent).length;
  }, [dispatchStatus]);

  const progressPercentage = Math.round((completedCount / MD_REPORTS_REGISTRY.length) * 100);

  // Generate Executive Summary Text for MD WhatsApp / Email
  const copyExecutiveSummary = () => {
    const formattedDate = new Date(selectedDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    let message = `📊 *DAILY TEXTILE WAREHOUSE EXECUTIVE REPORT TO MD*\n`;
    message += `📅 *Date:* ${formattedDate}\n`;
    message += `📈 *Daily Reports Status:* ${completedCount} of ${MD_REPORTS_REGISTRY.length} Dispatched (${progressPercentage}%)\n`;
    message += `────────────────────────────\n\n`;

    MD_REPORTS_REGISTRY.forEach(r => {
      const isSent = dispatchStatus[r.id]?.sent;
      const statusIcon = isSent ? '✅' : '⏳';
      const timeStr = isSent ? `(Sent: ${dispatchStatus[r.id]?.timestamp})` : '(Pending Dispatch)';
      message += `${statusIcon} *${r.numberLabel} (${r.code}):* ${r.title}\n`;
      message += `   └─ ${r.subtitle}\n`;
      message += `   └─ Status: ${timeStr}\n\n`;
    });

    message += `────────────────────────────\n`;
    message += `🏢 *Textile Warehouse ERP Hub · Executive Daily Dispatch*\n`;
    message += `Generated by Store Management System`;

    navigator.clipboard.writeText(message).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    });
  };

  return (
    <div className="md-reports-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* ── Executive Header Banner ── */}
      <div className="md-header-card">
        <div className="md-header-left">
          <div className="md-pill-badge">
            <Sparkles size={13} className="sparkle-icon" />
            <span>EXECUTIVE DISPATCH HUB · MANAGING DIRECTOR SUITE</span>
          </div>
          <h1 className="md-main-title">Daily MD Reports Setup & Numbering Center</h1>
          <p className="md-sub-desc">
            Organized sequence of all <strong>10 Daily Operational & Audit Reports</strong> sent to the MD with official sequence tags, tracking checkmarks, and instant WhatsApp briefing generator.
          </p>
        </div>

        <div className="md-header-actions">
          <div className="date-picker-box">
            <Calendar size={14} className="cal-icon" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="md-date-input"
              title="Select Reporting Date"
            />
          </div>

          <button
            className="md-btn-copy"
            onClick={copyExecutiveSummary}
            title="Copy formatted summary to paste to MD WhatsApp or Email"
          >
            {copiedNotification ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedNotification ? 'Copied to Clipboard!' : 'Copy MD Briefing Text'}</span>
          </button>

          <button
            className="md-btn-mark-all"
            onClick={markAllSent}
            title="Mark all 10 reports as Sent to MD for today"
          >
            <CheckCircle2 size={14} />
            <span>Mark All Dispatched</span>
          </button>
        </div>
      </div>

      {/* ── Daily Dispatch Progress Radar ── */}
      <div className="md-progress-card">
        <div className="progress-top-row">
          <div className="progress-title-block">
            <span className="radar-live-dot" />
            <span className="radar-label">MD Daily Dispatch Status ({selectedDate})</span>
          </div>
          <div className="progress-count-pill">
            <strong>{completedCount}</strong> of <strong>{MD_REPORTS_REGISTRY.length}</strong> Reports Dispatched to MD ({progressPercentage}%)
          </div>
        </div>

        <div className="progress-track-bar">
          <div
            className="progress-fill-bar"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="progress-quick-stats">
          <div className="stat-pill complete">
            <Check size={12} />
            <span>{completedCount} Completed</span>
          </div>
          <div className="stat-pill pending">
            <Clock size={12} />
            <span>{MD_REPORTS_REGISTRY.length - completedCount} Pending MD Dispatch</span>
          </div>
          <div className="stat-pill sequence">
            <span>Official Sequence: 1st Report ➔ 10th Report</span>
          </div>
        </div>
      </div>

      {/* ── Category Filter Segment Bar ── */}
      <div className="md-filter-bar">
        <div className="category-tabs">
          {['All', 'Cutting', 'Warehouse', 'Quality', 'Labor', 'Inward'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`cat-tab-btn ${filterCategory === cat ? 'active' : ''}`}
            >
              {cat === 'All' ? 'All 10 MD Reports' : cat}
            </button>
          ))}
        </div>
        <div className="report-count-info">
          Showing <strong>{filteredReports.length}</strong> Sequenced Reports
        </div>
      </div>

      {/* ── Sequenced MD Reports Grid ── */}
      <div className="md-reports-grid">
        {filteredReports.map((rep) => {
          const isSent = !!dispatchStatus[rep.id]?.sent;
          const sentTimestamp = dispatchStatus[rep.id]?.timestamp;

          return (
            <div
              key={rep.id}
              className={`md-report-card ${isSent ? 'is-sent' : ''}`}
            >
              {/* Top Row with Blank Circle and Round Number */}
              <div className="report-card-top">
                <div className="report-circle-number-badge">
                  <span className="blank-circle-num">{rep.number}</span>
                  <span className="number-tag">{rep.numberLabel}</span>
                  <span className="code-tag">{rep.code}</span>
                </div>

                <button
                  className={`dispatch-toggle-btn ${isSent ? 'sent' : 'pending'}`}
                  onClick={() => toggleSentStatus(rep.id)}
                  title={isSent ? 'Click to unmark' : 'Click to mark as Sent to MD'}
                >
                  {isSent ? (
                    <>
                      <Check size={13} />
                      <span>Sent to MD</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Mark Sent</span>
                    </>
                  )}
                </button>
              </div>

              {/* Icon & Title Row */}
              <div className="report-card-main">
                <div className="report-icon-box" style={{ background: `${rep.badgeColor}15`, color: rep.badgeColor }}>
                  <rep.icon size={22} />
                </div>
                <div className="report-title-box">
                  <h3 className="report-name">{rep.title}</h3>
                  <p className="report-subtitle">{rep.subtitle}</p>
                </div>
              </div>

              {/* Description Box */}
              <p className="report-description">{rep.description}</p>

              {/* Metadata Footer */}
              <div className="report-card-footer">
                <div className="footer-left">
                  <span className="freq-badge">{rep.frequency}</span>
                  {isSent && (
                    <span className="sent-time-badge">
                      <Clock size={11} />
                      {sentTimestamp}
                    </span>
                  )}
                </div>

                <button
                  className="report-open-btn"
                  onClick={() => navigate(rep.path)}
                  title={`Open ${rep.title}`}
                >
                  <span>Open Report</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CSS STYLING INJECTION ── */}
      <style>{`
        .md-reports-container {
          padding-bottom: 30px;
        }

        /* 1. Header Card */
        .md-header-card {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          border: 1px solid #334155;
          border-radius: 14px;
          padding: 22px 26px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          color: #FFFFFF;
        }
        .md-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(37, 99, 235, 0.25);
          border: 1px solid rgba(59, 130, 246, 0.4);
          color: #93C5FD;
          font-size: 10.5px;
          font-weight: 850;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
        }
        .sparkle-icon { color: #FDE047; }
        .md-main-title {
          font-size: 22px;
          font-weight: 850;
          margin: 0;
          color: #F8FAFC;
          letter-spacing: -0.5px;
        }
        .md-sub-desc {
          margin: 6px 0 0 0;
          font-size: 13px;
          color: #94A3B8;
          max-width: 700px;
          line-height: 1.4;
        }
        .md-sub-desc strong {
          color: #E2E8F0;
        }

        .md-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .date-picker-box {
          position: relative;
          display: flex;
          align-items: center;
        }
        .date-picker-box .cal-icon {
          position: absolute;
          left: 10px;
          color: #60A5FA;
          pointer-events: none;
        }
        .md-date-input {
          background: #1E293B;
          border: 1.5px solid #334155;
          border-radius: 8px;
          padding: 7px 12px 7px 32px;
          color: #F8FAFC;
          font-size: 12.5px;
          font-weight: 700;
          outline: none;
          cursor: pointer;
        }
        .md-date-input:focus {
          border-color: #3B82F6;
        }

        .md-btn-copy {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%);
          border: 1px solid #3B82F6;
          color: #FFFFFF;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }
        .md-btn-copy:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
        }

        .md-btn-mark-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #10B981;
          border: 1px solid #059669;
          color: #FFFFFF;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        .md-btn-mark-all:hover {
          transform: translateY(-1px);
          background: #059669;
        }

        /* 2. Progress Radar Card */
        .md-progress-card {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dark .md-progress-card {
          background: #1E293B;
          border-color: #334155;
        }

        .progress-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .progress-title-block {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .radar-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 8px #10B981;
        }
        .radar-label {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-primary, #0F172A);
        }
        .dark .radar-label { color: #F8FAFC; }
        .progress-count-pill {
          font-size: 12px;
          font-weight: 700;
          color: #2563EB;
          background: rgba(37, 99, 235, 0.1);
          padding: 3px 10px;
          border-radius: 6px;
        }
        .dark .progress-count-pill {
          color: #93C5FD;
          background: rgba(37, 99, 235, 0.2);
        }

        .progress-track-bar {
          width: 100%;
          height: 8px;
          background: var(--bg, #F1F5F9);
          border-radius: 4px;
          overflow: hidden;
        }
        .dark .progress-track-bar {
          background: #0F172A;
        }
        .progress-fill-bar {
          height: 100%;
          background: linear-gradient(90deg, #3B82F6 0%, #10B981 100%);
          border-radius: 4px;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .progress-quick-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 750;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .stat-pill.complete {
          background: #DCFCE7;
          color: #15803D;
        }
        .dark .stat-pill.complete {
          background: rgba(16, 185, 129, 0.2);
          color: #6EE7B7;
        }
        .stat-pill.pending {
          background: #FEF3C7;
          color: #B45309;
        }
        .dark .stat-pill.pending {
          background: rgba(245, 158, 11, 0.2);
          color: #FCD34D;
        }
        .stat-pill.sequence {
          background: var(--bg, #F1F5F9);
          color: var(--text-secondary, #64748B);
          margin-left: auto;
        }
        .dark .stat-pill.sequence {
          background: #0F172A;
          color: #94A3B8;
        }

        /* 3. Category Filter Bar */
        .md-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .category-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cat-tab-btn {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 750;
          border: 1px solid var(--border, #CBD5E1);
          background: var(--surface, #FFFFFF);
          color: var(--text-secondary, #64748B);
          cursor: pointer;
          transition: all 0.15s;
        }
        .dark .cat-tab-btn {
          background: #1E293B;
          border-color: #334155;
          color: #94A3B8;
        }
        .cat-tab-btn.active {
          background: #2563EB !important;
          color: #FFFFFF !important;
          border-color: #1D4ED8 !important;
        }
        .report-count-info {
          font-size: 12px;
          color: var(--text-secondary, #64748B);
        }
        .dark .report-count-info { color: #94A3B8; }

        /* 4. Sequenced Reports Grid */
        .md-reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 16px;
        }

        .md-report-card {
          background: var(--surface, #FFFFFF);
          border: 1.5px solid var(--border, #E2E8F0);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s ease;
          position: relative;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }
        .dark .md-report-card {
          background: #1E293B;
          border-color: #334155;
        }
        .md-report-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
          border-color: #3B82F6;
        }
        .dark .md-report-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          border-color: #60A5FA;
        }

        .md-report-card.is-sent {
          border-color: rgba(16, 185, 129, 0.4);
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.02) 0%, var(--surface, #FFFFFF) 100%);
        }
        .dark .md-report-card.is-sent {
          border-color: rgba(16, 185, 129, 0.3);
          background: #1E293B;
        }

        /* Top Row of Card */
        .report-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .report-circle-number-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 2px 10px 2px 3px;
          border-radius: 20px;
          border: 1.5px solid var(--border, #0F172A);
          background: var(--surface, #FFFFFF);
          color: var(--text-primary, #0F172A);
        }
        .dark .report-circle-number-badge {
          border-color: #94A3B8;
          background: #1E293B;
          color: #F8FAFC;
        }
        .blank-circle-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1.5px solid currentColor;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 11.5px;
          background: transparent;
        }
        .number-tag {
          font-size: 11.5px;
          font-weight: 850;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .code-tag {
          font-size: 10px;
          font-weight: 800;
          background: rgba(0, 0, 0, 0.07);
          padding: 1px 5px;
          border-radius: 4px;
          color: var(--text-secondary, #64748B);
        }
        .dark .code-tag {
          background: rgba(255, 255, 255, 0.1);
          color: #94A3B8;
        }

        .dispatch-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
        }
        .dispatch-toggle-btn.pending {
          background: var(--bg, #F1F5F9);
          border-color: var(--border, #CBD5E1);
          color: var(--text-secondary, #64748B);
        }
        .dark .dispatch-toggle-btn.pending {
          background: #0F172A;
          border-color: #334155;
          color: #94A3B8;
        }
        .dispatch-toggle-btn.pending:hover {
          background: #2563EB;
          color: #FFFFFF;
          border-color: #2563EB;
        }
        .dispatch-toggle-btn.sent {
          background: #DCFCE7;
          border-color: #86EFAC;
          color: #15803D;
        }
        .dark .dispatch-toggle-btn.sent {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.4);
          color: #6EE7B7;
        }

        /* Card Main Body */
        .report-card-main {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .report-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .report-title-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .report-name {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--text-primary, #0F172A);
          margin: 0;
          line-height: 1.3;
        }
        .dark .report-name { color: #F8FAFC; }
        .report-subtitle {
          font-size: 11.5px;
          color: var(--text-secondary, #64748B);
          margin: 0;
        }
        .dark .report-subtitle { color: #94A3B8; }

        .report-description {
          font-size: 12px;
          color: var(--text-secondary, #64748B);
          margin: 0;
          line-height: 1.4;
          background: var(--bg, #F8FAFC);
          padding: 8px 10px;
          border-radius: 6px;
        }
        .dark .report-description {
          background: #0F172A;
          color: #94A3B8;
        }

        /* Card Footer */
        .report-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px solid var(--border, #F1F5F9);
        }
        .dark .report-card-footer {
          border-top-color: #334155;
        }

        .footer-left {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .freq-badge {
          font-size: 10.5px;
          font-weight: 750;
          color: #64748B;
        }
        .dark .freq-badge { color: #94A3B8; }
        .sent-time-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 750;
          color: #059669;
        }
        .dark .sent-time-badge { color: #34D399; }

        .report-open-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 800;
          background: #2563EB;
          color: #FFFFFF;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .report-open-btn:hover {
          background: #1D4ED8;
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
}
