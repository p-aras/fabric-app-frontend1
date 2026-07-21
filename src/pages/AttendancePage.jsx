import React, { useState, useEffect } from 'react';
import { store } from '../store.js';
import { 
  ClipboardList, Calendar, Users, UserCheck, Plus, Trash2, 
  Search, ShieldAlert, CheckCircle2, ChevronRight, XCircle, 
  AlertTriangle, Settings, HelpCircle, Briefcase, PlusCircle, Sparkles,
  Download, Printer, FileText, ChevronDown, Check, UserMinus, PlusSquare,
  BarChart2, TrendingUp, CalendarDays, FileSpreadsheet, Activity, FileDown
} from 'lucide-react';

const DEPARTMENTS = [
  'Cutting',
  'Dyeing',
  'Stitching',
  'Warehouse',
  'Printing',
  'Packing',
  'Quality Control',
  'Maintenance'
];

const STATUS_OPTIONS = [
  { value: 'Present', label: 'Present', color: 'success', icon: CheckCircle2 },
  { value: 'Absent', label: 'Absent', color: 'danger', icon: XCircle },
  { value: 'Half Day', label: 'Half Day', color: 'warning', icon: AlertTriangle }
];

export default function AttendancePage() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'registry'

  // Form State
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [customDept, setCustomDept] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);
  
  // Dynamic Lists for HODs, Supervisors and Helpers
  const [hods, setHods] = useState([{ name: '', status: 'Present' }]);
  const [supervisors, setSupervisors] = useState([{ name: '', status: 'Present' }]);
  const [mastersCount, setMastersCount] = useState(0); // Simplified total count of Cutter Masters
  const [orgHelpers, setOrgHelpers] = useState([{ name: '', status: 'Present' }]);
  // Free-text for daily changing helpers
  const [dailyHelpers, setDailyHelpers] = useState([{ name: '', status: 'Present' }]);

  // Master Personnel Registry (HOD, Supervisors, Helpers)
  const [staffRegistry, setStaffRegistry] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Helper');
  const [showRegistryManager, setShowRegistryManager] = useState(false);
  const [registryLoading, setRegistryLoading] = useState(false);

  // History & UI states
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null); // { type: 'success'|'danger', text: '' }

  // Dashboard Filters & Range Exporter
  const [dashboardDate, setDashboardDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [exportStart, setExportStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [exportEnd, setExportEnd] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Employee-specific report states
  const [selectedReportEmployee, setSelectedReportEmployee] = useState('');
  const [empStartRange, setEmpStartRange] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [empEndRange, setEmpEndRange] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    loadHistory();
    loadStaffRegistry();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await store.getAttendance();
      if (res && res.success) {
        setAttendanceList(res.data || []);
      }
    } catch (e) {
      console.error(e);
      showAlert('danger', 'Failed to load attendance history.');
    } finally {
      setLoading(false);
    }
  };

  const loadStaffRegistry = async () => {
    setRegistryLoading(true);
    try {
      const res = await store.getStaff();
      if (res && res.success) {
        setStaffRegistry(res.data || []);
      }
    } catch (e) {
      console.error(e);
      showAlert('danger', 'Failed to load staff registry.');
    } finally {
      setRegistryLoading(false);
    }
  };

  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  // Staff Registry CRUD
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    try {
      const res = await store.addStaff({ name: newStaffName.trim(), role: newStaffRole });
      if (res && res.success) {
        setNewStaffName('');
        showAlert('success', `${newStaffName} registered successfully.`);
        loadStaffRegistry();
      }
    } catch (e) {
      console.error(e);
      showAlert('danger', 'Error adding staff member.');
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Remove ${name} from staff registry?`)) return;
    try {
      const res = await store.deleteStaff(id);
      if (res && res.success) {
        showAlert('success', `${name} removed from registry.`);
        loadStaffRegistry();
      }
    } catch (e) {
      console.error(e);
      showAlert('danger', 'Error removing staff member.');
    }
  };

  // Dynamic Add / Remove handlers for HODs (Immutable updates)
  const addHod = () => {
    setHods([...hods, { name: '', status: 'Present' }]);
  };

  const removeHod = (index) => {
    const newList = [...hods];
    newList.splice(index, 1);
    setHods(newList);
  };

  const handleHodChange = (index, field, value) => {
    setHods(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  // Dynamic Add / Remove handlers for Supervisors (Immutable updates)
  const addSupervisor = () => {
    setSupervisors([...supervisors, { name: '', status: 'Present' }]);
  };

  const removeSupervisor = (index) => {
    const newList = [...supervisors];
    newList.splice(index, 1);
    setSupervisors(newList);
  };

  const handleSupervisorChange = (index, field, value) => {
    setSupervisors(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  // Dynamic Add / Remove handlers for Organization Helpers (Immutable updates)
  const addOrgHelper = () => {
    setOrgHelpers([...orgHelpers, { name: '', status: 'Present' }]);
  };

  const removeOrgHelper = (index) => {
    const newList = [...orgHelpers];
    newList.splice(index, 1);
    setOrgHelpers(newList);
  };

  const handleOrgHelperChange = (index, field, value) => {
    setOrgHelpers(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  // Dynamic Add / Remove handlers for Daily Helpers (Immutable updates)
  const addDailyHelper = () => {
    setDailyHelpers([...dailyHelpers, { name: '', status: 'Present' }]);
  };

  const removeDailyHelper = (index) => {
    const newList = [...dailyHelpers];
    newList.splice(index, 1);
    setDailyHelpers(newList);
  };

  const handleDailyHelperChange = (index, field, value) => {
    setDailyHelpers(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const finalDept = isCustomDept ? customDept.trim() : department;
    if (!finalDept) {
      showAlert('danger', 'Please enter a department name.');
      return;
    }

    // Filter valid lists
    const filteredHods = hods.filter(h => h.name !== '');
    if (filteredHods.length === 0) {
      showAlert('danger', 'Please select at least one Head of Department (HOD).');
      return;
    }
    const filteredSupervisors = supervisors.filter(s => s.name !== '');
    const filteredOrgHelpers = orgHelpers.filter(h => h.name !== '').map(h => ({ ...h, type: 'organization' }));
    const filteredDailyHelpers = dailyHelpers.filter(h => h.name.trim() !== '').map(h => ({ ...h, type: 'daily' }));

    const combinedHelpers = [...filteredOrgHelpers, ...filteredDailyHelpers];

    const payload = {
      date,
      department: finalDept,
      hods: filteredHods,
      supervisors: filteredSupervisors,
      helpers: combinedHelpers,
      mastersCount: parseInt(mastersCount) || 0
    };

    try {
      const res = await store.saveAttendance(payload);
      if (res && res.success) {
        showAlert('success', `Attendance saved for ${finalDept} on ${date}.`);
        // Reset form fields
        setHods([{ name: '', status: 'Present' }]);
        setSupervisors([{ name: '', status: 'Present' }]);
        setMastersCount(0);
        setOrgHelpers([{ name: '', status: 'Present' }]);
        setDailyHelpers([{ name: '', status: 'Present' }]);
        loadHistory();
      } else {
        showAlert('danger', res.message || 'Failed to save.');
      }
    } catch (e) {
      console.error(e);
      showAlert('danger', e.message || 'Error occurred while saving.');
    }
  };

  const handleDeleteRecord = async (id, dept, recDate) => {
    if (!window.confirm(`Delete attendance for ${dept} on ${recDate}?`)) return;
    try {
      const res = await store.deleteAttendance(id);
      if (res && res.success) {
        showAlert('success', 'Attendance record deleted.');
        if (selectedRecord && selectedRecord.id === id) {
          setSelectedRecord(null);
        }
        loadHistory();
      }
    } catch (e) {
      console.error(e);
      showAlert('danger', 'Error deleting record.');
    }
  };

  const parseJsonList = (str) => {
    if (!str) return [];
    try {
      return JSON.parse(str);
    } catch (e) {
      return [];
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Present': return 'status-pill-present';
      case 'Absent': return 'status-pill-absent';
      case 'Half Day': return 'status-pill-half';
      default: return '';
    }
  };

  // EXPORT TO CSV (Date Range)
  const handleRangeExport = () => {
    const rangeRecords = attendanceList.filter(item => item.date >= exportStart && item.date <= exportEnd);
    if (rangeRecords.length === 0) {
      showAlert('danger', 'No records found in the selected date range.');
      return;
    }
    const headers = ['Date', 'Department', 'HODs (Heads of Dept)', 'Supervisors', 'Cutter Masters Count', 'Org Helpers', 'Daily Helpers'];
    const rows = rangeRecords.map(item => {
      const parsedHods = item.hods ? parseJsonList(item.hods) : [{ name: item.hodName, status: item.hodStatus }];
      const hodListStr = parsedHods.map(h => `${h.name}(${h.status})`).join('; ');
      const sups = parseJsonList(item.supervisors).map(s => `${s.name}(${s.status})`).join('; ');
      const allHelpers = parseJsonList(item.helpers);
      const orgH = allHelpers.filter(h => h.type === 'organization' || !h.type).map(h => `${h.name}(${h.status})`).join('; ');
      const dailyH = allHelpers.filter(h => h.type === 'daily').map(h => `${h.name}(${h.status})`).join('; ');
      return [
        item.date,
        item.department,
        hodListStr,
        sups,
        item.mastersCount || 0,
        orgH,
        dailyH
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Manpower_Report_${exportStart}_to_${exportEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('success', 'Date range CSV report downloaded successfully.');
  };

  // EXPORT INDIVIDUAL EMPLOYEE CSV
  const downloadEmployeeReport = () => {
    if (!selectedReportEmployee) {
      showAlert('danger', 'Please select an employee first.');
      return;
    }
    const rangeRecords = attendanceList.filter(item => item.date >= empStartRange && item.date <= empEndRange);
    
    const results = [];
    rangeRecords.forEach(item => {
      const parsedHods = item.hods ? parseJsonList(item.hods) : [{ name: item.hodName, status: item.hodStatus }];
      const sups = parseJsonList(item.supervisors);
      const helpers = parseJsonList(item.helpers);

      // Check HODs
      parsedHods.forEach(h => {
        if (h.name && h.name.toLowerCase() === selectedReportEmployee.toLowerCase()) {
          results.push({
            date: item.date,
            employee: h.name,
            role: 'HOD',
            department: item.department,
            status: h.status
          });
        }
      });

      // Check Supervisors
      sups.forEach(s => {
        if (s.name && s.name.toLowerCase() === selectedReportEmployee.toLowerCase()) {
          results.push({
            date: item.date,
            employee: s.name,
            role: 'Supervisor',
            department: item.department,
            status: s.status
          });
        }
      });

      // Check Helpers
      helpers.forEach(h => {
        if (h.name && h.name.toLowerCase() === selectedReportEmployee.toLowerCase()) {
          results.push({
            date: item.date,
            employee: h.name,
            role: h.type === 'organization' ? 'Org Helper' : 'Daily Helper',
            department: item.department,
            status: h.status
          });
        }
      });
    });

    if (results.length === 0) {
      showAlert('danger', `No attendance logs found for ${selectedReportEmployee} between ${empStartRange} and ${empEndRange}.`);
      return;
    }

    const headers = ['Date', 'Employee Name', 'Role', 'Department', 'Status'];
    const rows = results.map(r => [r.date, r.employee, r.role, r.department, r.status]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedReportEmployee.replace(/\s+/g, '_')}_Attendance_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('success', `Attendance report for ${selectedReportEmployee} downloaded successfully.`);
  };

  const exportToCSV = () => {
    if (attendanceList.length === 0) {
      showAlert('danger', 'No records available to export.');
      return;
    }
    const headers = ['Date', 'Department', 'HODs (Heads of Dept)', 'Supervisors', 'Cutter Masters Count', 'Org Helpers', 'Daily Helpers'];
    const rows = filteredHistory.map(item => {
      const parsedHods = item.hods ? parseJsonList(item.hods) : [{ name: item.hodName, status: item.hodStatus }];
      const hodListStr = parsedHods.map(h => `${h.name}(${h.status})`).join('; ');
      const sups = parseJsonList(item.supervisors).map(s => `${s.name}(${s.status})`).join('; ');
      const allHelpers = parseJsonList(item.helpers);
      const orgH = allHelpers.filter(h => h.type === 'organization' || !h.type).map(h => `${h.name}(${h.status})`).join('; ');
      const dailyH = allHelpers.filter(h => h.type === 'daily').map(h => `${h.name}(${h.status})`).join('; ');
      return [
        item.date,
        item.department,
        hodListStr,
        sups,
        item.mastersCount || 0,
        orgH,
        dailyH
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('success', 'CSV report downloaded successfully.');
  };

  // PRINT SHIFT REPORT Function
  const printReport = (item) => {
    const parsedHods = item.hods ? parseJsonList(item.hods) : [{ name: item.hodName, status: item.hodStatus }];
    const sups = parseJsonList(item.supervisors);
    const allHelpers = parseJsonList(item.helpers);
    const orgH = allHelpers.filter(h => h.type === 'organization' || !h.type);
    const dailyH = allHelpers.filter(h => h.type === 'daily');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Shift Report - ${item.department} - ${item.date}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: 800; color: #1e40af; margin: 0; letter-spacing: -0.5px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; font-size: 14px; }
            .meta-item { background: #f0f7ff; padding: 14px; border-radius: 8px; border: 1px solid #bfdbfe; }
            .section { margin-top: 30px; }
            .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #1e40af; letter-spacing: 1px; border-bottom: 2px solid #dbeafe; padding-bottom: 6px; margin-bottom: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { text-align: left; padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
            th { background: #f8fafc; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
            .status { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; display: inline-block; }
            .status-present { background: #dcfce7; color: #15803d; }
            .status-absent { background: #fee2e2; color: #b91c1c; }
            .status-half { background: #fef3c7; color: #b45309; }
            .footer { margin-top: 60px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">TEXTILE WAREHOUSE MANAGEMENT SYSTEM</div>
            <div style="font-size: 14px; color: #64748b; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Shift Manpower & Attendance Log</div>
            <div class="meta">
              <div class="meta-item"><strong>DEPARTMENT / WORK AREA:</strong> ${item.department}</div>
              <div class="meta-item"><strong>LOG DATE:</strong> ${item.date}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Heads of Department (HODs) / Cutting Heads</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 70%;">HOD Name</th>
                  <th>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                ${parsedHods.map(h => `
                  <tr>
                    <td><strong>${h.name}</strong></td>
                    <td><span class="status ${h.status === 'Present' ? 'status-present' : h.status === 'Absent' ? 'status-absent' : 'status-half'}">${h.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Shift Supervisors</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 70%;">Supervisor Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${sups.length === 0 ? '<tr><td colspan="2" style="color:#94a3b8;font-style:italic;">No Supervisors assigned for this shift</td></tr>' : sups.map(s => `
                  <tr>
                    <td>${s.name}</td>
                    <td><span class="status ${s.status === 'Present' ? 'status-present' : s.status === 'Absent' ? 'status-absent' : 'status-half'}">${s.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Cutter Masters (Table Masters)</div>
            <div style="background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0; font-size:14px; display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#475569; font-weight:600;">Total Cutter Masters Allocated on Tables:</span>
              <strong style="font-size:16px; color:#1e40af;">${item.mastersCount || 0} Present</strong>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Shift Helpers Allocation</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 45%;">Helper Name</th>
                  <th style="width: 35%;">Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${orgH.map(h => `
                  <tr>
                    <td>${h.name}</td>
                    <td style="color:#475569;">Organization Helper (Permanent)</td>
                    <td><span class="status ${h.status === 'Present' ? 'status-present' : h.status === 'Absent' ? 'status-absent' : 'status-half'}">${h.status}</span></td>
                  </tr>
                `).join('')}
                ${dailyH.map(h => `
                  <tr>
                    <td>${h.name}</td>
                    <td style="color:#059669; font-weight:600;">Temporary Daily Helper</td>
                    <td><span class="status ${h.status === 'Present' ? 'status-present' : h.status === 'Absent' ? 'status-absent' : 'status-half'}">${h.status}</span></td>
                  </tr>
                `).join('')}
                ${(orgH.length === 0 && dailyH.length === 0) ? '<tr><td colspan="3" style="color:#94a3b8;font-style:italic;">No helper allocation logged</td></tr>' : ''}
              </tbody>
            </table>
          </div>

          <div class="footer">
            Generated officially on ${new Date().toLocaleString()} | TWMS Shift Attendance Database
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter staff by role
  const masterHODs = staffRegistry.filter(s => s.role === 'HOD');
  const masterSupervisors = staffRegistry.filter(s => s.role === 'Supervisor');
  const masterHelpers = staffRegistry.filter(s => s.role === 'Helper');

  const filteredHistory = attendanceList.filter(item => {
    const term = historySearch.toLowerCase();
    return (
      item.department.toLowerCase().includes(term) ||
      (item.hodName && item.hodName.toLowerCase().includes(term)) ||
      item.date.includes(term)
    );
  });

  // Calculate stats for today's active table
  const cuttingTodayLogs = attendanceList.filter(l => l.date === date && l.department.toLowerCase().includes('cutting'));
  const totalCutterMastersPresentToday = cuttingTodayLogs.reduce((sum, item) => {
    return sum + (item.mastersCount || 0);
  }, 0);

  // DASHBOARD CALCULATIONS (For dashboardDate)
  const dashboardRecords = attendanceList.filter(item => item.date === dashboardDate);

  // 1. Manpower Totals
  let totalPresent = 0;
  let totalLogged = 0;
  let totalMastersActive = 0;
  let absenteesList = []; // list of permanent staff marked Absent

  dashboardRecords.forEach(rec => {
    const recHods = rec.hods ? parseJsonList(rec.hods) : [{ name: rec.hodName, status: rec.hodStatus }];
    const recSups = parseJsonList(rec.supervisors);
    const recHelpers = parseJsonList(rec.helpers);

    // HODs
    recHods.forEach(h => {
      if (h.name) {
        totalLogged++;
        if (h.status === 'Present') totalPresent++;
        if (h.status === 'Half Day') totalPresent += 0.5;
        if (h.status === 'Absent') absenteesList.push({ name: h.name, role: 'HOD', dept: rec.department });
      }
    });

    // Supervisors
    recSups.forEach(s => {
      if (s.name) {
        totalLogged++;
        if (s.status === 'Present') totalPresent++;
        if (s.status === 'Half Day') totalPresent += 0.5;
        if (s.status === 'Absent') absenteesList.push({ name: s.name, role: 'Supervisor', dept: rec.department });
      }
    });

    // Cutter Masters
    totalPresent += (rec.mastersCount || 0);
    totalLogged += (rec.mastersCount || 0);
    totalMastersActive += (rec.mastersCount || 0);

    // Helpers
    recHelpers.forEach(hlp => {
      if (hlp.name) {
        totalLogged++;
        if (hlp.status === 'Present') totalPresent++;
        if (hlp.status === 'Half Day') totalPresent += 0.5;
        if (hlp.status === 'Absent' && hlp.type === 'organization') {
          absenteesList.push({ name: hlp.name, role: 'Org Helper', dept: rec.department });
        }
      }
    });
  });

  const presenteeismRate = totalLogged > 0 ? Math.round((totalPresent / totalLogged) * 100) : 0;

  return (
    <div className="attendance-container">
      {/* HEADER SECTION */}
      <div className="attendance-header">
        <div className="header-title-container">
          <div className="header-icon-glow">
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h1 className="attendance-title">Manpower & Attendance Portal</h1>
            <p className="attendance-subtitle">Analyze rosters, record shifts, configure personnel registries, and download reports</p>
          </div>
        </div>

        <div className="header-actions">
          {/* TAB SELECTORS */}
          <div className="tab-group">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <BarChart2 size={14} />
              <span>Dashboard Overview</span>
            </button>
            <button 
              onClick={() => setActiveTab('registry')} 
              className={`tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
            >
              <FileSpreadsheet size={14} />
              <span>Roster & Shift Entry</span>
            </button>
          </div>

          <button 
            onClick={() => setShowRegistryManager(!showRegistryManager)} 
            className={`btn-registry-toggle ${showRegistryManager ? 'active' : ''}`}
          >
            <Settings size={14} />
            <span>{showRegistryManager ? 'Close Staff Setup' : 'Configure Staff'}</span>
          </button>
        </div>
      </div>

      {alertMsg && (
        <div className={`attendance-alert alert-${alertMsg.type}`}>
          {alertMsg.type === 'success' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* REGISTRY MANAGER (COLLAPSIBLE DRAWER) */}
      {showRegistryManager && (
        <div className="registry-manager-panel">
          <div className="registry-panel-header">
            <div className="panel-title-container">
              <Users size={16} className="registry-icon" />
              <h3>Permanent Staff Registry</h3>
            </div>
            <p className="panel-desc">Register permanent personnel here. Registered employees will show up instantly in form dropdown selectors.</p>
          </div>

          <div className="registry-panel-body">
            <form onSubmit={handleAddStaff} className="registry-add-form">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Personnel Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe"
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1.2 }}>
                <label className="form-label">Role Category</label>
                <select 
                  value={newStaffRole}
                  onChange={e => setNewStaffRole(e.target.value)}
                  className="form-input"
                >
                  <option value="HOD">Head of Dept (HOD)</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Helper">Organization Helper</option>
                </select>
              </div>
              <button type="submit" className="btn-add-staff">
                <PlusCircle size={14} />
                <span>Register Personnel</span>
              </button>
            </form>

            <div className="registry-display-grid">
              {/* HOD COLUMN */}
              <div className="registry-role-column">
                <h4 className="role-col-title">HODs / Cutting Heads ({masterHODs.length})</h4>
                <div className="registry-list-wrapper">
                  {masterHODs.map(s => (
                    <div key={s.id} className="registry-staff-pill">
                      <span>{s.name}</span>
                      <button type="button" onClick={() => handleDeleteStaff(s.id, s.name)} className="btn-remove-staff" title="Remove staff">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  {masterHODs.length === 0 && <span className="empty-text">No HODs added</span>}
                </div>
              </div>

              {/* SUPERVISOR COLUMN */}
              <div className="registry-role-column">
                <h4 className="role-col-title">Shift Supervisors ({masterSupervisors.length})</h4>
                <div className="registry-list-wrapper">
                  {masterSupervisors.map(s => (
                    <div key={s.id} className="registry-staff-pill">
                      <span>{s.name}</span>
                      <button type="button" onClick={() => handleDeleteStaff(s.id, s.name)} className="btn-remove-staff" title="Remove staff">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  {masterSupervisors.length === 0 && <span className="empty-text">No supervisors added</span>}
                </div>
              </div>

              {/* HELPERS COLUMN */}
              <div className="registry-role-column">
                <h4 className="role-col-title">Org Helpers ({masterHelpers.length})</h4>
                <div className="registry-list-wrapper">
                  {masterHelpers.map(s => (
                    <div key={s.id} className="registry-staff-pill">
                      <span>{s.name}</span>
                      <button type="button" onClick={() => handleDeleteStaff(s.id, s.name)} className="btn-remove-staff" title="Remove staff">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  {masterHelpers.length === 0 && <span className="empty-text">No helpers added</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW RENDER SHIFT */}
      {activeTab === 'dashboard' ? (
        /* ================= DASHBOARD OVERVIEW ================= */
        <div className="dashboard-root anim-fade">
          
          {/* Top Controls Row */}
          <div className="dashboard-control-row">
            <div className="dashboard-date-picker-block">
              <CalendarDays size={16} className="text-violet" />
              <span> Roster Date Filter: </span>
              <input 
                type="date" 
                value={dashboardDate}
                onChange={e => setDashboardDate(e.target.value)}
                className="form-input"
                style={{ width: 160, padding: '6px 12px', fontSize: 13.5 }}
              />
            </div>

            <div className="range-exporter-bar">
              <span className="exporter-label">Range Exporter:</span>
              <input 
                type="date" 
                value={exportStart} 
                onChange={e => setExportStart(e.target.value)} 
                className="form-input text-xs" 
                style={{ width: 135, padding: '5px 8px' }} 
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input 
                type="date" 
                value={exportEnd} 
                onChange={e => setExportEnd(e.target.value)} 
                className="form-input text-xs" 
                style={{ width: 135, padding: '5px 8px' }} 
              />
              <button onClick={handleRangeExport} className="btn-exporter-range">
                <Download size={13} />
                <span>Export Range CSV</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="dashboard-cards-grid">
            <div className="metric-card violet">
              <div className="card-bg-glow"></div>
              <div className="metric-header">
                <span>Total Present Manpower</span>
                <Users size={18} className="icon-badge" />
              </div>
              <div className="metric-val">{totalPresent} <span className="subtext">Staff</span></div>
              <div className="metric-desc">Registered + daily labor logged present on this date</div>
            </div>

            <div className="metric-card blue">
              <div className="card-bg-glow"></div>
              <div className="metric-header">
                <span>Presenteeism Rate</span>
                <TrendingUp size={18} className="icon-badge" />
              </div>
              <div className="metric-val">{presenteeismRate}%</div>
              <div className="metric-desc">Percent ratio of active personnel vs total scheduled roster</div>
            </div>

            <div className="metric-card green">
              <div className="card-bg-glow"></div>
              <div className="metric-header">
                <span>Active Cutter Masters</span>
                <Activity size={18} className="icon-badge" />
              </div>
              <div className="metric-val">{totalMastersActive} <span className="subtext">Masters</span></div>
              <div className="metric-desc">Total table cutters actively operating cutting tables today</div>
            </div>

            <div className="metric-card red">
              <div className="card-bg-glow"></div>
              <div className="metric-header">
                <span>Absentee Count</span>
                <UserMinus size={18} className="icon-badge" />
              </div>
              <div className="metric-val">{absenteesList.length} <span className="subtext">Staff</span></div>
              <div className="metric-desc">Permanent staff members registered but absent on shift</div>
            </div>
          </div>

          {/* Dashboard Table & Absentee Log split */}
          <div className="dashboard-grid-split">
            
            {/* Department Roster Table */}
            <div className="dashboard-table-card">
              <div className="card-title-header">
                <Briefcase size={16} className="text-blue" />
                <h3>Department Manpower Distribution</h3>
              </div>

              {dashboardRecords.length === 0 ? (
                <div className="empty-dashboard-table">
                  <ClipboardList size={34} className="muted-icon" />
                  <p>No shift attendance files committed for {dashboardDate}.</p>
                  <button onClick={() => setActiveTab('registry')} className="btn-add-item" style={{ marginTop: 10 }}>
                    <Plus size={12} /> Log Shift Now
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="roster-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>HODs Present</th>
                        <th>Supervisors Present</th>
                        <th>Cutter Masters</th>
                        <th>Helpers Present</th>
                        <th>Total Manpower</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardRecords.map(rec => {
                        const recHods = rec.hods ? parseJsonList(rec.hods) : [{ name: rec.hodName, status: rec.hodStatus }];
                        const recSups = parseJsonList(rec.supervisors);
                        const recHelpers = parseJsonList(rec.helpers);

                        const presentHods = recHods.filter(h => h.status === 'Present' || h.status === 'Half Day').length;
                        const presentSups = recSups.filter(s => s.status === 'Present' || s.status === 'Half Day').length;
                        const presentHelpers = recHelpers.filter(h => h.status === 'Present' || h.status === 'Half Day').length;
                        const recTotal = presentHods + presentSups + (rec.mastersCount || 0) + presentHelpers;

                        return (
                          <tr key={rec.id}>
                            <td>
                              <span className="dept-tag">{rec.department}</span>
                            </td>
                            <td>{presentHods} / {recHods.length}</td>
                            <td>{presentSups} / {recSups.length}</td>
                            <td>
                              <span className="masters-tag">{rec.mastersCount || 0} Masters</span>
                            </td>
                            <td>{presentHelpers} / {recHelpers.length}</td>
                            <td className="bold">{recTotal} Active</td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                onClick={() => printReport(rec)} 
                                className="btn-print-icon" 
                                title="Print Shift Report"
                              >
                                <Printer size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column Side Panel (Absentee Log + Employee Report) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Today's Absentee List Card */}
              <div className="dashboard-table-card side-absentee-card">
                <div className="card-title-header">
                  <UserMinus size={16} className="text-danger-color" />
                  <h3>Roster Absentee Log ({dashboardDate})</h3>
                </div>

                {absenteesList.length === 0 ? (
                  <div className="empty-absentees-state">
                    <CheckCircle2 size={30} className="text-success" />
                    <p>Excellent! All scheduled permanent staff members are present today.</p>
                  </div>
                ) : (
                  <div className="absentee-scroll-list">
                    {absenteesList.map((abs, idx) => (
                      <div key={idx} className="absentee-row-card">
                        <div className="absentee-info">
                          <span className="absentee-name">{abs.name}</span>
                          <span className="absentee-role-badge">{abs.role}</span>
                        </div>
                        <span className="absentee-dept-tag">{abs.dept}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Individual Employee Report Card */}
              <div className="dashboard-table-card employee-report-card">
                <div className="card-title-header">
                  <FileDown size={16} className="text-violet" />
                  <h3>Individual Employee Report</h3>
                </div>
                
                <div className="employee-report-form">
                  <div className="form-group">
                    <label className="form-label">Select Staff Member</label>
                    <select 
                      value={selectedReportEmployee} 
                      onChange={e => setSelectedReportEmployee(e.target.value)} 
                      className="form-input"
                    >
                      <option value="">-- Choose Employee --</option>
                      {staffRegistry.map(s => (
                        <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-grid-2" style={{ marginTop: 12 }}>
                    <div className="form-group">
                      <label className="form-label text-xs">Start Date</label>
                      <input 
                        type="date" 
                        value={empStartRange} 
                        onChange={e => setEmpStartRange(e.target.value)} 
                        className="form-input text-xs" 
                        style={{ padding: '6px 10px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-xs">End Date</label>
                      <input 
                        type="date" 
                        value={empEndRange} 
                        onChange={e => setEmpEndRange(e.target.value)} 
                        className="form-input text-xs" 
                        style={{ padding: '6px 10px' }}
                      />
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={downloadEmployeeReport}
                    className="btn-download-employee-report"
                  >
                    <Download size={14} />
                    <span>Download Attendance History</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* ================= REGISTRY & ENTRY FORM ================= */
        <div className="attendance-layout anim-fade">
          
          {/* ENTRY FORM */}
          <div className="attendance-card form-section">
            <div className="card-top-decorator">
              <Sparkles size={14} className="sparkle-icon" />
              <span>Shift Entry Form</span>
            </div>

            <form onSubmit={handleSave} className="entry-form">
              
              {/* DATE & DEPT */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    <Calendar size={13} className="icon-inline" /> Date
                  </label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    className="form-input" 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department / Work Area</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!isCustomDept ? (
                      <select 
                        value={department} 
                        onChange={e => {
                          if (e.target.value === 'custom') {
                            setIsCustomDept(true);
                          } else {
                            setDepartment(e.target.value);
                          }
                        }}
                        className="form-input"
                      >
                        {DEPARTMENTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                        <option value="custom">+ Other (Custom)</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                        <input 
                          type="text" 
                          placeholder="Enter Dept Name" 
                          value={customDept} 
                          onChange={e => setCustomDept(e.target.value)} 
                          className="form-input"
                          required
                        />
                        <button 
                          type="button" 
                          onClick={() => setIsCustomDept(false)} 
                          className="btn-text-cancel"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* HODs DYNAMIC SECTION */}
              <div className="group-box">
                <div className="group-box-header-clean">
                  <span className="step-badge">1</span>
                  <h3 className="group-box-title">Heads of Department (HODs) / Cutting Heads</h3>
                  <button 
                    type="button" 
                    onClick={addHod}
                    className="btn-add-item"
                  >
                    <Plus size={12} /> Add HOD
                  </button>
                </div>
                
                {hods.map((hod, idx) => (
                  <div key={idx} className="dynamic-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <select 
                        value={hod.name} 
                        onChange={e => handleHodChange(idx, 'name', e.target.value)} 
                        className="form-input"
                        required
                      >
                        <option value="">-- Select Registered HOD --</option>
                        {masterHODs.map(h => (
                          <option key={h.id} value={h.name}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group" style={{ flex: 1.2 }}>
                      <div className="status-selector">
                        {STATUS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleHodChange(idx, 'status', opt.value)}
                            className={`status-btn btn-${opt.color} ${hod.status === opt.value ? 'active' : ''}`}
                          >
                            <opt.icon size={12} />
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {hods.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeHod(idx)}
                        className="btn-delete-row"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* SUPERVISORS SECTION */}
              <div className="group-box">
                <div className="group-box-header-clean">
                  <span className="step-badge">2</span>
                  <h3 className="group-box-title">Shift Supervisors</h3>
                  <button 
                    type="button" 
                    onClick={addSupervisor}
                    className="btn-add-item"
                  >
                    <Plus size={12} /> Add Supervisor
                  </button>
                </div>
                
                {supervisors.map((sup, idx) => (
                  <div key={idx} className="dynamic-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <select 
                        value={sup.name} 
                        onChange={e => handleSupervisorChange(idx, 'name', e.target.value)} 
                        className="form-input"
                      >
                        <option value="">-- Select Supervisor --</option>
                        {masterSupervisors.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group" style={{ flex: 1.2 }}>
                      <div className="status-selector">
                        {STATUS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSupervisorChange(idx, 'status', opt.value)}
                            className={`status-btn btn-${opt.color} ${sup.status === opt.value ? 'active' : ''}`}
                          >
                            <opt.icon size={12} />
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {supervisors.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeSupervisor(idx)}
                        className="btn-delete-row"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* CUTTER MASTERS COUNT */}
              <div className="group-box">
                <div className="group-box-header-clean">
                  <span className="step-badge">3</span>
                  <h3 className="group-box-title">Cutter Masters (Table Masters)</h3>
                </div>
                
                <div className="counter-row">
                  <span className="counter-label">Total Cutter Masters Present on Tables:</span>
                  <div className="counter-control-group">
                    <button 
                      type="button" 
                      onClick={() => setMastersCount(Math.max(0, mastersCount - 1))}
                      className="btn-counter"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={mastersCount} 
                      onChange={e => setMastersCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="counter-input"
                    />
                    <button 
                      type="button" 
                      onClick={() => setMastersCount(mastersCount + 1)}
                      className="btn-counter"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* HELPERS SECTION */}
              <div className="group-box">
                <div className="group-box-header-clean">
                  <span className="step-badge">4</span>
                  <h3 className="group-box-title">Helpers Allocation</h3>
                </div>

                {/* ORGANIZATIONAL HELPERS */}
                <div className="helper-allocation-card">
                  <div className="allocation-card-header">
                    <span className="allocation-title-tag">Permanent Org Helpers</span>
                    <button type="button" onClick={addOrgHelper} className="btn-add-allocation">
                      <Plus size={11} /> Add Helper
                    </button>
                  </div>

                  {orgHelpers.map((hlp, idx) => (
                    <div key={`org-${idx}`} className="dynamic-row" style={{ marginTop: idx > 0 ? 8 : 0 }}>
                      <div className="form-group" style={{ flex: 2 }}>
                        <select 
                          value={hlp.name} 
                          onChange={e => handleOrgHelperChange(idx, 'name', e.target.value)} 
                          className="form-input"
                        >
                          <option value="">-- Select Helper --</option>
                          {masterHelpers.map(h => (
                            <option key={h.id} value={h.name}>{h.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1.2 }}>
                        <div className="status-selector">
                          {STATUS_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleOrgHelperChange(idx, 'status', opt.value)}
                              className={`status-btn btn-${opt.color} ${hlp.status === opt.value ? 'active' : ''}`}
                            >
                              <opt.icon size={12} />
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {orgHelpers.length > 1 && (
                        <button type="button" onClick={() => removeOrgHelper(idx)} className="btn-delete-row">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* DAILY HELPERS */}
                <div className="helper-allocation-card secondary">
                  <div className="allocation-card-header">
                    <span className="allocation-title-tag green">Temporary Daily Helpers</span>
                    <button type="button" onClick={addDailyHelper} className="btn-add-allocation green">
                      <Plus size={11} /> Add Daily Helper
                    </button>
                  </div>

                  {dailyHelpers.map((hlp, idx) => (
                    <div key={`daily-${idx}`} className="dynamic-row" style={{ marginTop: idx > 0 ? 8 : 0 }}>
                      <div className="form-group" style={{ flex: 2 }}>
                        <input 
                          type="text" 
                          placeholder={`Daily Helper #${idx + 1} Name`}
                          value={hlp.name} 
                          onChange={e => handleDailyHelperChange(idx, 'name', e.target.value)} 
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1.2 }}>
                        <div className="status-selector">
                          {STATUS_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleDailyHelperChange(idx, 'status', opt.value)}
                              className={`status-btn btn-${opt.color} ${hlp.status === opt.value ? 'active' : ''}`}
                            >
                              <opt.icon size={12} />
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {dailyHelpers.length > 1 && (
                        <button type="button" onClick={() => removeDailyHelper(idx)} className="btn-delete-row">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-submit-attendance">
                Commit Shift Log
              </button>
            </form>
          </div>

          {/* LOGS HISTORY */}
          <div className="attendance-card history-section">
            <div className="history-header">
              <h2 className="section-title">Shift History Records</h2>
              <div className="search-bar">
                <Search size={14} className="search-icon-inside" />
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  value={historySearch} 
                  onChange={e => setHistorySearch(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Stat summary widget */}
            <div className="shift-summary-badge">
              <div className="summary-badge-title-block">
                <Sparkles size={14} className="text-violet" />
                <span>Today's Cutting Summary</span>
              </div>
              <span className="summary-val">{totalCutterMastersPresentToday} Cutter Masters Active Today</span>
            </div>

            {loading ? (
              <div className="history-loading">
                <span className="spinner"></span> Querying database...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="no-logs">
                <ClipboardList size={38} className="muted-icon" />
                <p>No shift records logged.</p>
              </div>
            ) : (
              <div className="logs-list">
                {filteredHistory.map(item => {
                  const parsedHods = item.hods ? parseJsonList(item.hods) : [{ name: item.hodName, status: item.hodStatus }];
                  const sups = parseJsonList(item.supervisors);
                  const allHelpers = parseJsonList(item.helpers);
                  
                  const orgH = allHelpers.filter(h => h.type === 'organization' || !h.type);
                  const dailyH = allHelpers.filter(h => h.type === 'daily');
                  
                  const isSelected = selectedRecord && selectedRecord.id === item.id;

                  return (
                    <div 
                      key={item.id} 
                      className={`log-item ${isSelected ? 'selected' : ''}`}
                    >
                      <div 
                        className="log-summary" 
                        onClick={() => setSelectedRecord(isSelected ? null : item)}
                      >
                        <div className="log-badge-dept">
                          <Briefcase size={12} />
                          <span>{item.department}</span>
                        </div>
                        <div className="log-date">{item.date}</div>
                        <div className="log-brief">
                          HODs: <span className="bold">{parsedHods.map(h => h.name).join(', ')}</span>
                        </div>
                        <ChevronDown size={15} className={`arrow-icon ${isSelected ? 'rotate' : ''}`} />
                      </div>

                      {isSelected && (
                        <div className="log-detail-pane">
                          
                          {/* Detail Header controls */}
                          <div className="log-detail-controls">
                            <span>Detail Breakdown</span>
                            <button 
                              type="button" 
                              onClick={() => printReport(item)}
                              className="btn-print-report"
                            >
                              <Printer size={12} />
                              <span>Print/Save PDF Report</span>
                            </button>
                          </div>

                          <div className="detail-grid">
                            
                            {/* HOD Detail Card */}
                            <div className="detail-card">
                              <span className="detail-card-label">Heads of Department (HODs) ({parsedHods.length})</span>
                              {parsedHods.map((h, idx) => (
                                <div key={idx} className="person-row border-top" style={{ borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none' }}>
                                  <span className="person-name">{h.name}</span>
                                  <span className={`status-pill ${getStatusBadgeClass(h.status)}`}>
                                    {h.status}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Supervisors Detail Card */}
                            <div className="detail-card">
                              <span className="detail-card-label">Shift Supervisors ({sups.length})</span>
                              {sups.length === 0 ? (
                                <div className="no-people">None assigned</div>
                              ) : (
                                sups.map((s, idx) => (
                                  <div key={idx} className="person-row border-top">
                                    <span className="person-name">{s.name}</span>
                                    <span className={`status-pill ${getStatusBadgeClass(s.status)}`}>
                                      {s.status}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Cutter Masters Detail Card */}
                            <div className="detail-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="detail-card-label" style={{ margin: 0 }}>Cutter Masters (Total Allocated)</span>
                              <span className="masters-count-badge">
                                {item.mastersCount || 0} Present
                              </span>
                            </div>

                            {/* Helpers Detail Card */}
                            <div className="detail-card">
                              <span className="detail-card-label">Helpers Allocation (Permanent: {orgH.length} | Daily: {dailyH.length})</span>
                              
                              {/* Org Helpers */}
                              {orgH.map((s, idx) => (
                                <div key={`org-${idx}`} className="person-row border-top">
                                  <div>
                                    <span className="person-name">{s.name}</span>
                                    <span className="mini-subtext"> (Org Helper)</span>
                                  </div>
                                  <span className={`status-pill ${getStatusBadgeClass(s.status)}`}>
                                    {s.status}
                                  </span>
                                </div>
                              ))}

                              {/* Daily Helpers */}
                              {dailyH.map((s, idx) => (
                                <div key={`daily-${idx}`} className="person-row border-top">
                                  <div>
                                    <span className="person-name" style={{ color: '#10b981' }}>{s.name}</span>
                                    <span className="mini-subtext"> (Daily Helper)</span>
                                  </div>
                                  <span className={`status-pill ${getStatusBadgeClass(s.status)}`}>
                                    {s.status}
                                  </span>
                                </div>
                              ))}

                              {orgH.length === 0 && dailyH.length === 0 && (
                                <div className="no-people">No helpers allocated</div>
                              )}
                            </div>

                          </div>

                          <div className="detail-actions">
                            <button 
                              onClick={() => handleDeleteRecord(item.id, item.department, item.date)}
                              className="btn-danger-action"
                            >
                              <Trash2 size={12} /> Delete Record
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* THEORETICAL INFORMATION CARD */}
            <div className="theoretical-info-card">
              <div className="info-card-header">
                <HelpCircle size={15} />
                <h4>Why Segment Shift Registers?</h4>
              </div>
              <p className="info-card-body">
                Segmenting staffing structures into distinct, role-based records enables granular manpower accountability, improves cutting hall capacity calculations, and feeds precise productivity statistics directly into production audit logs.
              </p>
            </div>
          </div>

        </div>
      )}

      <style>{`
        .attendance-container {
          padding: 28px;
          font-family: 'Outfit', 'Inter', sans-serif;
          color: var(--text-primary);
        }

        .anim-fade {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .attendance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-title-container {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon-glow {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
        }

        .attendance-title {
          font-size: 25px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .attendance-subtitle {
          font-size: 13.5px;
          color: var(--text-muted);
          margin: 4px 0 0 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* TAB CONTROLS */
        .tab-group {
          display: flex;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          padding: 3px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 12.5px;
          font-weight: 750;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: var(--text-primary);
        }

        .tab-btn.active {
          background: var(--surface);
          color: #7c3aed;
          box-shadow: var(--shadow-sm);
        }

        .btn-export-csv {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
          transition: all 0.2s;
        }

        .btn-export-csv:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .btn-registry-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-registry-toggle:hover, .btn-registry-toggle.active {
          border-color: #7c3aed;
          color: #7c3aed;
          background: rgba(124, 58, 237, 0.05);
        }

        .attendance-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 24px;
        }

        /* REGISTRY PANEL DECORATIONS */
        .registry-manager-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 28px;
          box-shadow: var(--shadow-md);
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .panel-title-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .registry-icon {
          color: #7c3aed;
        }

        .panel-title-container h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }

        .panel-desc {
          font-size: 12px;
          color: var(--text-muted);
          margin: 4px 0 0 0;
        }

        .registry-add-form {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          background: var(--bg);
          padding: 16px;
          border-radius: 12px;
          border: 1px solid var(--border-light);
          margin-bottom: 20px;
        }

        .btn-add-staff {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 40px;
          padding: 0 16px;
          border-radius: 10px;
          background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%);
          color: white;
          border: none;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .btn-add-staff:hover {
          opacity: 0.94;
        }

        .registry-display-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        @media (max-width: 768px) {
          .registry-display-grid {
            grid-template-columns: 1fr;
          }
        }

        .registry-role-column {
          background: var(--bg);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 16px;
        }

        .role-col-title {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--text-secondary);
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 6px;
        }

        .registry-list-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 150px;
          overflow-y: auto;
        }

        .registry-staff-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12.5px;
        }

        .btn-remove-staff {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
        }

        .btn-remove-staff:hover {
          color: #ef4444;
        }

        .empty-text {
          font-size: 11.5px;
          color: var(--text-muted);
          font-style: italic;
        }

        /* ================= DASHBOARD STYLES ================= */
        .dashboard-root {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .dashboard-control-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 14px 20px;
          border-radius: 16px;
          box-shadow: var(--shadow-sm);
          flex-wrap: wrap;
          gap: 16px;
        }

        .dashboard-date-picker-block {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 700;
        }

        .range-exporter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .exporter-label {
          font-size: 12.5px;
          font-weight: 750;
          color: var(--text-secondary);
        }

        .btn-exporter-range {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #10b981;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-exporter-range:hover {
          background: #059669;
        }

        .dashboard-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        @media (max-width: 1024px) {
          .dashboard-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .dashboard-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .metric-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .card-bg-glow {
          position: absolute;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          right: -40px;
          bottom: -40px;
          opacity: 0.05;
          filter: blur(20px);
        }

        .metric-card.violet .card-bg-glow { background: #7c3aed; }
        .metric-card.blue .card-bg-glow { background: #3b82f6; }
        .metric-card.green .card-bg-glow { background: #10b981; }
        .metric-card.red .card-bg-glow { background: #ef4444; }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 750;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
        }

        .icon-badge {
          opacity: 0.6;
        }

        .metric-val {
          font-size: 28px;
          font-weight: 800;
          margin: 12px 0 6px 0;
          color: var(--text-primary);
        }

        .metric-val .subtext {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .metric-desc {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .dashboard-grid-split {
          display: grid;
          grid-template-columns: 1.8fr 1fr;
          gap: 24px;
        }

        @media (max-width: 900px) {
          .dashboard-grid-split {
            grid-template-columns: 1fr;
          }
        }

        .dashboard-table-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 24px;
          box-shadow: var(--shadow-sm);
        }

        .card-title-header {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 12px;
          margin-bottom: 16px;
        }

        .card-title-header h3 {
          margin: 0;
          font-size: 14.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .empty-dashboard-table, .empty-absentees-state {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .roster-table {
          width: 100%;
          border-collapse: collapse;
        }

        .roster-table th, .roster-table td {
          padding: 12px 14px;
          font-size: 13px;
          border-bottom: 1px solid var(--border-light);
          text-align: left;
        }

        .roster-table th {
          font-weight: 750;
          color: var(--text-secondary);
          background: var(--bg);
        }

        .dept-tag {
          font-weight: 800;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.08);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .masters-tag {
          font-weight: 750;
          color: #7c3aed;
          background: rgba(124, 58, 237, 0.08);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .btn-print-icon {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .btn-print-icon:hover {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.08);
        }

        .absentee-scroll-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 280px;
          overflow-y: auto;
        }

        .absentee-row-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg);
          border: 1px solid var(--border-light);
          padding: 10px 14px;
          border-radius: 10px;
        }

        .absentee-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .absentee-name {
          font-weight: 700;
          font-size: 13px;
          color: var(--text-primary);
        }

        .absentee-role-badge {
          font-size: 10px;
          font-weight: 700;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
          padding: 1px 6px;
          border-radius: 4px;
          align-self: flex-start;
          text-transform: uppercase;
        }

        .absentee-dept-tag {
          font-size: 11.5px;
          font-weight: 750;
          color: var(--text-secondary);
        }

        .employee-report-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn-download-employee-report {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
          color: white;
          border: none;
          padding: 10px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          margin-top: 14px;
          transition: opacity 0.2s;
        }

        .btn-download-employee-report:hover {
          opacity: 0.95;
        }

        /* CORE GRID LAYOUT */
        .attendance-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 28px;
        }

        @media (max-width: 1024px) {
          .attendance-layout {
            grid-template-columns: 1fr;
          }
        }

        .attendance-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 28px;
          box-shadow: var(--shadow-md);
          position: relative;
          overflow: hidden;
        }

        .card-top-decorator {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #7c3aed, #3b82f6);
          display: flex;
          align-items: center;
          padding-left: 28px;
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.8);
        }

        .section-title {
          font-size: 19px;
          font-weight: 800;
          margin: 0 0 24px 0;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 12px;
        }

        .entry-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-top: 10px;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .form-input {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 11px 15px;
          font-size: 13.5px;
          color: var(--text-primary);
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
        }

        .btn-text-cancel {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .group-box {
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.015);
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: var(--shadow-sm);
        }

        .group-box-header-clean {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px dashed var(--border-light);
          padding-bottom: 12px;
        }

        .step-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #7c3aed;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11.5px;
          font-weight: 800;
        }

        .group-box-title {
          font-size: 13.5px;
          font-weight: 800;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-add-item {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(124, 58, 237, 0.08);
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 800;
          color: #7c3aed;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-add-item:hover {
          background: #7c3aed;
          color: white;
        }

        .hod-input-grid {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .status-selector {
          display: flex;
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          background: var(--bg);
        }

        .status-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 10px 8px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }

        .status-btn.active.btn-success {
          background: #10b981;
          color: white;
        }

        .status-btn.active.btn-danger {
          background: #ef4444;
          color: white;
        }

        .status-btn.active.btn-warning {
          background: #f59e0b;
          color: white;
        }

        .counter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .counter-label {
          font-size: 13.5px;
          font-weight: 700;
        }

        .counter-control-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-counter {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text-primary);
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-counter:hover {
          border-color: #7c3aed;
          color: #7c3aed;
          background: rgba(124, 58, 237, 0.04);
        }

        .counter-input {
          width: 70px;
          height: 36px;
          text-align: center;
          font-weight: 800;
          font-size: 16px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
        }

        .dynamic-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .btn-delete-row {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .btn-delete-row:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
        }

        /* HELPER SECTION LAYOUT */
        .helper-allocation-card {
          border: 1px solid var(--border);
          background: var(--bg);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
        }

        .helper-allocation-card.secondary {
          margin-bottom: 0;
        }

        .allocation-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .allocation-title-tag {
          font-size: 12.5px;
          font-weight: 800;
          color: #3b82f6;
          border-left: 3px solid #3b82f6;
          padding-left: 8px;
        }

        .allocation-title-tag.green {
          color: #10b981;
          border-left-color: #10b981;
        }

        .btn-add-allocation {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #3b82f6;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 10.5px;
          font-weight: 750;
          cursor: pointer;
        }

        .btn-add-allocation:hover {
          background: #3b82f6;
          color: white;
        }

        .btn-add-allocation.green {
          border-color: rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .btn-add-allocation.green:hover {
          background: #10b981;
          color: white;
        }

        .btn-submit-attendance {
          background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-size: 14.5px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.25);
          transition: all 0.25s;
        }

        .btn-submit-attendance:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }

        /* HISTORY LAYOUT */
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 12px;
        }

        .history-header .section-title {
          border-bottom: none;
          padding-bottom: 0;
          margin-bottom: 0;
        }

        .search-bar {
          position: relative;
          width: 180px;
        }

        .search-icon-inside {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-input {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 7px 10px 7px 28px;
          font-size: 12.5px;
          width: 100%;
          color: var(--text-primary);
          outline: none;
        }

        .search-input:focus {
          border-color: #7c3aed;
        }

        .shift-summary-badge {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(124, 58, 237, 0.05);
          border: 1px solid rgba(124, 58, 237, 0.12);
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
        }

        .summary-badge-title-block {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
        }

        .summary-val {
          color: #7c3aed;
          font-weight: 800;
        }

        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 520px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .log-item {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg);
          overflow: hidden;
          transition: all 0.2s;
        }

        .log-item:hover {
          border-color: #3b82f6;
        }

        .log-item.selected {
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6;
        }

        .log-summary {
          display: flex;
          align-items: center;
          padding: 14px;
          cursor: pointer;
          gap: 12px;
          font-size: 13.5px;
        }

        .log-badge-dept {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          color: #2563eb;
          background: rgba(59, 130, 246, 0.08);
          padding: 4px 10px;
          border-radius: 8px;
        }

        .log-date {
          color: var(--text-muted);
          font-size: 12.5px;
        }

        .log-brief {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
        }

        .bold {
          font-weight: 700;
          color: var(--text-primary);
        }

        .status-pill {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .status-pill-present {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .status-pill-absent {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .status-pill-half {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .arrow-icon {
          color: var(--text-muted);
          transition: transform 0.2s;
        }

        .arrow-icon.rotate {
          transform: rotate(180deg);
        }

        /* DETAIL PANEL */
        .log-detail-pane {
          background: var(--surface);
          border-top: 1px solid var(--border-light);
          padding: 18px;
          animation: expandDetail 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes expandDetail {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 600px; }
        }

        .log-detail-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          font-size: 12.5px;
          font-weight: 800;
          color: var(--text-secondary);
        }

        .btn-print-report {
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
        }

        .btn-print-report:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .detail-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-card {
          background: var(--bg);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          padding: 12px 14px;
        }

        .detail-card-label {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 8px;
        }

        .person-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 13px;
        }

        .person-row.border-top {
          border-top: 1px solid var(--border-light);
        }

        .person-name {
          font-weight: 700;
          color: var(--text-primary);
        }

        .mini-subtext {
          font-size: 11.5px;
          color: var(--text-muted);
        }

        .masters-count-badge {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          font-weight: 800;
          font-size: 13px;
          padding: 4px 12px;
          border-radius: 8px;
        }

        .no-people {
          color: var(--text-muted);
          font-size: 12.5px;
          font-style: italic;
        }

        .detail-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .btn-danger-action {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .btn-danger-action:hover {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }

        /* INFO CARD */
        .theoretical-info-card {
          background: rgba(59, 130, 246, 0.03);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 14px;
          padding: 16px;
          margin-top: 24px;
        }

        .info-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #3b82f6;
          margin-bottom: 8px;
        }

        .info-card-header h4 {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-card-body {
          font-size: 12px;
          line-height: 1.6;
          margin: 0;
          color: var(--text-secondary);
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(124, 58, 237, 0.2);
          border-radius: 50%;
          border-top-color: #7c3aed;
          animation: spin 0.8s linear infinite;
          vertical-align: middle;
          margin-right: 6px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
