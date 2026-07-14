import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Eye, Download, ChevronLeft, ChevronRight,
  RefreshCw, Layers, Calendar, Filter, X, CheckCircle,
  AlertTriangle, Tag, Users, Package, SlidersHorizontal,
  FolderHeart, UserCheck, Scissors, FileText, Star
} from 'lucide-react';
import { store, BASE_URL } from '../store.js';
import * as XLSX from "xlsx-js-style";

/** ====== CONFIG FOR CUTTING SHEET ====== */
const JOB_SHEET_ID = "1fKSwGBIpzWEFk566WRQ4bzQ0anJlmasoY8TwrTLQHXI";
const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const JOB_RANGE = "JobOrder!A:AL";
const BUDGET_SHEET_ID = "1Hj3JeJEKB43aYYWv8gk2UhdU6BWuEQfCg5pBlTdBMNA";
const CUTTING_SHEET_NAME = "Cutting";
const INDEX_SHEET_NAME = "Index";
const INDEX_RANGE = `${INDEX_SHEET_NAME}!A:K`;
const CUTTING_BIG_RANGE = `${CUTTING_SHEET_NAME}!A1:ZZ300000`;

const TRACKING_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzV1WU0QyYN1brvsX1GNttlehah1eQMsgpnBshjRXpf7GxW2KfFJyYNqPGJiclE0NRX/exec";
const TRACKING_SHEET_ID = "1jTju43L6-M1_f-zl67IMsI-sj7RMiLXOXN6z0vzSyck";
const TRACKING_TAB_NAME = "PDF_Log";

const logPdfGeneration = async (row, pdfType, status = "Generated", notes = "") => {
  try {
    const jobOrderNo = row?.["Job Order No"] || "";
    const lotNumber = row?.["Lot Number"] || row?.["Lot No"] || "";
    const generatedBy = "JobOrders Component";
    const fileName = `JobOrder_${jobOrderNo}_${new Date().toISOString().slice(0, 10)}.pdf`;

    let ipAddress = "";
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      ipAddress = ipData.ip;
    } catch (e) {
      console.log("Could not fetch IP:", e);
    }

    const sessionId = Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    const trackingData = {
      trackingSheetId: TRACKING_SHEET_ID,
      tabName: TRACKING_TAB_NAME,
      jobOrderNo: jobOrderNo,
      lotNumber: lotNumber,
      generatedBy: generatedBy,
      fileName: fileName,
      ipAddress: ipAddress,
      sessionId: sessionId,
      status: status,
      pdfType: pdfType,
      notes: notes,
      updateMainSheet: true,
      mainSheetId: JOB_SHEET_ID,
      mainTabName: "JobOrder"
    };

    await fetch(TRACKING_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trackingData)
    });

    console.log(`PDF generation logged for ${pdfType}: ${jobOrderNo}`);
  } catch (error) {
    console.error("Failed to log PDF generation:", error);
  }
};

async function loadJsPDF() {
  const mod = await import("jspdf");
  return mod.jsPDF || mod.default;
}

const pause = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function tryParseDateToISO(s) {
  if (!s) return "";
  const d1 = new Date(s);
  if (!isNaN(d1)) return d1.toISOString();
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]), mm = Number(m[2]),
      yyyy = Number(m[3] < 100 ? 2000 + Number(m[3]) : m[3]);
    const d2 = new Date(yyyy, mm - 1, dd);
    if (!isNaN(d2)) return d2.toISOString();
  }
  return "";
}

function extractDriveFileId(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/file\/d\/([^/]+)/) || u.search.match(/[?&]id=([^&]+)/);
    return m ? m[1] : "";
  } catch { return ""; }
}

function driveUcUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

async function loadImageAsBase64ForPdf(url, opts = {}) {
  return new Promise((resolve) => {
    try {
      const fileId = extractDriveFileId(url);
      const direct = fileId ? driveUcUrl(fileId) : (url || "").toString().trim();
      if (!direct) return resolve("");

      const clean = direct.replace(/^https?:\/\//, "");
      const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(clean)}`;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const maxW = opts.maxWidth || 880;
          const maxH = opts.maxHeight || 880;
          let { width, height } = img;

          if (width > maxW || height > maxH) {
            const r = Math.min(maxW / width, maxH / height);
            width = Math.max(1, Math.floor(width * r));
            height = Math.max(1, Math.floor(height * r));
          }

          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve("");
              const fr = new FileReader();
              fr.onloadend = () => resolve(fr.result || "");
              fr.readAsDataURL(blob);
            },
            "image/jpeg",
            0.65
          );
        } catch { resolve(""); }
      };
      img.onerror = () => resolve("");
      img.src = proxied;
    } catch { resolve(""); }
  });
}

function parseShades(value) {
  return String(value || "")
    .split(/[,\/&+]|(?:\s{2,})/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const OUTPUT_COLS = [
  "Job Order No",
  "Date",
  "Fabric",
  "Brand",
  "Style",
  "Party Name",
  "Garment Type",
  "Section",
  "Season",
  "Priority",
  "Direct Stitching",
  "Lot No",
  "Days after PO issue",
  "Total Qty",
  "Pending Shade",
  "Cutting Date",
  "Cutting Table",
  "Remarks",
];

const HEADER_ALIAS_TO_CANON = {
  joborderno: "Job Order No",
  "joborder no": "Job Order No",
  "job order no": "Job Order No",
  jobordeerno: "Job Order No",
  orderno: "Job Order No",
  "jo no": "Job Order No",
  fabric: "Fabric",
  brand: "Brand",
  style: "Style",
  partyname: "Party Name",
  party: "Party Name",
  garmenttype: "Garment Type",
  garment: "Garment Type",
  section: "Section",
  season: "Season",
  directstitching: "Direct Stitching",
  "direct stitching": "Direct Stitching",
  lotno: "Lot No",
  lotnumber: "Lot No",
  "lot number": "Lot No",
  date: "Date",
  status: "Status",
  priority: "Priority",
};

/** ====== CUTTING SYSTEM UTILS ====== */
const norm = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
function normalizeKey(s = "") {
  return norm(s);
}

function formatDateYMDToDDMMMYYYY(dateStr) {
  if (!dateStr) return "";

  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts.map(p => parseInt(p, 10));
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = monthNames[month - 1] || "";
      return `${day} ${monthName} ${year}`;
    }
  }
  return dateStr;
}

function formatSavedAtToYMD(savedAt) {
  if (!savedAt) return "";
  const d = new Date(savedAt);
  if (isNaN(d.getTime())) return "";

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const monthName = monthNames[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${monthName} ${year}`;
}

function daysAfter(dateStr) {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  if (!y || !m || !d) return "";
  const start = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const diff = Math.floor((today - start) / MS_PER_DAY);
  return Number.isFinite(diff) ? String(diff) : "";
}

function convertValuesToObjects(values) {
  if (!values || values.length === 0) return [];
  const rawHeaders = values[0];

  const canonAtIndex = rawHeaders.map((h) => HEADER_ALIAS_TO_CANON[normalizeKey(h)] || null);
  const canonToIndex = {};
  canonAtIndex.forEach((canon, idx) => {
    if (canon && !(canon in canonToIndex)) canonToIndex[canon] = idx;
  });

  return values.slice(1).map((row) => {
    const obj = {};
    [
      "Job Order No",
      "Date",
      "Fabric",
      "Brand",
      "Style",
      "Party Name",
      "Garment Type",
      "Section",
      "Season",
      "Direct Stitching",
      "Lot No",
      "Status",
      "Priority",
    ].forEach((canonHeader) => {
      const idx = canonToIndex[canonHeader];
      let value = idx != null ? (row[idx] ?? "") : "";

      if (canonHeader === "Date" && value) {
        value = formatDateYMDToDDMMMYYYY(value);
      }

      obj[canonHeader] = value;
    });

    if (canonToIndex["Date"] != null) {
      const originalDate = row[canonToIndex["Date"]] ?? "";
      obj["PO Date"] = originalDate;
    } else {
      obj["PO Date"] = "";
    }

    obj["Days after PO issue"] = "";
    obj["Total Qty"] = 0;
    obj["Pending Shade"] = "";
    obj["Remarks"] = "";
    obj["Cutting Date"] = "";
    obj["Cutting Table"] = "";
    return obj;
  });
}

function parseDateString(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split(" ");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames.indexOf(parts[1]);
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== -1 && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return null;
}

const PDF_THEME = {
  brandName: "Cutting Report",
  primary: [24, 90, 188],
  muted: [90, 107, 130],
  border: [0, 0, 0],
  zebra: [248, 250, 253],
  badgeDoneBG: [227, 253, 240],
  badgeDoneText: [10, 94, 62],
  badgePendingBG: [255, 245, 233],
  badgePendingText: [120, 70, 0],
  badgeIssueBG: [255, 233, 233],
  badgeIssueText: [144, 0, 0],
};

function fmtNum(n) {
  if (n == null || n === "") return "";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString("en-IN");
}

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

// Multi-select dropdown component
const MultiSelectDropdown = ({ options, selectedValues, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="multi-select-dropdown" ref={dropdownRef}>
      <div
        className={`multi-select-trigger ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="multi-select-values">
          {selectedValues.length === 0 ? (
            <span className="placeholder">{placeholder}</span>
          ) : (
            <span className="selected-count">{selectedValues.length} selected</span>
          )}
        </div>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && !disabled && (
        <div className="multi-select-options">
          <div className="multi-select-actions">
            <button type="button" onClick={clearAll} className="clear-all-btn">Clear All</button>
          </div>
          {options.map(option => (
            <label key={option} className="multi-select-option">
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                onChange={() => toggleOption(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default function JobOrder() {
  const navigate = useNavigate();
  const abortRef = useRef(null);

  // Active Tab: 'master' list or 'cutting' pending report
  const [activeTab, setActiveTab] = useState('master');

  // Master State
  const [jobOrders, setJobOrders] = useState([]);
  const [issuedLots, setIssuedLots] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pdfBusyId, setPdfBusyId] = useState(null);

  // Calculate lot frequency counts for highlighting repeated lots
  const lotCounts = useMemo(() => {
    const counts = new Map();
    jobOrders.forEach((jo) => {
      const lot = String(jo['Lot Number'] || jo['Lot No'] || '').trim();
      if (lot) {
        counts.set(lot, (counts.get(lot) || 0) + 1);
      }
    });
    return counts;
  }, [jobOrders]);

  // Collapsible Filters Panel (Master List)
  const [showFilters, setShowFilters] = useState(false);

  // Filter States (Master List)
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [selectedFabric, setSelectedFabric] = useState('All');
  const [selectedParty, setSelectedParty] = useState('All');
  const [selectedGarment, setSelectedGarment] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedSubmittedBy, setSelectedSubmittedBy] = useState('All');
  const [onlyUncut, setOnlyUncut] = useState(true);
  const [cuttingStatusFilter, setCuttingStatusFilter] = useState('All');

  // Get logged-in user context
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('twms_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // Detail Modal Drawer (Master list)
  const [activeJobOrder, setActiveJobOrder] = useState(null);

  // ==========================================
  // CUTTING SHEET PENDING LOTS STATE & LOGIC
  // ==========================================
  const [cuttingRows, setCuttingRows] = useState([]);
  const [cuttingLoading, setCuttingLoading] = useState(false);
  const [pendingListByLot, setPendingListByLot] = useState({});
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [lotFilter, setLotFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [garmentFilter, setGarmentFilter] = useState([]);
  const [seasonFilter, setSeasonFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRemarks, setSelectedRemarks] = useState(new Set());

  const [cuttingPage, setCuttingPage] = useState(1);
  const [cuttingLimit, setCuttingLimit] = useState(25);
  const [cuttingSearch, setCuttingSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLot, setDialogLot] = useState("");
  const [dialogShades, setDialogShades] = useState([]);

  // Fetch Master Job Orders
  const fetchJobOrders = async () => {
    try {
      setLoading(true);
      const data = await store.getJobOrders();
      setJobOrders(data || []);

      // Fetch issued lots from database to detect "issued but not cut" status
      try {
        const res = await store.getIssuedLots();
        if (res && res.success && res.lotNumbers) {
          setIssuedLots(new Set(res.lotNumbers));
        }
      } catch (err) {
        console.error('Failed to load issued lot numbers:', err);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load job orders: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch and Process Cutting Data from Backend
  const loadCuttingData = async (mode = "initial") => {
    try {
      setCuttingLoading(true);
      setErr("");

      const isRefresh = mode === "refresh";
      const res = await store.getPendingCuttingLots(isRefresh);
      if (res.success) {
        let rows = res.rows || [];

        // Respect logged-in supervisor filter unless Admin
        const userName = currentUser?.name || '';
        const userRole = currentUser?.role || '';
        if (userRole.trim().toLowerCase() !== 'admin') {
          rows = rows.filter(r => {
            const supervisor = String(r['FABRIC_SUPERVISOR'] || '').trim().toLowerCase();
            return supervisor === userName.trim().toLowerCase();
          });
        }

        setCuttingRows(rows);
        setPendingListByLot(res.pendingListByLot || {});
        setLastUpdated(res.lastUpdated || new Date().toLocaleString());
      } else {
        setErr("Failed to load cutting data");
      }
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to load cutting data");
    } finally {
      setCuttingLoading(false);
    }
  };

  const openPendingDialog = (lot) => {
    setDialogLot(lot);
    setDialogShades(pendingListByLot[lot] || []);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogLot("");
    setDialogShades([]);
  };

  // Run on mount
  useEffect(() => {
    fetchJobOrders();
    loadCuttingData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Fetch cutting data when tab changes to cutting
  useEffect(() => {
    if (activeTab === 'cutting') {
      loadCuttingData();
    }
  }, [activeTab]);

  // ==========================================
  // MASTER TAB MEMOS & FILTERING
  // ==========================================
  const supervisorFilteredJobOrders = useMemo(() => {
    const userName = currentUser?.name || '';
    const userRole = currentUser?.role || '';

    if (userRole.trim().toLowerCase() === 'admin') {
      return jobOrders;
    }

    return jobOrders.filter(jo => {
      const supervisor = String(jo['FABRIC_SUPERVISOR'] || '').trim().toLowerCase();
      return supervisor === userName.trim().toLowerCase();
    });
  }, [jobOrders, currentUser]);

  const brands = useMemo(() => {
    return ['All', ...new Set(supervisorFilteredJobOrders.map(jo => jo['Brand']).filter(Boolean))].sort();
  }, [supervisorFilteredJobOrders]);

  const statuses = useMemo(() => {
    return ['All', ...new Set(supervisorFilteredJobOrders.map(jo => jo['Status']).filter(Boolean))].sort();
  }, [supervisorFilteredJobOrders]);

  const seasons = useMemo(() => {
    return ['All', ...new Set(supervisorFilteredJobOrders.map(jo => jo['Season']).filter(Boolean))].sort();
  }, [supervisorFilteredJobOrders]);

  const fabrics = useMemo(() => {
    return ['All', ...new Set(supervisorFilteredJobOrders.map(jo => jo['Fabric']).filter(Boolean))].sort();
  }, [supervisorFilteredJobOrders]);

  const parties = useMemo(() => {
    return ['All', ...new Set(supervisorFilteredJobOrders.map(jo => jo['Party Name']).filter(Boolean))].sort();
  }, [supervisorFilteredJobOrders]);

  const garments = useMemo(() => {
    return ['All', ...new Set(supervisorFilteredJobOrders.map(jo => jo['Garment Type']).filter(Boolean))].sort();
  }, [supervisorFilteredJobOrders]);

  const sections = useMemo(() => {
    return ['All', ...new Set(supervisorFilteredJobOrders.map(jo => jo['Section']).filter(Boolean))].sort();
  }, [supervisorFilteredJobOrders]);

  const submittedBys = useMemo(() => {
    return ['All', ...new Set(supervisorFilteredJobOrders.map(jo => jo['Submitted By']).filter(Boolean))].sort();
  }, [supervisorFilteredJobOrders]);

  const cuttingMapByLot = useMemo(() => {
    const map = new Map();
    cuttingRows.forEach((r) => {
      const lot = String(r["Lot No"] || "").trim();
      if (lot) map.set(lot, r);
    });
    return map;
  }, [cuttingRows]);

  const getCuttingStatusText = (lotNum, detailed = false) => {
    if (!lotNum) return 'Fabric Issue Pending';

    const cutInfo = cuttingMapByLot.get(lotNum);
    const isIssued = issuedLots.has(lotNum);

    if (cutInfo && cutInfo.Remarks.includes('Cutting Done')) {
      return 'Cutting Done';
    }

    if (isIssued) {
      return 'Fabric Issued but not cut';
    }

    if (cutInfo) {
      if (cutInfo.Remarks.includes('Colour Pending')) {
        if (detailed) {
          const pendingShades = (pendingListByLot[lotNum] || []).join(', ');
          return pendingShades ? `Colour Pending (${pendingShades})` : 'Colour Pending';
        }
        return 'Colour Pending';
      }
      if (cutInfo.Remarks.includes('Fabric Issue Pending')) return 'Fabric Issue Pending';
      return cutInfo.Remarks || 'Fabric Issue Pending';
    }

    return 'Fabric Issue Pending';
  };

  const formatToYYYYMMDD = (val) => {
    if (!val || val === '—') return '—';
    try {
      const dateStr = String(val).trim();
      if (!dateStr) return '—';

      // Handle ISO timestamp or YYYY-MM-DD
      const datePart = dateStr.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        if (!isNaN(year) && monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
          return `${day} ${monthNames[monthIdx]} ${year}`;
        }
      }

      // General fallback parsing
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const month = monthNames[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      }
      return dateStr;
    } catch {
      return val;
    }
  };

  const stats = useMemo(() => {
    const total = supervisorFilteredJobOrders.length;

    let fabricIssuePending = 0;
    let colourPending = 0;
    let cuttingDone = 0;
    let fabricIssuedButNotCut = 0;

    supervisorFilteredJobOrders.forEach(jo => {
      const lotNum = String(jo['Lot Number'] || '').trim();
      const statusText = getCuttingStatusText(lotNum);

      if (statusText === 'Fabric Issue Pending') {
        fabricIssuePending++;
      } else if (statusText === 'Fabric Issued but not cut') {
        fabricIssuedButNotCut++;
      } else if (statusText === 'Colour Pending') {
        colourPending++;
      } else if (statusText === 'Cutting Done') {
        cuttingDone++;
      }
    });

    return { total, fabricIssuePending, colourPending, cuttingDone, fabricIssuedButNotCut };
  }, [supervisorFilteredJobOrders, cuttingMapByLot, issuedLots]);

  const filtered = useMemo(() => {
    return supervisorFilteredJobOrders.filter(jo => {
      const q = search.toLowerCase();
      const matchQ = !q ||
        (jo['Job Order No'] || '').toLowerCase().includes(q) ||
        (jo['Lot Number'] || '').toLowerCase().includes(q) ||
        (jo['Fabric'] || '').toLowerCase().includes(q) ||
        (jo['Brand'] || '').toLowerCase().includes(q) ||
        (jo['Party Name'] || '').toLowerCase().includes(q) ||
        (jo['Garment Type'] || '').toLowerCase().includes(q) ||
        (jo['Style'] || '').toLowerCase().includes(q);

      const matchBrand = selectedBrand === 'All' || jo['Brand'] === selectedBrand;
      const matchStatus = selectedStatus === 'All' || jo['Status'] === selectedStatus;
      const matchSeason = selectedSeason === 'All' || jo['Season'] === selectedSeason;
      const matchFabric = selectedFabric === 'All' || jo['Fabric'] === selectedFabric;
      const matchParty = selectedParty === 'All' || jo['Party Name'] === selectedParty;
      const matchGarment = selectedGarment === 'All' || jo['Garment Type'] === selectedGarment;
      const matchSection = selectedSection === 'All' || jo['Section'] === selectedSection;
      const matchSubmittedBy = selectedSubmittedBy === 'All' || jo['Submitted By'] === selectedSubmittedBy;

      // Apply KPI card status filter if active; otherwise fall back to onlyUncut checkbox filter
      if (cuttingStatusFilter !== 'All') {
        const lotNum = String(jo['Lot Number'] || '').trim();
        const statusText = getCuttingStatusText(lotNum);
        if (statusText !== cuttingStatusFilter) return false;
      } else if (onlyUncut) {
        const lotNum = String(jo['Lot Number'] || '').trim();
        if (lotNum) {
          const cutInfo = cuttingMapByLot.get(lotNum);
          if (cutInfo && cutInfo.inIndexSheet === true) {
            return false;
          }
        }
      }

      return matchQ && matchBrand && matchStatus && matchSeason && matchFabric && matchParty && matchGarment && matchSection && matchSubmittedBy;
    });
  }, [supervisorFilteredJobOrders, search, selectedBrand, selectedStatus, selectedSeason, selectedFabric, selectedParty, selectedGarment, selectedSection, selectedSubmittedBy, onlyUncut, cuttingMapByLot, cuttingStatusFilter, issuedLots]);

  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  const totalPages = Math.ceil(filtered.length / limit) || 1;

  useEffect(() => {
    setPage(1);
  }, [search, selectedBrand, selectedStatus, selectedSeason, selectedFabric, selectedParty, selectedGarment, selectedSection, selectedSubmittedBy]);

  // ==========================================
  // CUTTING TAB MEMOS & FILTERING
  // ==========================================
  const splitRemarks = (raw) =>
    String(raw || "")
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);

  const distinctParties = useMemo(() => {
    const set = new Set();
    cuttingRows.forEach((r) => {
      const party = String(r["Party Name"] || "").trim();
      if (party) set.add(party);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cuttingRows]);

  const distinctSections = useMemo(() => {
    const set = new Set();
    cuttingRows.forEach((r) => {
      const section = String(r["Section"] || "").trim();
      if (section) set.add(section);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cuttingRows]);

  const distinctBrands = useMemo(() => {
    const set = new Set();
    cuttingRows.forEach((r) => {
      const brand = String(r["Brand"] || "").trim();
      if (brand) set.add(brand);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cuttingRows]);

  const distinctGarments = useMemo(() => {
    const set = new Set();
    cuttingRows.forEach((r) => {
      const garment = String(r["Garment Type"] || "").trim();
      if (garment) set.add(garment);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cuttingRows]);

  const distinctSeasons = useMemo(() => {
    const set = new Set();
    cuttingRows.forEach((r) => {
      const season = String(r["Season"] || "").trim();
      if (season) set.add(season);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cuttingRows]);

  const distinctPriorities = useMemo(() => {
    const set = new Set();
    cuttingRows.forEach((r) => {
      const priority = String(r["Priority"] || "").trim();
      if (priority) set.add(priority);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cuttingRows]);

  const distinctRemarks = useMemo(() => {
    const set = new Set();
    cuttingRows.forEach((r) => splitRemarks(r.Remarks).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cuttingRows]);

  const toggleRemark = (label) => {
    setSelectedRemarks((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const clearRemarks = () => setSelectedRemarks(new Set());

  const clearAllFilters = () => {
    setLotFilter("");
    setPartyFilter("");
    setGarmentFilter([]);
    setSeasonFilter("");
    setSectionFilter("");
    setBrandFilter([]);
    setPriorityFilter("");
    setStartDate("");
    setEndDate("");
    setCuttingSearch("");
    clearRemarks();
  };

  const cFiltered = useMemo(() => {
    const lotQ = lotFilter.trim().toLowerCase();
    const partyQ = partyFilter.trim().toLowerCase();
    const garmentQ = garmentFilter.map(g => g.toLowerCase());
    const seasonQ = seasonFilter.trim().toLowerCase();
    const sectionQ = sectionFilter.trim().toLowerCase();
    const brandQ = brandFilter.map(b => b.toLowerCase());
    const priorityQ = priorityFilter.trim().toLowerCase();
    const selected = selectedRemarks;
    const searchQ = cuttingSearch.trim().toLowerCase();

    return cuttingRows.filter((r) => {
      // Exclude cut lots if onlyUncut filter is enabled (i.e. if the lot is present in the Index sheet)
      if (onlyUncut && r.inIndexSheet === true) {
        return false;
      }

      if (searchQ) {
        const lot = String(r["Lot No"] || "").toLowerCase();
        const jobNo = String(r["Job Order No"] || "").toLowerCase();
        const brand = String(r["Brand"] || "").toLowerCase();
        const fabric = String(r["Fabric"] || "").toLowerCase();
        const style = String(r["Style"] || "").toLowerCase();
        const party = String(r["Party Name"] || "").toLowerCase();
        const garment = String(r["Garment Type"] || "").toLowerCase();

        const matchesSearch = lot.includes(searchQ) ||
          jobNo.includes(searchQ) ||
          brand.includes(searchQ) ||
          fabric.includes(searchQ) ||
          style.includes(searchQ) ||
          party.includes(searchQ) ||
          garment.includes(searchQ);

        if (!matchesSearch) return false;
      }

      if (lotQ) {
        const lot = String(r["Lot No"] || "").toLowerCase();
        if (!lot.includes(lotQ)) return false;
      }
      if (partyQ) {
        const party = String(r["Party Name"] || "").toLowerCase();
        if (!party.includes(partyQ)) return false;
      }
      if (garmentQ.length > 0) {
        const garment = String(r["Garment Type"] || "").toLowerCase();
        if (!garmentQ.includes(garment)) return false;
      }
      if (seasonQ) {
        const season = String(r["Season"] || "").toLowerCase();
        if (!season.includes(seasonQ)) return false;
      }
      if (sectionQ) {
        const section = String(r["Section"] || "").toLowerCase();
        if (!section.includes(sectionQ)) return false;
      }
      if (brandQ.length > 0) {
        const brand = String(r["Brand"] || "").toLowerCase();
        if (!brandQ.includes(brand)) return false;
      }
      if (priorityQ) {
        const priority = String(r["Priority"] || "").toLowerCase();
        if (!priority.includes(priorityQ)) return false;
      }

      // Date range filter
      if (startDate || endDate) {
        const dateValue = r["Date"];
        const parsedDate = parseDateString(dateValue);

        if (parsedDate) {
          if (startDate) {
            const start = new Date(startDate);
            if (parsedDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            if (parsedDate > end) return false;
          }
        } else if (dateValue) {
          const yearMatch = dateValue.match(/\d{4}/);
          if (yearMatch) {
            const year = parseInt(yearMatch[0]);
            if (startDate && new Date(startDate).getFullYear() > year) return false;
            if (endDate && new Date(endDate).getFullYear() < year) return false;
          }
        }
      }

      if (selected.size > 0) {
        const tokens = splitRemarks(r.Remarks);
        const tokenSet = new Set(tokens);
        let matchesAny = false;
        for (const sel of selected) {
          if (tokenSet.has(sel)) {
            matchesAny = true;
            break;
          }
        }
        if (!matchesAny) return false;
      }

      return true;
    });
  }, [
    cuttingRows,
    lotFilter,
    partyFilter,
    garmentFilter,
    seasonFilter,
    sectionFilter,
    brandFilter,
    priorityFilter,
    selectedRemarks,
    startDate,
    endDate,
    cuttingSearch,
    onlyUncut
  ]);

  const cPaginated = useMemo(() => {
    const start = (cuttingPage - 1) * cuttingLimit;
    return cFiltered.slice(start, start + cuttingLimit);
  }, [cFiltered, cuttingPage, cuttingLimit]);

  const cTotalPages = Math.ceil(cFiltered.length / cuttingLimit) || 1;

  useEffect(() => {
    setCuttingPage(1);
  }, [
    lotFilter, partyFilter, garmentFilter, seasonFilter, sectionFilter,
    brandFilter, priorityFilter, selectedRemarks, startDate, endDate, cuttingSearch
  ]);

  // Dynamic Google Drive embed utility
  const getEmbeddableUrl = (url) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      if (url.includes('id=')) {
        const match = url.match(/id=([^&]+)/);
        if (match && match[1]) {
          return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
      }
      if (url.includes('/file/d/')) {
        const parts = url.split('/file/d/');
        if (parts[1]) {
          const id = parts[1].split('/')[0];
          return `https://drive.google.com/file/d/${id}/preview`;
        }
      }
    }
    return url;
  };

  // Master List Export CSV
  const handleExport = () => {
    if (filtered.length === 0) {
      alert('No data to export.');
      return;
    }
    try {
      const headers = [
        'Job Order No', 'Date', 'Fabric', 'Brand', 'Lot Number',
        'Shade', 'Size', 'Quantity', 'Unit', 'Party Name',
        'Garment Type', 'Section', 'Season', 'Status'
      ];
      const rows = filtered.map(jo => [
        jo['Job Order No'], jo['Date'], jo['Fabric'], jo['Brand'], jo['Lot Number'],
        jo['Shade'], jo['Size'], jo['Quantity'], jo['Unit'], jo['Party Name'],
        jo['Garment Type'], jo['Section'], jo['Season'], jo['Status']
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `job_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const exportMasterToPdf = async () => {
    try {
      const jsPDF = await loadJsPDF();
      const doc = new jsPDF('l', 'pt', 'a4');
      const totalPagesEstimate = Math.ceil(filtered.length / 22) || 1;

      // Column definitions
      const columns = [
        { header: 'JO No', width: 60, align: 'center', key: 'Job Order No' },
        { header: 'Date', width: 55, align: 'center', key: 'Date' },
        { header: 'Lot NO.', width: 45, align: 'center', key: 'Lot Number' },
        { header: 'Fabric', width: 75, align: 'center', key: 'Fabric' },
        { header: 'Garment Type', width: 65, align: 'center', key: 'Garment Type' },
        { header: 'Brand', width: 55, align: 'center', key: 'Brand' },
        { header: 'Style', width: 75, align: 'center', key: 'Style' },
        { header: 'Priority', width: 40, align: 'center', key: 'Priority' },
        { header: 'Total pcs', width: 45, align: 'center', key: 'Quantity' },
        { header: 'Issued Date', width: 65, align: 'center', key: 'fabricIssuedDate' },
        { header: 'Cut Date', width: 65, align: 'center', key: 'cuttingDate' },
        { header: 'Days', width: 45, align: 'center', key: 'Days' },
        { header: 'Status', width: 92, align: 'center', key: 'Status' }
      ];

      const startX = 30;
      const startYInitial = 80;
      const tableWidth = 782;
      const pageHeight = 595;

      const drawHeader = (doc, pageNum) => {
        // Tally style outer border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.rect(startX, 30, tableWidth, pageHeight - 60);

        // Header Title
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('CUTTING REPORT', startX + 10, 48);

        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.text('CUTTING Master Report', startX + 10, 62);

        const dateStr = `Printed: ${new Date().toLocaleString()}`;
        doc.text(dateStr, startX + tableWidth - 10 - doc.getTextWidth(dateStr), 62);

        // Double lines below report info
        doc.setLineWidth(0.5);
        doc.line(startX, 70, startX + tableWidth, 70);
        doc.line(startX, 72, startX + tableWidth, 72);

        // Table Header
        let currentX = startX;
        doc.setFont('times', 'bold');
        doc.setFontSize(8.5);

        // Draw Header text
        columns.forEach(col => {
          let alignX = currentX + 5;
          if (col.align === 'right') {
            alignX = currentX + col.width - 5 - doc.getTextWidth(col.header);
          } else if (col.align === 'center') {
            alignX = currentX + (col.width - doc.getTextWidth(col.header)) / 2;
          }
          doc.text(col.header, alignX, 86);
          currentX += col.width;
        });

        // Double lines below table header
        doc.line(startX, 94, startX + tableWidth, 94);
        doc.line(startX, 96, startX + tableWidth, 96);

        // Draw vertical lines in header
        let lineX = startX;
        columns.forEach(col => {
          lineX += col.width;
          if (lineX < startX + tableWidth) {
            doc.line(lineX, 72, lineX, 96);
          }
        });

        // Footer Page Number
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        const pageText = `Page ${pageNum} of ${totalPagesEstimate}`;
        doc.text(pageText, startX + tableWidth / 2 - doc.getTextWidth(pageText) / 2, pageHeight - 42);
      };

      let pageNum = 1;
      drawHeader(doc, pageNum);

      let currentY = 96; // Start exactly below table header double lines
      let totalPcsSum = 0;

      filtered.forEach((jo, index) => {
        const lotNum = String(jo['Lot Number'] || '').trim();
        const cutInfo = cuttingMapByLot.get(lotNum);
        const qtyVal = cutInfo ? parseFloat(cutInfo['Total Qty']) || 0 : 0;

        // Pre-calculate line splitting and maxRowLines for this row
        const colLines = {};
        let maxRowLines = 1;

        columns.forEach(col => {
          let val = '';
          if (col.key === 'Quantity') {
            val = qtyVal > 0 ? qtyVal.toLocaleString() : '0';
          } else if (col.key === 'Status') {
            val = getCuttingStatusText(lotNum, true);
          } else if (col.key === 'fabricIssuedDate') {
            val = formatToYYYYMMDD(jo['fabricIssuedDate']);
          } else if (col.key === 'cuttingDate') {
            val = cutInfo ? formatToYYYYMMDD(cutInfo['Cutting Date']) : '—';
          } else if (col.key === 'Days') {
            const issuedRaw = jo['fabricIssuedDate'];
            const cutRaw = cutInfo ? cutInfo['Cutting Date'] : null;
            if (issuedRaw && cutRaw) {
              const issued = new Date(issuedRaw);
              const cut = new Date(cutRaw);
              if (!isNaN(issued.getTime()) && !isNaN(cut.getTime())) {
                const diffTime = cut.getTime() - issued.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                val = diffDays >= 0 ? `${diffDays}` : '—';
              } else {
                val = '—';
              }
            } else {
              val = '—';
            }
          } else {
            val = String(jo[col.key] || '—');
          }

          // Split text into lines matching column width
          const lines = doc.splitTextToSize(val, col.width - 10);
          colLines[col.key] = lines;
          maxRowLines = Math.max(maxRowLines, lines.length);
        });

        // Dynamic row height based on max wrapped lines
        const calculatedRowHeight = maxRowLines * 10 + 10;

        // If we exceed printable height, draw bottom border, add page and reset
        if (currentY + calculatedRowHeight > 520) {
          doc.setLineWidth(1);
          doc.setDrawColor(0, 0, 0);
          doc.line(startX, currentY, startX + tableWidth, currentY);

          doc.addPage();
          pageNum++;
          drawHeader(doc, pageNum);
          currentY = 96;
        }

        // Add quantity to sum
        totalPcsSum += qtyVal;

        // Draw Cell values and vertical borders
        let colX = startX;
        doc.setFont('times', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);

        columns.forEach(col => {
          const lines = colLines[col.key];

          lines.forEach((lineText, lineIdx) => {
            let alignX = colX + 5;
            if (col.align === 'right') {
              alignX = colX + col.width - 5 - doc.getTextWidth(lineText);
            } else if (col.align === 'center') {
              alignX = colX + (col.width - doc.getTextWidth(lineText)) / 2;
            }
            doc.text(lineText, alignX, currentY + 12 + lineIdx * 10);
          });

          // Draw vertical border for cell
          doc.setLineWidth(0.5);
          doc.setDrawColor(0, 0, 0);
          doc.line(colX, currentY, colX, currentY + calculatedRowHeight);

          colX += col.width;
        });

        // Draw last vertical border on the right
        doc.line(startX + tableWidth, currentY, startX + tableWidth, currentY + calculatedRowHeight);

        // Update Y position
        currentY += calculatedRowHeight;

        // Draw horizontal grid line below the row
        doc.setLineWidth(0.5);
        doc.setDrawColor(180, 180, 180);
        doc.line(startX, currentY, startX + tableWidth, currentY);
      });

      // Draw horizontal line at the end of data to close the table (thick boundary)
      doc.setLineWidth(1);
      doc.setDrawColor(0, 0, 0);
      doc.line(startX, currentY, startX + tableWidth, currentY);

      // Save PDF
      doc.save(`JobOrdersMasterReport_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert(`Failed to export PDF: ${e.message}`);
    }
  };

  // ==========================================
  // CUTTING EXPORTS (EXCEL & PDF)
  // ==========================================
  const buildExportRows = (sourceRows = cFiltered) => {
    return sourceRows.map((r) => {
      const lot = String(r["Lot No"] || "").trim();
      const pending = (pendingListByLot[lot] || []).join(", ");
      const obj = {};
      OUTPUT_COLS.forEach((col) => {
        if (col === "Pending Shade") obj[col] = pending;
        else obj[col] = r[col] ?? "";
      });
      return obj;
    });
  };

  const handleExportExcel = () => {
    if (cFiltered.length === 0) {
      alert('No data to export.');
      return;
    }
    const exportRows = buildExportRows(cFiltered);
    const ws = XLSX.utils.json_to_sheet(exportRows, { header: OUTPUT_COLS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cutting Stats");
    XLSX.writeFile(wb, `Cutting_Pending_Lots_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportCuttingToPdf = async () => {
    try {
      const jsPDF = await loadJsPDF();
      const doc = new jsPDF('l', 'pt', 'a4');
      const totalPagesEstimate = Math.ceil(cFiltered.length / 22) || 1;

      const columns = [
        { header: 'Lot No', width: 60, align: 'left', key: 'Lot No' },
        { header: 'Job Order No', width: 85, align: 'left', key: 'Job Order No' },
        { header: 'Remarks / Action', width: 135, align: 'left', key: 'Remarks' },
        { header: 'Pending Shades', width: 110, align: 'left', key: 'Pending Shades' },
        { header: 'Fabric Quality', width: 125, align: 'left', key: 'Fabric' },
        { header: 'Brand', width: 80, align: 'left', key: 'Brand' },
        { header: 'Garment', width: 85, align: 'left', key: 'Garment Type' },
        { header: 'PO Date', width: 62, align: 'left', key: 'PO Date' },
        { header: 'Total Pcs', width: 40, align: 'right', key: 'Total Qty' }
      ];

      const startX = 30;
      const startYInitial = 80;
      const tableWidth = 782;
      const pageHeight = 595;

      const drawHeader = (doc, pageNum) => {
        // Tally style outer border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.rect(startX, 30, tableWidth, pageHeight - 60);

        // Header Title
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('TEXTILE WAREHOUSE MANAGEMENT SYSTEM', startX + 10, 48);

        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.text('Pending Cutting Sheet Report', startX + 10, 62);

        const dateStr = `Printed: ${new Date().toLocaleString()}`;
        doc.text(dateStr, startX + tableWidth - 10 - doc.getTextWidth(dateStr), 62);

        // Double lines below report info
        doc.setLineWidth(0.5);
        doc.line(startX, 70, startX + tableWidth, 70);
        doc.line(startX, 72, startX + tableWidth, 72);

        // Table Header
        let currentX = startX;
        doc.setFont('times', 'bold');
        doc.setFontSize(8.5);

        columns.forEach(col => {
          let alignX = currentX + 5;
          if (col.align === 'right') {
            alignX = currentX + col.width - 5 - doc.getTextWidth(col.header);
          } else if (col.align === 'center') {
            alignX = currentX + (col.width - doc.getTextWidth(col.header)) / 2;
          }
          doc.text(col.header, alignX, 86);
          currentX += col.width;
        });

        // Double lines below table header
        doc.line(startX, 94, startX + tableWidth, 94);
        doc.line(startX, 96, startX + tableWidth, 96);

        // Draw vertical lines in header
        let lineX = startX;
        columns.forEach(col => {
          lineX += col.width;
          if (lineX < startX + tableWidth) {
            doc.line(lineX, 72, lineX, 96);
          }
        });

        // Footer Page Number
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        const pageText = `Page ${pageNum} of ${totalPagesEstimate}`;
        doc.text(pageText, startX + tableWidth / 2 - doc.getTextWidth(pageText) / 2, pageHeight - 42);
      };

      let pageNum = 1;
      drawHeader(doc, pageNum);

      let currentY = 96; // Start after header double line
      let totalPcsSum = 0;

      cFiltered.forEach((r, index) => {
        const lotNum = String(r['Lot No'] || '').trim();
        const qtyVal = parseFloat(r['Total Qty']) || 0;

        // Pre-calculate line splitting and maxRowLines for this row
        const colLines = {};
        let maxRowLines = 1;

        columns.forEach(col => {
          let val = '';
          if (col.key === 'Pending Shades') {
            val = (pendingListByLot[lotNum] || []).join(', ') || '—';
          } else if (col.key === 'Total Qty') {
            val = qtyVal > 0 ? qtyVal.toLocaleString() : '—';
          } else {
            val = String(r[col.key] || '—');
          }

          // Split text into lines matching column width
          const lines = doc.splitTextToSize(val, col.width - 10);
          colLines[col.key] = lines;
          maxRowLines = Math.max(maxRowLines, lines.length);
        });

        const calculatedRowHeight = maxRowLines * 10 + 10;

        if (currentY + calculatedRowHeight > 520) {
          doc.setLineWidth(1);
          doc.setDrawColor(0, 0, 0);
          doc.line(startX, currentY, startX + tableWidth, currentY);

          doc.addPage();
          pageNum++;
          drawHeader(doc, pageNum);
          currentY = 96;
        }

        totalPcsSum += qtyVal;

        // Draw Cell values and vertical borders
        let colX = startX;
        doc.setFont('times', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);

        columns.forEach(col => {
          const lines = colLines[col.key];

          lines.forEach((lineText, lineIdx) => {
            let alignX = colX + 5;
            if (col.align === 'right') {
              alignX = colX + col.width - 5 - doc.getTextWidth(lineText);
            } else if (col.align === 'center') {
              alignX = colX + (col.width - doc.getTextWidth(lineText)) / 2;
            }
            doc.text(lineText, alignX, currentY + 12 + lineIdx * 10);
          });

          // Draw vertical border for cell
          doc.setLineWidth(0.5);
          doc.setDrawColor(0, 0, 0);
          doc.line(colX, currentY, colX, currentY + calculatedRowHeight);

          colX += col.width;
        });

        // Draw last vertical border on the right
        doc.line(startX + tableWidth, currentY, startX + tableWidth, currentY + calculatedRowHeight);

        // Update Y position
        currentY += calculatedRowHeight;

        // Draw horizontal grid line below the row
        doc.setLineWidth(0.5);
        doc.setDrawColor(180, 180, 180);
        doc.line(startX, currentY, startX + tableWidth, currentY);
      });

      // Draw horizontal line at the end of data to close the table (thick boundary)
      doc.setLineWidth(1);
      doc.setDrawColor(0, 0, 0);
      doc.line(startX, currentY, startX + tableWidth, currentY);

      doc.save(`PendingCuttingReport_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert(`Failed to export PDF: ${e.message}`);
    }
  };

  const exportSingleJobOrderPdf = async (row) => {
    const jobOrderNo = row["Job Order No"] || "—";
    if (pdfBusyId) return;
    setPdfBusyId(jobOrderNo);

    try {
      await logPdfGeneration(row, "Single Job Order", "Started");

      // ── Query Active Inventory for Location Suggestions ──
      let inventorySuggestions = [];
      const queryShades = String(row["Shade"] || "")
        .split(/[,;|/]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      try {
        const fabricQuery = String(row["Fabric"] || "").trim().toLowerCase();
        // Fetch aggregated rolls from all three tables (Material, DyeingMaterial, Inventory)
        const response = await fetch(`${BASE_URL}/google-sheets/fabric-rolls`);
        if (response.ok) {
          const allRolls = await response.json();
          // Filter matching fabric rolls that are in stock
          const matchedFabricRolls = allRolls.filter(item => {
            const desc = String(item['Item Description'] || "").trim().toLowerCase();
            const status = String(item['Status'] || "").trim().toLowerCase();
            const isInStock = status === 'in_stock' || status === 'active' || status === '';
            return isInStock && (desc.includes(fabricQuery) || fabricQuery.includes(desc));
          });

          // Group matching rolls by Fabric description, Shade, and Location
          const groupedMap = new Map();
          matchedFabricRolls.forEach(roll => {
            const fabric = String(roll['Item Description'] || "").trim();
            const shade = String(roll['Shade'] || "").trim();
            const location = String(roll['Location'] || "").trim() || "—";
            const key = `${fabric.toLowerCase()}|||${shade.toLowerCase()}|||${location.toLowerCase()}`;

            if (groupedMap.has(key)) {
              const existing = groupedMap.get(key);
              existing.rolls.push(roll);
              existing.totalWeight += parseFloat(roll['Weight (KG)']) || 0;
              existing.totalRolls += parseInt(roll['Rolls']) || 1;
              if (roll['Lot No']) existing.lotNos.add(String(roll['Lot No']).trim());
              if (roll['Barcode ID']) existing.barcodes.add(String(roll['Barcode ID']).trim());
            } else {
              const lotNos = new Set();
              if (roll['Lot No']) lotNos.add(String(roll['Lot No']).trim());
              const barcodes = new Set();
              if (roll['Barcode ID']) barcodes.add(String(roll['Barcode ID']).trim());

              groupedMap.set(key, {
                fabric,
                shade,
                location,
                rolls: [roll],
                totalWeight: parseFloat(roll['Weight (KG)']) || 0,
                totalRolls: parseInt(roll['Rolls']) || 1,
                lotNos,
                barcodes
              });
            }
          });

          const groupedRolls = Array.from(groupedMap.values());

          // Sort matches: put matching shades first, then others
          const lowercaseQueryShades = queryShades.map(s => s.toLowerCase());
          groupedRolls.sort((a, b) => {
            const shadeA = String(a.shade).trim().toLowerCase();
            const shadeB = String(b.shade).trim().toLowerCase();
            const aMatches = lowercaseQueryShades.some(sh => shadeA.includes(sh) || sh.includes(shadeA));
            const bMatches = lowercaseQueryShades.some(sh => shadeB.includes(sh) || sh.includes(shadeB));
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
            return 0;
          });

          inventorySuggestions = groupedRolls;
        }
      } catch (invErr) {
        console.error("Error loading inventory matching locations for PDF:", invErr);
      }

      const jsPDFConstructor = await loadJsPDF();

      // Create main document
      const doc = new jsPDFConstructor({
        orientation: "landscape",
        unit: "pt",
        format: "a3",
        compress: true,
      });

      const LANDSCAPE_W = doc.internal.pageSize.getWidth();
      const LANDSCAPE_H = doc.internal.pageSize.getHeight();

      const parseShadesForTable = (value) => {
        return String(value || "")
          .split(/[,;|/]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      };

      const parseSizes = (sizeText) => {
        if (!sizeText || sizeText === "—") return [];
        return String(sizeText).split(/[,;|/]+/).map(s => s.trim()).filter(Boolean);
      };

      const shades = parseShadesForTable(row["Shade"] || "");
      const sizes = parseSizes(row["Size"] || "");

      // Margins and dimensions
      const M = 25;
      const tableX = M;
      const tableWidth = LANDSCAPE_W - 2 * M;
      const tableMaxHeight = LANDSCAPE_H - 100 - 90;

      const ROW_HEIGHT = 36;
      const HEADER_HEIGHT = ROW_HEIGHT * 1.1;

      const maxRowsPerPage = Math.floor(tableMaxHeight / ROW_HEIGHT) - 1;
      const colorsPerPage = Math.min(7, maxRowsPerPage - 1);

      const shadeBatches = [];
      for (let i = 0; i < shades.length; i += colorsPerPage) {
        shadeBatches.push(shades.slice(i, i + colorsPerPage));
      }
      if (shadeBatches.length === 0) {
        shadeBatches.push([]);
      }

      const C = {
        black: [0, 0, 0],
        white: [255, 255, 255],
      };

      const setFont = (weight, size) => {
        doc.setFont("times", weight);
        doc.setFontSize(size);
        doc.setTextColor(...C.black);
      };

      const val = (k) => (row[k] ?? "").toString().trim() || "—";

      const vDate = (k, rowData) => {
        const value = rowData[k];
        if (!value) return "—";
        if (typeof value === 'string') {
          const parts = value.split('/');
          if (parts.length === 3) {
            const month = parseInt(parts[0], 10);
            const day = parseInt(parts[1], 10);
            let year = parseInt(parts[2], 10);
            if (year < 1000) year = 2000 + year;
            if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return `${day} ${monthNames[month - 1]} ${year}`;
            }
          }
        }
        const iso = tryParseDateToISO(value);
        if (!iso) return value;
        const d = new Date(iso);
        return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}`;
      };

      const shortenText = (text, maxLength) => {
        if (!text || text === "—") return "—";
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + "...";
      };

      const drawPageHeader = (pageNumber, totalPages) => {
        const TOP_MARGIN = 19;
        doc.setFillColor(...C.white);
        doc.rect(0, 0, LANDSCAPE_W, 85 + TOP_MARGIN, "F");

        const quantity = val("Quantity");
        const unit = val("Unit") || "sets";
        const lotNumber = val("Lot Number") || val("Lot No");

        let leftY = 22 + TOP_MARGIN;
        setFont("bold", 10);
        doc.text(`JOB: ${jobOrderNo} | ${vDate("Date", row)}`, M, leftY);
        leftY += 14;

        const style = val("Style");
        setFont("normal", 10);
        doc.text(`STYLE: ${style}`, M, leftY);
        leftY += 14;

        if (quantity) {
          setFont("bold", 10);
          doc.text(`QTY: ${quantity} ${unit}`, M, leftY);
          leftY += 14;
        }

        const season = val("Season");
        if (season && season !== "—") {
          setFont("normal", 9);
          doc.text(`SEASON: ${season}`, M, leftY);
          leftY += 12;
        }

        const section = val("Section");
        if (section && section !== "—") {
          setFont("normal", 9);
          doc.text(`SECTION: ${section}`, M, leftY);
          leftY += 12;
        }

        let rightY = 22 + TOP_MARGIN;
        setFont("bold", 10);
        const brand = val("Brand");
        doc.text(`BRAND: ${brand}`, LANDSCAPE_W - M, rightY, { align: "right" });
        rightY += 14;

        const tapeLace = val("Tape/Lace") || val("Tape Lace") || "—";
        const zip = val("Zip") || "—";
        const bottomType = val("Bottom Type") || "—";

        if (tapeLace && tapeLace !== "—") {
          setFont("normal", 9);
          doc.text(`Tape/Lace: ${shortenText(tapeLace, 20)}`, LANDSCAPE_W - M, rightY, { align: "right" });
          rightY += 12;
        }

        if (zip && zip !== "—") {
          setFont("normal", 9);
          doc.text(`Zip: ${shortenText(zip, 20)}`, LANDSCAPE_W - M, rightY, { align: "right" });
          rightY += 12;
        }

        if (bottomType && bottomType !== "—") {
          setFont("normal", 9);
          doc.text(`Bottom: ${shortenText(bottomType, 20)}`, LANDSCAPE_W - M, rightY, { align: "right" });
          rightY += 12;
        }

        const pattern = val("Pattern");
        const garmentType = val("Garment Type");
        const patternGarment = `${pattern} | ${garmentType}`;
        if (patternGarment !== "— | —") {
          doc.text(patternGarment, LANDSCAPE_W - M, rightY, { align: "right" });
        }

        let centerY = 22 + TOP_MARGIN;
        setFont("bold", 16);
        doc.text("CUTTING TABLE ______", LANDSCAPE_W / 2, centerY, { align: "center" });
        centerY += 16;

        setFont("bold", 14);
        doc.text(`LOT NUMBER: ${lotNumber}`, LANDSCAPE_W / 2, centerY, { align: "center" });
        centerY += 16;

        setFont("bold", 10);
        const fabric = val("Fabric");
        doc.text(`Fabric: ${fabric}`, LANDSCAPE_W / 2, centerY, { align: "center" });
        centerY += 14;

        setFont("normal", 9);
        const remarksText = row["Remarks"] ? String(row["Remarks"]).trim() : "";
        if (remarksText && remarksText !== "") {
          const maxRemarksLength = 80;
          const displayRemarks = remarksText.length > maxRemarksLength
            ? remarksText.substring(0, maxRemarksLength - 3) + "..."
            : remarksText;
          doc.text(`Remarks: ${displayRemarks}`, LANDSCAPE_W / 2, centerY, { align: "center" });
          centerY += 14;
        }

        let headerHeight = 75 + TOP_MARGIN;
        if (remarksText && remarksText !== "") headerHeight += 14;

        const separatorY = headerHeight + 5;
        doc.setDrawColor(...C.black);
        doc.setLineWidth(0.5);
        doc.line(M, separatorY, LANDSCAPE_W - M, separatorY);

        return separatorY + 10;
      };

      const drawStickerBox = (startY, pageNumber) => {
        const boxWidth = 130;
        const boxHeight = 70;
        const boxSpacing = 20;
        const boxX1 = LANDSCAPE_W - (boxWidth * 2 + boxSpacing) - M;
        const boxX2 = boxX1 + boxWidth + boxSpacing;

        doc.setDrawColor(...C.black);
        doc.setLineWidth(1.5);
        doc.rect(boxX1, startY, boxWidth, boxHeight);
        doc.setFillColor(255, 255, 255);
        doc.rect(boxX1, startY, boxWidth, boxHeight, "F");

        let contentY = startY + 10;
        setFont("bold", 11);
        doc.text("PARTA CHECKED", boxX1 + boxWidth / 2, contentY, { align: "center" });
        contentY += 15;

        doc.setDrawColor(...C.black);
        doc.setLineWidth(0.8);
        doc.line(boxX1 + 10, contentY, boxX1 + boxWidth - 10, contentY);
        contentY += 10;

        setFont("bold", 9);
        doc.text("DATE :", boxX1 + 12, contentY);
        doc.line(boxX1 + 45, contentY + 3, boxX1 + boxWidth - 12, contentY + 3);
        contentY += 14;

        setFont("bold", 10);
        doc.text("Parta Incharge Sign", boxX1 + boxWidth / 2, contentY, { align: "center" });
        doc.line(boxX1 + 15, contentY + 8, boxX1 + boxWidth - 15, contentY + 8);

        doc.setDrawColor(...C.black);
        doc.setLineWidth(1.5);
        doc.rect(boxX2, startY, boxWidth, boxHeight);
        doc.setFillColor(255, 255, 255);
        doc.rect(boxX2, startY, boxWidth, boxHeight, "F");

        contentY = startY + 10;
        setFont("bold", 11);
        doc.text("QUALITY CHECKED", boxX2 + boxWidth / 2, contentY, { align: "center" });
        contentY += 15;

        doc.setDrawColor(...C.black);
        doc.setLineWidth(0.8);
        doc.line(boxX2 + 10, contentY, boxX2 + boxWidth - 10, contentY);
        contentY += 10;

        setFont("bold", 9);
        doc.text("DATE :", boxX2 + 12, contentY);
        doc.line(boxX2 + 45, contentY + 3, boxX2 + boxWidth - 12, contentY + 3);
        contentY += 14;

        setFont("bold", 10);
        doc.text("Quality Incharge Sign", boxX2 + boxWidth / 2, contentY, { align: "center" });
        doc.line(boxX2 + 15, contentY + 8, boxX2 + boxWidth - 15, contentY + 8);

        return startY + boxHeight + 8;
      };

      const drawTablePage = (shadeBatch, pageIndex, totalPages, startSrNo) => {
        const tableStartY = drawPageHeader(pageIndex + 1, totalPages);
        let y = tableStartY;

        const tableData = [];
        const rowsNeeded = Math.max(colorsPerPage, shadeBatch.length);

        const fabricLotNo = val("Fabric Lot No") || val("Fabric Lot") || "—";
        const ribLotNo = val("Rib Lot No") || val("Rib Lot") || "—";

        for (let i = 0; i < rowsNeeded; i++) {
          const srNo = startSrNo + i;
          const rowData = {
            sr_no: srNo.toString(),
            shade: i < shadeBatch.length ? shadeBatch[i] : "",
            fabric_lot_no: i === 0 ? fabricLotNo : "",
            rib_lot_no: i === 0 ? ribLotNo : "",
            rolls: "",
            kgs: ""
          };
          if (sizes.length > 0) {
            sizes.forEach(size => {
              rowData[`size_${size}`] = "";
            });
          }
          rowData.total_pcs = "";
          rowData.kapda_layer_weight = "";
          rowData.layer_piece = "";
          rowData.layer_inch = "";
          rowData.daya = "";
          rowData.cutting_weight = "";
          rowData.kapda_vapsi = "";
          tableData.push(rowData);
        }

        if (pageIndex === totalPages - 1) {
          const totalRow = {
            sr_no: "TOTAL",
            shade: "",
            fabric_lot_no: "",
            rib_lot_no: "",
            rolls: "",
            kgs: "",
            total_pcs: "",
            kapda_layer_weight: "",
            layer_piece: "",
            layer_inch: "",
            daya: "",
            cutting_weight: "",
            kapda_vapsi: "",
            isTotalRow: true
          };
          sizes.forEach(size => {
            totalRow[`size_${size}`] = "";
          });
          tableData.push(totalRow);
        }

        const generateTableHeaders = () => {
          const headers = [
            { label: "SR", key: "sr_no", width: 0.5 },
            { label: "SHADE", key: "shade", width: 1.5 },
            { label: "FABRIC\nLOT NO", key: "fabric_lot_no", width: 0.9 },
            { label: "RIB\nLOT NO", key: "rib_lot_no", width: 0.9 },
            { label: "ROLLS", key: "rolls", width: 0.7 },
            { label: "KGS", key: "kgs", width: 0.7 },
          ];
          sizes.forEach(size => {
            headers.push({
              label: size,
              key: `size_${size}`,
              width: 0.6
            });
          });
          headers.push(
            { label: "TOTAL\nPCS", key: "total_pcs", width: 0.7 },
            { label: "KAPDA\nLAYER WT", key: "kapda_layer_weight", width: 0.9 },
            { label: "LAYER\nPCS", key: "layer_piece", width: 0.7 },
            { label: "LAYER\nINCH", key: "layer_inch", width: 0.7 },
            { label: "DIA", key: "daya", width: 0.6 },
            { label: "CUTTING\nWEIGHT", key: "cutting_weight", width: 0.8 },
            { label: "KAPDA\nVAPSI", key: "kapda_vapsi", width: 0.7 }
          );
          return headers;
        };

        const tableHeaders = generateTableHeaders();

        const drawTableHeader = () => {
          doc.setFillColor(...C.white);
          doc.rect(tableX, y, tableWidth, HEADER_HEIGHT, "F");

          let currentX = tableX;
          const totalRatio = tableHeaders.reduce((sum, h) => sum + (h.width || 1), 0);

          tableHeaders.forEach((h, i) => {
            const colWidth = (h.width / totalRatio) * tableWidth;
            doc.setDrawColor(...C.black);
            doc.setLineWidth(0.5);
            doc.rect(currentX, y, colWidth, HEADER_HEIGHT);
            setFont("bold", 7);

            if (h.label.length <= 3 && /^[A-Z0-9]+$/.test(h.label) && !h.label.includes('\n')) {
              doc.text(h.label, currentX + colWidth / 2, y + HEADER_HEIGHT / 2 - 4, { align: "center" });
              doc.setDrawColor(...C.black);
              doc.setLineWidth(0.3);
              doc.line(currentX + 2, y + HEADER_HEIGHT / 2, currentX + colWidth - 2, y + HEADER_HEIGHT / 2);
            } else {
              const lines = h.label.split('\n');
              const lineHeight = 7;
              const startY = y + (HEADER_HEIGHT - (lines.length * lineHeight)) / 2 + 5;
              lines.forEach((line, lineIdx) => {
                doc.text(line, currentX + colWidth / 2, startY + (lineIdx * lineHeight), { align: "center" });
              });
            }
            currentX += colWidth;
          });

          doc.setDrawColor(...C.black);
          doc.setLineWidth(1.5);
          doc.line(tableX, y + HEADER_HEIGHT, tableX + tableWidth, y + HEADER_HEIGHT);

          return HEADER_HEIGHT;
        };

        const drawTableRows = (headerHeight) => {
          const totalRatio = tableHeaders.reduce((sum, h) => sum + (h.width || 1), 0);
          const tableStartRowY = y + headerHeight;

          for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
            const rowData = tableData[rowIndex];
            const rowY = tableStartRowY + (rowIndex * ROW_HEIGHT);

            if (rowIndex % 2 === 0) {
              doc.setFillColor(...C.white);
            } else {
              doc.setFillColor(245, 245, 245);
            }
            doc.rect(tableX, rowY, tableWidth, ROW_HEIGHT, "F");

            if (rowData.isTotalRow) {
              doc.setDrawColor(...C.black);
              doc.setLineWidth(1.5);
              doc.line(tableX, rowY, tableX + tableWidth, rowY);
            }

            let currentX = tableX;

            tableHeaders.forEach((h, i) => {
              const colWidth = (h.width / totalRatio) * tableWidth;
              doc.setDrawColor(...C.black);
              doc.setLineWidth(0.3);
              doc.rect(currentX, rowY, colWidth, ROW_HEIGHT);

              const cellValue = rowData[h.key] || "";
              if (rowData.isTotalRow) {
                setFont("bold", 8);
              } else {
                setFont("normal", 8);
              }

              if (h.key === "shade" || h.key === "fabric_lot_no" || h.key === "rib_lot_no") {
                const textValue = String(cellValue);
                const maxWidth = colWidth - 6;
                const lines = doc.splitTextToSize(textValue, maxWidth);
                const lineHeight = 7;
                const totalTextHeight = lines.length * lineHeight;
                const startY = rowY + (ROW_HEIGHT - totalTextHeight) / 2 + 4;
                lines.forEach((line, lineIdx) => {
                  doc.text(line, currentX + colWidth / 2, startY + (lineIdx * lineHeight), { align: "center" });
                });
              } else {
                doc.text(String(cellValue), currentX + colWidth / 2, rowY + ROW_HEIGHT / 2 + 2, { align: "center" });
              }
              currentX += colWidth;
            });
          }

          return tableStartRowY + (tableData.length * ROW_HEIGHT);
        };

        const headerHeight = drawTableHeader();
        const tableBottom = drawTableRows(headerHeight);

        // Draw sticker box at the bottom of the table
        const stickerBottom = drawStickerBox(tableBottom + 15, pageIndex + 1);
        return stickerBottom;
      };

      // Load Image if present
      const imageUrl = row["Image URL"] || "";
      let base64Image = "";
      if (imageUrl) {
        try {
          base64Image = await loadImageAsBase64ForPdf(imageUrl, { maxWidth: 300, maxHeight: 300 });
        } catch (imgErr) {
          console.warn("Failed to load image for PDF:", imgErr);
        }
      }

      // Draw Inventory Suggestion Page directly as the first and only page


      const drawInventorySuggestionPage = () => {
        let suggestionPageNum = 1;
        const titleY = 40;

        const drawPageTitleHeader = () => {
          setFont("bold", 18);
          doc.text("INVENTORY LOCATION SUGGESTION SHEET", LANDSCAPE_W / 2, titleY, { align: "center" });

          setFont("normal", 10);
          doc.text(
            `Suggested storage locations in active inventory matching Fabric: "${row["Fabric"]}" and Shades: "${queryShades.join(', ')}"`,
            LANDSCAPE_W / 2, titleY + 16, { align: "center" }
          );

          // Draw separator line
          doc.setDrawColor(...C.black);
          doc.setLineWidth(1);
          doc.line(M, titleY + 28, LANDSCAPE_W - M, titleY + 28);

          // Page Number footer
          setFont("normal", 9);
          doc.text(`Page ${suggestionPageNum}`, LANDSCAPE_W - M, LANDSCAPE_H - 25, { align: "right" });
        };

        drawPageTitleHeader();

        let startY = titleY + 50;

        if (inventorySuggestions.length === 0) {
          // Empty State Suggestion Block
          setFont("bold", 14);
          doc.setTextColor(180, 50, 50);
          doc.text("⚠️ NO MATCHING ITEMS FOUND IN ACTIVE INVENTORY", LANDSCAPE_W / 2, startY + 60, { align: "center" });
          setFont("normal", 10);
          doc.setTextColor(100, 100, 100);
          doc.text(
            "There are currently no items in stock matching this fabric and shade in the inventory database.",
            LANDSCAPE_W / 2, startY + 80, { align: "center" }
          );
          doc.text(
            "Please check if stock has been received, or verify that the fabric and shade names match exactly.",
            LANDSCAPE_W / 2, startY + 95, { align: "center" }
          );
          return;
        }

        // Draw Table Header
        const suggestionHeaders = [
          { label: "SR", width: 0.4 },
          { label: "BARCODE ID", width: 1.2 },
          { label: "FABRIC DESCRIPTION", width: 2.2 },
          { label: "SHADE", width: 1.2 },
          { label: "LOT NO", width: 1.0 },
          { label: "STORE LOCATION", width: 1.4 },
          { label: "BAL WT (KG)", width: 0.8 },
          { label: "BAL ROLLS", width: 0.8 }
        ];

        const totalRatio = suggestionHeaders.reduce((sum, h) => sum + h.width, 0);

        const drawTableHeaderRow = (y) => {
          doc.setFillColor(240, 244, 248);
          doc.rect(tableX, y, tableWidth, ROW_HEIGHT, "F");
          doc.setDrawColor(...C.black);
          doc.setLineWidth(1.2);
          doc.rect(tableX, y, tableWidth, ROW_HEIGHT);

          let currentX = tableX;
          suggestionHeaders.forEach((h) => {
            const colWidth = (h.width / totalRatio) * tableWidth;
            doc.setLineWidth(0.5);
            doc.line(currentX, y, currentX, y + ROW_HEIGHT);
            setFont("bold", 9);
            doc.text(h.label, currentX + colWidth / 2, y + ROW_HEIGHT / 2 + 3, { align: "center" });
            currentX += colWidth;
          });
        };

        drawTableHeaderRow(startY);

        // Draw rows
        let rowY = startY + ROW_HEIGHT;
        const maxRowsSuggestion = 40;
        const displayRows = inventorySuggestions.slice(0, maxRowsSuggestion);

        displayRows.forEach((item, idx) => {
          const barcodesArray = Array.from(item.barcodes || []);
          const barcodesText = barcodesArray.length > 10
            ? barcodesArray.slice(0, 10).join(', ') + ' --'
            : barcodesArray.join(', ');

          const rowData = [
            (idx + 1).toString(),
            barcodesText || "—",
            item.fabric || "—",
            item.shade || "—",
            Array.from(item.lotNos || []).join(', ') || "—",
            item.location || "—",
            parseFloat(item.totalWeight || 0).toFixed(2),
            parseInt(item.totalRolls || 0).toString()
          ];

          // Compute wrapped lines and height for this row
          const colLines = {};
          let maxRowLines = 1;

          suggestionHeaders.forEach((h, colIdx) => {
            const colWidth = (h.width / totalRatio) * tableWidth;
            const textValue = rowData[colIdx];
            const lines = doc.splitTextToSize(textValue, colWidth - 10);
            colLines[colIdx] = lines;
            maxRowLines = Math.max(maxRowLines, lines.length);
          });

          const calculatedRowHeight = maxRowLines * 11 + 10;

          // Page break check (Landscape A3 height is 842pt)
          if (rowY + calculatedRowHeight > 780) {
            // Draw table bottom border
            doc.setLineWidth(1.2);
            doc.setDrawColor(...C.black);
            doc.line(tableX, rowY, tableX + tableWidth, rowY);

            doc.addPage();
            suggestionPageNum++;
            drawPageTitleHeader();

            rowY = titleY + 50;
            drawTableHeaderRow(rowY);
            rowY += ROW_HEIGHT;
          }

          // Draw row cells
          doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 253);
          doc.rect(tableX, rowY, tableWidth, calculatedRowHeight, "F");

          let curX = tableX;
          suggestionHeaders.forEach((h, colIdx) => {
            const colWidth = (h.width / totalRatio) * tableWidth;

            // Draw cell text
            const lines = colLines[colIdx];
            lines.forEach((lineText, lineIdx) => {
              let alignX = curX + 5;
              let isCenter = colIdx !== 2 && colIdx !== 1; // Left align fabric and barcodes, center others
              if (isCenter) {
                alignX = curX + colWidth / 2 - doc.getTextWidth(lineText) / 2;
              }

              if (colIdx === 5) {
                setFont("bold", 9);
                doc.setTextColor(95, 61, 196); // highlight store location in brand violet
              } else {
                setFont("normal", 8.5);
                doc.setTextColor(0, 0, 0);
              }

              doc.text(lineText, alignX, rowY + 12 + lineIdx * 11);
            });

            // Draw vertical cell borders
            doc.setDrawColor(...C.black);
            doc.setLineWidth(0.3);
            doc.line(curX, rowY, curX, rowY + calculatedRowHeight);

            curX += colWidth;
          });

          // Draw last vertical cell border
          doc.line(tableX + tableWidth, rowY, tableX + tableWidth, rowY + calculatedRowHeight);

          // Update Y position
          rowY += calculatedRowHeight;

          // Draw horizontal border under the row
          doc.setLineWidth(0.3);
          doc.line(tableX, rowY, tableX + tableWidth, rowY);
        });

        // Draw last bottom border
        doc.setLineWidth(1.2);
        doc.line(tableX, rowY, tableX + tableWidth, rowY);

        if (inventorySuggestions.length > maxRowsSuggestion) {
          setFont("italic", 9);
          doc.text(
            `* Showing top ${maxRowsSuggestion} of ${inventorySuggestions.length} matching rolls in inventory. Please refer to Store Inventory panel for more details.`,
            M, rowY + 15
          );
        }
      };

      drawInventorySuggestionPage();

      // Save document
      const fileBaseName = `JobOrder_${jobOrderNo}_${row["Lot Number"] || row["Lot No"] || ""}.pdf`;
      doc.save(fileBaseName);

      await logPdfGeneration(row, "Single Job Order", "Success");
    } catch (err) {
      console.error("Error generating single job order PDF:", err);
      alert("Failed to export PDF: " + err.message);
      await logPdfGeneration(row, "Single Job Order", "Failed", err.message);
    } finally {
      setPdfBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px' }}>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-title-block" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="breadcrumb"><span>Home</span><span>/</span><span>Job Orders</span></div>
              <h1 style={{ margin: 0, fontWeight: 800, tracking: '-0.025em', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Layers size={28} style={{ color: 'var(--primary)' }} /> All Job Orders & Cutting Sheet
              </h1>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                Monitor and sync live job specifications, check fabric status, and track color pending details.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a
                href={`https://docs.google.com/spreadsheets/d/${JOB_SHEET_ID}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600, height: '38px', padding: '0 12px' }}
              >
                <FileText size={14} />
                <span>Job Order Sheet</span>
              </a>
              <a
                href={`https://docs.google.com/spreadsheets/d/${BUDGET_SHEET_ID}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600, height: '38px', padding: '0 12px' }}
              >
                <Scissors size={14} />
                <span>Cutting & Index Sheet</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* TABS CONTROLLER (Master List vs Cutting Sheet tab) */}
      <div style={{
        display: 'inline-flex',
        backgroundColor: 'var(--card-bg)',
        padding: '6px',
        borderRadius: '30px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        gap: 6,
        alignSelf: 'flex-start',
        marginTop: 8
      }}>
        <button
          className={`btn ${activeTab === 'master' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('master')}
          style={{
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 24px',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: activeTab === 'master' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'master' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'master' ? '0 4px 12px rgba(59, 130, 246, 0.25)' : 'none',
            border: 'none',
            height: 'auto'
          }}
        >
          <Layers size={15} />
          <span>Master Job Orders</span>
        </button>
        <button
          className={`btn ${activeTab === 'cutting' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('cutting')}
          style={{
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 24px',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: activeTab === 'cutting' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'cutting' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'cutting' ? '0 4px 12px rgba(59, 130, 246, 0.25)' : 'none',
            border: 'none',
            height: 'auto'
          }}
        >
          <Scissors size={15} />
          <span>Pending Cutting Sheet</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: MASTER LIST */}
      {/* ==================================================== */}
      {activeTab === 'master' && (
        <>
          {/* KPI Overview Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {/* Total Orders Card */}
            <div
              className="card metrics-card"
              onClick={() => setCuttingStatusFilter('All')}
              style={{
                background: cuttingStatusFilter === 'All'
                  ? 'linear-gradient(135deg, var(--card-bg) 0%, rgba(59, 130, 246, 0.05) 100%)'
                  : 'var(--card-bg)',
                border: cuttingStatusFilter === 'All' ? '1px solid var(--primary)' : '1px solid var(--border)',
                borderLeft: '4px solid var(--primary)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: cuttingStatusFilter === 'All' ? 'translateY(-2px)' : 'none',
                boxShadow: cuttingStatusFilter === 'All'
                  ? '0 10px 15px -3px rgba(59, 130, 246, 0.12), 0 4px 6px -2px rgba(59, 130, 246, 0.05)'
                  : '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div className="card-body" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={22} />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Orders</span>
                  <strong style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.total.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Fabric Issue Pending Orders Card */}
            <div
              className="card metrics-card"
              onClick={() => setCuttingStatusFilter(cuttingStatusFilter === 'Fabric Issue Pending' ? 'All' : 'Fabric Issue Pending')}
              style={{
                background: cuttingStatusFilter === 'Fabric Issue Pending'
                  ? 'linear-gradient(135deg, var(--card-bg) 0%, rgba(239, 68, 68, 0.05) 100%)'
                  : 'var(--card-bg)',
                border: cuttingStatusFilter === 'Fabric Issue Pending' ? '1px solid var(--danger)' : '1px solid var(--border)',
                borderLeft: '4px solid var(--danger)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: cuttingStatusFilter === 'Fabric Issue Pending' ? 'translateY(-2px)' : 'none',
                boxShadow: cuttingStatusFilter === 'Fabric Issue Pending'
                  ? '0 10px 15px -3px rgba(239, 68, 68, 0.12), 0 4px 6px -2px rgba(239, 68, 68, 0.05)'
                  : '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div className="card-body" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fabric Issue Pending</span>
                  <strong style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.fabricIssuePending.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Colour Pending Orders Card */}
            <div
              className="card metrics-card"
              onClick={() => setCuttingStatusFilter(cuttingStatusFilter === 'Colour Pending' ? 'All' : 'Colour Pending')}
              style={{
                background: cuttingStatusFilter === 'Colour Pending'
                  ? 'linear-gradient(135deg, var(--card-bg) 0%, rgba(245, 158, 11, 0.05) 100%)'
                  : 'var(--card-bg)',
                border: cuttingStatusFilter === 'Colour Pending' ? '1px solid var(--warning)' : '1px solid var(--border)',
                borderLeft: '4px solid var(--warning)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: cuttingStatusFilter === 'Colour Pending' ? 'translateY(-2px)' : 'none',
                boxShadow: cuttingStatusFilter === 'Colour Pending'
                  ? '0 10px 15px -3px rgba(245, 158, 11, 0.12), 0 4px 6px -2px rgba(245, 158, 11, 0.05)'
                  : '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div className="card-body" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag size={22} />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Colour Pending</span>
                  <strong style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.colourPending.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Cutting Done Orders Card */}
            <div
              className="card metrics-card"
              onClick={() => setCuttingStatusFilter(cuttingStatusFilter === 'Cutting Done' ? 'All' : 'Cutting Done')}
              style={{
                background: cuttingStatusFilter === 'Cutting Done'
                  ? 'linear-gradient(135deg, var(--card-bg) 0%, rgba(16, 185, 129, 0.05) 100%)'
                  : 'var(--card-bg)',
                border: cuttingStatusFilter === 'Cutting Done' ? '1px solid var(--success)' : '1px solid var(--border)',
                borderLeft: '4px solid var(--success)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: cuttingStatusFilter === 'Cutting Done' ? 'translateY(-2px)' : 'none',
                boxShadow: cuttingStatusFilter === 'Cutting Done'
                  ? '0 10px 15px -3px rgba(16, 185, 129, 0.12), 0 4px 6px -2px rgba(16, 185, 129, 0.05)'
                  : '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div className="card-body" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={22} />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cutting Done</span>
                  <strong style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.cuttingDone.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Fabric Issued but not cut Card */}
            <div
              className="card metrics-card"
              onClick={() => setCuttingStatusFilter(cuttingStatusFilter === 'Fabric Issued but not cut' ? 'All' : 'Fabric Issued but not cut')}
              style={{
                background: cuttingStatusFilter === 'Fabric Issued but not cut'
                  ? 'linear-gradient(135deg, var(--card-bg) 0%, rgba(139, 92, 246, 0.05) 100%)'
                  : 'var(--card-bg)',
                border: cuttingStatusFilter === 'Fabric Issued but not cut' ? '1px solid #8b5cf6' : '1px solid var(--border)',
                borderLeft: '4px solid #8b5cf6',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: cuttingStatusFilter === 'Fabric Issued but not cut' ? 'translateY(-2px)' : 'none',
                boxShadow: cuttingStatusFilter === 'Fabric Issued but not cut'
                  ? '0 10px 15px -3px rgba(139, 92, 246, 0.12), 0 4px 6px -2px rgba(139, 92, 246, 0.05)'
                  : '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div className="card-body" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issued Not Cut</span>
                  <strong style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.fabricIssuedButNotCut.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Master List Search & Filters Panel */}
          <div className="card" style={{ boxShadow: '0 4px 18px rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}>
            <div className="card-body" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1, minWidth: '300px', margin: 0, position: 'relative' }}>
                  <Search size={16} className="icon" />
                  <input
                    id="job-order-search"
                    placeholder="Search by Job Order No, Lot, Fabric, Brand, Party Name, style..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: '38px', paddingRight: search ? '38px' : '12px', height: '42px', fontSize: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7,
                        transition: 'opacity 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowFilters(!showFilters)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, height: '42px', padding: '0 16px', borderRadius: '8px', fontWeight: 600 }}
                >
                  <SlidersHorizontal size={15} />
                  <span>Filters</span>
                  {showFilters ? <X size={14} /> : <Filter size={14} />}
                </button>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: 0,
                  padding: '0 16px',
                  height: '42px',
                  backgroundColor: 'var(--bg-hover)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  userSelect: 'none',
                  transition: 'all 0.15s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={onlyUncut}
                    onChange={e => setOnlyUncut(e.target.checked)}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                  <span>Show Only Un-cut Lots</span>
                </label>

                <button className="btn btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 8, height: '42px', borderRadius: '8px', fontWeight: 600 }}>
                  <Download size={15} /> Export CSV
                </button>

                <button className="btn btn-secondary" onClick={exportMasterToPdf} style={{ display: 'flex', alignItems: 'center', gap: 8, height: '42px', borderRadius: '8px', fontWeight: 600 }}>
                  <FileText size={15} /> Export PDF
                </button>

                {(selectedBrand !== 'All' || selectedStatus !== 'All' || selectedSeason !== 'All' || selectedFabric !== 'All' || selectedParty !== 'All' || selectedGarment !== 'All' || selectedSection !== 'All' || selectedSubmittedBy !== 'All' || search || !onlyUncut || cuttingStatusFilter !== 'All') && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setSearch('');
                      setSelectedBrand('All');
                      setSelectedSeason('All');
                      setSelectedStatus('All');
                      setSelectedFabric('All');
                      setSelectedParty('All');
                      setSelectedGarment('All');
                      setSelectedSection('All');
                      setSelectedSubmittedBy('All');
                      setOnlyUncut(true);
                      setCuttingStatusFilter('All');
                    }}
                    style={{ height: '42px', color: 'var(--danger)', fontWeight: 600 }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Advanced Collapsible Filter Panel */}
              <div style={{
                maxHeight: showFilters ? '500px' : '0px',
                overflow: 'hidden',
                transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: showFilters ? 1 : 0,
                marginTop: showFilters ? 20 : 0,
                paddingTop: showFilters ? 16 : 0,
                borderTop: showFilters ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Brand</label>
                    <select className="form-control" value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
                      <option value="All">All Brands</option>
                      {brands.filter(b => b !== 'All').map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Fabric Quality</label>
                    <select className="form-control" value={selectedFabric} onChange={e => setSelectedFabric(e.target.value)}>
                      <option value="All">All Fabrics</option>
                      {fabrics.filter(f => f !== 'All').map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Garment Type</label>
                    <select className="form-control" value={selectedGarment} onChange={e => setSelectedGarment(e.target.value)}>
                      <option value="All">All Garments</option>
                      {garments.filter(g => g !== 'All').map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Season</label>
                    <select className="form-control" value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}>
                      <option value="All">All Seasons</option>
                      {seasons.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Party Name</label>
                    <select className="form-control" value={selectedParty} onChange={e => setSelectedParty(e.target.value)}>
                      <option value="All">All Parties</option>
                      {parties.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Section</label>
                    <select className="form-control" value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
                      <option value="All">All Sections</option>
                      {sections.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Submitted By</label>
                    <select className="form-control" value={selectedSubmittedBy} onChange={e => setSelectedSubmittedBy(e.target.value)}>
                      <option value="All">All Users</option>
                      {submittedBys.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Order Status</label>
                    <select className="form-control" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                      <option value="All">All Statuses</option>
                      {statuses.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                Showing <strong>{filtered.length}</strong> of <strong>{jobOrders.length}</strong> Job Orders
              </div>
            </div>
          </div>

          {/* Master Table Grid */}
          <div className="old-inventory-card">
            <div className="table-wrap" style={{ border: 'none', overflowX: 'auto', margin: 0 }}>
              <table className="premium-table">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ width: '70px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Details</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Job Order No</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Date</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Lot Number</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Fabric Quality</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Brand</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Shades</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Sizes</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Unit</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Party Name</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Garment</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Priority</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Fabric Issued Date</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Cutting Date</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Cutting Status</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                          <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Syncing and parsing live Google Sheets database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={16}>
                        <div className="empty-state" style={{ padding: '60px 20px' }}>
                          <div className="empty-state-icon" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}><Layers size={32} /></div>
                          <h3 style={{ margin: '12px 0 6px 0', fontSize: 16, fontWeight: 700 }}>No matching Job Orders found</h3>
                          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Adjust your active search queries or filter dropdown combinations.</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginated.map((jo, idx) => (
                    <tr key={`${jo['Job Order No']}-${idx}`} className="hover-row" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setActiveJobOrder(jo)}
                          title="View Details"
                          style={{ color: 'var(--primary)' }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => exportSingleJobOrderPdf(jo)}
                          disabled={pdfBusyId === jo['Job Order No']}
                          title="Download PDF"
                          style={{ color: 'var(--primary)' }}
                        >
                          {pdfBusyId === jo['Job Order No'] ? (
                            <RefreshCw size={14} className="spin-animation" />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 6, backgroundColor: 'rgba(59,130,246,0.08)' }}>
                          {jo['Job Order No'] || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <Calendar size={12} style={{ opacity: 0.6 }} />
                          {jo['Date'] || '—'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {(() => {
                          const lotNum = String(jo['Lot Number'] || '').trim();
                          if (!lotNum) return '—';

                          const priorityVal = String(jo['Priority'] || '').trim().toLowerCase();
                          let textColor = 'var(--text-primary)';
                          let bgColor = 'transparent';
                          let borderColor = 'transparent';
                          let hasHighlight = false;

                          if (priorityVal === 'high') {
                            textColor = '#ffffff';
                            bgColor = '#f43f5e'; // Solid pinkish red
                            borderColor = '#e11d48';
                            hasHighlight = true;
                          } else if (priorityVal === 'medium') {
                            textColor = '#000000';
                            bgColor = '#eab308'; // Solid yellow
                            borderColor = '#ca8a04';
                            hasHighlight = true;
                          } else if (priorityVal === 'low') {
                            textColor = '#ffffff';
                            bgColor = '#ef4444'; // Solid red
                            borderColor = '#dc2626';
                            hasHighlight = true;
                          }

                          const isRepeated = lotCounts.get(lotNum) > 1;

                          return (
                            <span
                              style={{
                                color: textColor,
                                backgroundColor: bgColor,
                                border: hasHighlight ? `1px solid ${borderColor}` : 'none',
                                padding: hasHighlight ? '6px 10px' : '0',
                                borderRadius: hasHighlight ? '6px' : '0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontWeight: 700,
                                fontSize: hasHighlight ? '11px' : 'inherit',
                                boxShadow: hasHighlight ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                              }}
                            >
                              {lotNum}
                              {isRepeated && (
                                <Star
                                  size={12}
                                  fill={priorityVal === 'medium' ? '#000000' : '#ffffff'}
                                  stroke={priorityVal === 'medium' ? '#000000' : '#ffffff'}
                                  title="Repeated lot (Urgent)"
                                  style={{ animation: 'pulse 1.5s infinite' }}
                                />
                              )}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={jo['Fabric']}>
                        {jo['Fabric'] || '—'}
                      </td>
                      <td>{jo['Brand'] || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={jo['Shade']}>{jo['Shade'] || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{jo['Size'] || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{jo['Unit'] || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{jo['Party Name'] || '—'}</td>
                      <td>
                        <span style={{ fontSize: 12, padding: '3px 6px', borderRadius: 4, backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                          {jo['Garment Type'] || '—'}
                        </span>
                      </td>
                      <td>
                        {jo['Priority'] ? (
                          <span className={`badge ${String(jo['Priority']).toLowerCase() === 'high' ? 'badge-danger' :
                            String(jo['Priority']).toLowerCase() === 'medium' ? 'badge-warning' :
                              String(jo['Priority']).toLowerCase() === 'low' ? 'badge-success' :
                                'badge-secondary'
                            }`} style={{ fontSize: 10, fontWeight: 700 }}>
                            {jo['Priority']}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <Calendar size={12} style={{ opacity: 0.6 }} />
                          {formatToYYYYMMDD(jo['fabricIssuedDate'])}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <Calendar size={12} style={{ opacity: 0.6 }} />
                          {(() => {
                            const lotNum = String(jo['Lot Number'] || '').trim();
                            const cutInfo = cuttingMapByLot.get(lotNum);
                            return cutInfo ? formatToYYYYMMDD(cutInfo['Cutting Date']) : '—';
                          })()}
                        </span>
                      </td>
                      <td>
                        {(() => {
                          const lotNum = String(jo['Lot Number'] || '').trim();
                          const statusText = getCuttingStatusText(lotNum);

                          if (statusText === 'Fabric Issued but not cut') {
                            return (
                              <span className="badge" style={{ fontSize: 10, fontWeight: 700, backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                                Fabric Issued but not cut
                              </span>
                            );
                          }

                          let badgeClass = 'badge-secondary';
                          let displayText = statusText;
                          if (statusText === 'Cutting Done') {
                            badgeClass = 'badge-success';
                          } else if (statusText === 'Colour Pending') {
                            badgeClass = 'badge-warning';
                            const pendingShades = pendingListByLot[lotNum] || [];
                            if (pendingShades.length > 0) {
                              displayText = `Colour Pending (${pendingShades.join(', ')})`;
                            }
                          } else if (statusText === 'Fabric Issue Pending') {
                            badgeClass = 'badge-danger';
                          }

                          return (
                            <span className={`badge ${badgeClass}`} style={{ fontSize: 10, fontWeight: 700 }} title={statusText === 'Colour Pending' ? `Pending shades: ${(pendingListByLot[lotNum] || []).join(', ')}` : undefined}>
                              {displayText}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <span className={`badge ${String(jo['Status']).toLowerCase() === 'active' ? 'badge-primary' :
                          String(jo['Status']).toLowerCase() === 'completed' ? 'badge-success' :
                            String(jo['Status']).toLowerCase() === 'cancelled' ? 'badge-danger' :
                              'badge-secondary'
                          }`} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.02em' }}>
                          {jo['Status'] || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Master Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '0 4px' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> (Filtered: {filtered.length} rows)
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  className="form-control"
                  style={{ width: 90, height: 32, padding: '4px 8px', fontSize: 12 }}
                  value={limit}
                  onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }}
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  style={{ padding: '0 8px', height: '32px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  style={{ padding: '0 8px', height: '32px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================================================== */}
      {/* TAB 2: PENDING CUTTING & FABRIC LOTS */}
      {/* ==================================================== */}
      {activeTab === 'cutting' && (
        <>
          {/* Info Summary for Cutting */}
          <div className="card" style={{ borderLeft: '4px solid var(--primary)', backgroundColor: '#ffffff' }}>
            <div className="card-body" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Scissors size={20} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Lot-wise Cutting Status & Pending Actions Report</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Displays live cutting status, pending colors (Colour Pending), completed lots (Cutting Done), and unindexed lots (Fabric Issue Pending).
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} /> Export Excel
                </button>
                <button className="btn btn-secondary" onClick={exportCuttingToPdf} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} /> Export PDF
                </button>
                <button className="btn btn-primary" onClick={() => loadCuttingData("refresh")} disabled={cuttingLoading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={14} className={cuttingLoading ? 'spin-animation' : ''} /> Sync Report
                </button>
              </div>
            </div>
          </div>

          {/* Cutting List Filters Panel */}
          <div className="card" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <div className="card-body" style={{ padding: '20px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>

                {/* Search */}
                <div style={{ gridColumn: 'span 2', minWidth: '300px' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Search</label>
                  <div className="search-bar" style={{ margin: 0, width: '100%' }}>
                    <Search size={14} className="icon" />
                    <input
                      placeholder="Search Lot, Job No, Brand, Fabric, Style, Party..."
                      value={cuttingSearch}
                      onChange={e => setCuttingSearch(e.target.value)}
                      style={{ paddingLeft: '32px', height: '38px', fontSize: '13px' }}
                    />
                  </div>
                </div>

                {/* Lot No Filter */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Lot Number</label>
                  <input
                    className="form-control"
                    placeholder="Filter by Lot No..."
                    value={lotFilter}
                    onChange={e => setLotFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '13px' }}
                  />
                </div>

                {/* Party Filter */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Party Name</label>
                  <select
                    className="form-control"
                    value={partyFilter}
                    onChange={e => setPartyFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '13px' }}
                  >
                    <option value="">All Parties</option>
                    {distinctParties.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Brand Filter (MultiSelectDropdown) */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Brand</label>
                  <MultiSelectDropdown
                    options={distinctBrands}
                    selectedValues={brandFilter}
                    onChange={setBrandFilter}
                    placeholder="All Brands"
                  />
                </div>

                {/* Garment Type Filter (MultiSelectDropdown) */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Garment Type</label>
                  <MultiSelectDropdown
                    options={distinctGarments}
                    selectedValues={garmentFilter}
                    onChange={setGarmentFilter}
                    placeholder="All Garments"
                  />
                </div>

                {/* Section Filter */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Section</label>
                  <select
                    className="form-control"
                    value={sectionFilter}
                    onChange={e => setSectionFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '13px' }}
                  >
                    <option value="">All Sections</option>
                    {distinctSections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Season Filter */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Season</label>
                  <select
                    className="form-control"
                    value={seasonFilter}
                    onChange={e => setSeasonFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '13px' }}
                  >
                    <option value="">All Seasons</option>
                    {distinctSeasons.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Priority</label>
                  <select
                    className="form-control"
                    value={priorityFilter}
                    onChange={e => setPriorityFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '13px' }}
                  >
                    <option value="">All Priorities</option>
                    {distinctPriorities.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Start Date Picker */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{ height: '38px', fontSize: '13px' }}
                  />
                </div>

                {/* End Date Picker */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={{ height: '38px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Remarks Checkboxes */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Remarks Category</label>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {distinctRemarks.map(remark => (
                    <label key={remark} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={selectedRemarks.has(remark)}
                        onChange={() => toggleRemark(remark)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span className={`badge ${remark === 'Colour Pending' ? 'badge-warning' : remark === 'Fabric Issue Pending' ? 'badge-danger' : remark === 'Cutting Done' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: 11, fontWeight: 700 }}>
                        {remark}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Reset & Summary Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={clearAllFilters}
                  style={{ color: 'var(--danger)', fontWeight: 600 }}
                >
                  Reset All Filters
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Filtered Lots: <strong>{cFiltered.length}</strong> of <strong>{cuttingRows.length}</strong> pending lots
                </span>
              </div>
            </div>
          </div>

          {/* Cutting Table */}
          <div className="card" style={{ border: '1px solid var(--border)', overflow: 'hidden', backgroundColor: '#ffffff' }}>
            <div className="table-wrap" style={{ border: 'none', overflowX: 'auto', margin: 0, backgroundColor: '#ffffff' }}>
              <table className="premium-table" style={{ backgroundColor: '#ffffff' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-hover)', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ width: '70px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Details</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Lot Number</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Job Order No</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Remarks / Action</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Pending Shades</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Fabric Quality</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Brand</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Garment</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Party Name</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>PO Date</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Days elapsed</th>
                    <th style={{ textAlign: 'right', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Total PCS Cut</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Cutting Table</th>
                    <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', padding: '14px 16px' }}>Cutting Date</th>
                  </tr>
                </thead>
                <tbody>
                  {cuttingLoading ? (
                    <tr>
                      <td colSpan={14} style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                          <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading Budget Index & Cutting matrix sheets...</span>
                        </div>
                      </td>
                    </tr>
                  ) : cPaginated.length === 0 ? (
                    <tr>
                      <td colSpan={14}>
                        <div className="empty-state" style={{ padding: '60px 20px' }}>
                          <div className="empty-state-icon" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}><Scissors size={32} /></div>
                          <h3 style={{ margin: '12px 0 6px 0', fontSize: 15, fontWeight: 700 }}>No Pending Action Lots</h3>
                          <p style={{ margin: 0, color: 'var(--text-muted)' }}>All current lots are either completed (Cutting Done) or match other active filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : cPaginated.map((r, idx) => {
                    const lot = String(r["Lot No"] || "").trim();
                    const pendingList = pendingListByLot[lot] || [];

                    return (
                      <tr key={`${lot}-${idx}`} className="hover-row" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => {
                              // Find matching full job order from jobOrders array
                              const fullJob = jobOrders.find(jo => {
                                const joNoMatch = String(jo['Job Order No'] || '').trim().toLowerCase() === String(r['Job Order No'] || '').trim().toLowerCase();
                                const lotMatch = String(jo['Lot Number'] || '').trim().toLowerCase() === String(r['Lot No'] || '').trim().toLowerCase();
                                return joNoMatch || (lotMatch && lot);
                              });
                              setActiveJobOrder(fullJob || r);
                            }}
                            title="View Details"
                            style={{ color: 'var(--primary)' }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => {
                              const fullJob = jobOrders.find(jo => {
                                const joNoMatch = String(jo['Job Order No'] || '').trim().toLowerCase() === String(r['Job Order No'] || '').trim().toLowerCase();
                                const lotMatch = String(jo['Lot Number'] || '').trim().toLowerCase() === String(r['Lot No'] || '').trim().toLowerCase();
                                return joNoMatch || (lotMatch && lot);
                              });
                              exportSingleJobOrderPdf(fullJob || r);
                            }}
                            disabled={pdfBusyId === r['Job Order No']}
                            title="Download PDF"
                            style={{ color: 'var(--primary)' }}
                          >
                            {pdfBusyId === r['Job Order No'] ? (
                              <RefreshCw size={14} className="spin-animation" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          <span style={{ padding: '4px 8px', borderRadius: 6, backgroundColor: 'rgba(79,70,229,0.06)', color: 'var(--primary)' }}>
                            {lot || '—'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{r["Job Order No"] || '—'}</td>
                        <td>
                          <span className={`badge ${r.Remarks.includes('Cutting Done') ? 'badge-success' :
                            r.Remarks.includes('Colour Pending') ? 'badge-warning' : 'badge-danger'
                            }`} style={{ fontSize: 11, fontWeight: 750 }}>
                            {r.Remarks}
                          </span>
                        </td>
                        <td>
                          {pendingList.length > 0 ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openPendingDialog(lot)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', color: 'var(--warning)', fontWeight: 600, border: '1px solid var(--warning)' }}
                            >
                              <Eye size={12} />
                              <span>{pendingList.length} Shades Pending</span>
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{r.Fabric || '—'}</td>
                        <td>{r.Brand || '—'}</td>
                        <td>{r["Garment Type"] || '—'}</td>
                        <td style={{ fontSize: 12 }}>{r["Party Name"] || '—'}</td>
                        <td style={{ fontSize: 12 }}>{r["PO Date"] || '—'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{r["Days after PO issue"] || '—'} days</td>
                        <td style={{ fontWeight: 700, textAlign: 'right' }}>{fmtNum(r["Total Qty"])}</td>
                        <td>
                          {r["Cutting Table"] ? (
                            <span style={{ fontSize: 12, padding: '3px 6px', borderRadius: 4, backgroundColor: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', fontWeight: 600 }}>
                              {r["Cutting Table"]}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r["Cutting Date"] || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cutting Pagination Controls */}
          {cTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '0 4px' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Page <strong>{cuttingPage}</strong> of <strong>{cTotalPages}</strong> (Filtered: {cFiltered.length} rows)
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  className="form-control"
                  style={{ width: 90, height: 32, padding: '4px 8px', fontSize: 12 }}
                  value={cuttingLimit}
                  onChange={e => { setCuttingLimit(parseInt(e.target.value)); setCuttingPage(1); }}
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCuttingPage(p => Math.max(1, p - 1))}
                  disabled={cuttingPage === 1 || cuttingLoading}
                  style={{ padding: '0 8px', height: '32px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCuttingPage(p => Math.min(cTotalPages, p + 1))}
                  disabled={cuttingPage === cTotalPages || cuttingLoading}
                  style={{ padding: '0 8px', height: '32px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================================================== */}
      {/* SHADES DIALOG (For pending colors list) */}
      {/* ==================================================== */}
      {dialogOpen && (
        <div className="modal-overlay" onClick={closeDialog} style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="modal-title" style={{ fontSize: 15, fontWeight: 800 }}>
                <Scissors size={16} style={{ color: 'var(--warning)' }} />
                <span>Pending Shades — Lot {dialogLot}</span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={closeDialog}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 12, fontWeight: 500 }}>
                The following colors are expected but have not yet been logged in the cutting matrix:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '250px', overflowY: 'auto' }}>
                {dialogShades.length === 0 ? (
                  <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 13 }}>No shades listed.</div>
                ) : dialogShades.map((shade, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--warning)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{shade}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* DETAIL MODAL DRAWER (Master List) */}
      {/* ==================================================== */}
      {activeJobOrder && (
        <div className="modal-overlay" onClick={() => setActiveJobOrder(null)} style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '18px 24px', backgroundColor: 'var(--bg-hover)' }}>
              <div className="modal-title" style={{ fontSize: 16, fontWeight: 800 }}>
                <Layers size={18} style={{ color: 'var(--primary)' }} />
                <span>Job Order Details — <span style={{ color: 'var(--primary)' }}>{activeJobOrder['Job Order No']}</span></span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setActiveJobOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '24px' }}>

              {/* Image URL Display - EMBEDDED IN IFRAME WITH FALLBACK */}
              {activeJobOrder['Image URL'] && activeJobOrder['Image URL'].startsWith('http') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Design / Reference File Preview
                    </span>
                    <a
                      href={activeJobOrder['Image URL']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                    >
                      <FileText size={13} />
                      <span>Open in New Tab</span>
                    </a>
                  </div>

                  {activeJobOrder['Image URL'].includes('drive.google.com') && (
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: 'rgba(59, 130, 246, 0.04)',
                      border: '1px solid rgba(59, 130, 246, 0.15)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <AlertTriangle size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span>
                        Note: If the preview below is blank or blocked by browser/Google policies, click <strong>Open in New Tab</strong> to view the file.
                      </span>
                    </div>
                  )}

                  <div style={{ width: '100%', height: '400px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)', backgroundColor: '#ffffff' }}>
                    <iframe
                      src={getEmbeddableUrl(activeJobOrder['Image URL'])}
                      title="Job Order Reference File"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allow="autoplay"
                    />
                  </div>
                </div>
              )}

              {/* Specs Grid */}
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Basic Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px 24px', padding: 16, backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 24 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fabric Quality</h4>
                  <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{activeJobOrder['Fabric'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Brand</h4>
                  <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{activeJobOrder['Brand'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Lot Number</h4>
                  <strong style={{ fontSize: 14, color: 'var(--success)' }}>{activeJobOrder['Lot Number'] || activeJobOrder['Lot No'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Quantity</h4>
                  <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{Number(activeJobOrder['Quantity'] || 0).toLocaleString()} {activeJobOrder['Unit'] || 'SETS'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Shades</h4>
                  <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{activeJobOrder['Shade'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Sizes</h4>
                  <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{activeJobOrder['Size'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Party Name</h4>
                  <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{activeJobOrder['Party Name'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Garment Type</h4>
                  <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{activeJobOrder['Garment Type'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pattern</h4>
                  <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{activeJobOrder['Pattern'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Style</h4>
                  <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{activeJobOrder['Style'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Section / Season</h4>
                  <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{activeJobOrder['Section'] || '—'} / {activeJobOrder['Season'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Submitted By</h4>
                  <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{activeJobOrder['Submitted By'] || '—'}</strong>
                </div>
              </div>

              {/* Cutting & Processing Details */}
              {(() => {
                const lotNum = String(activeJobOrder['Lot Number'] || activeJobOrder['Lot No'] || '').trim();
                const cutInfo = cuttingMapByLot.get(lotNum);
                if (cutInfo) {
                  const pendingShades = pendingListByLot[lotNum] || [];
                  return (
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Cutting & Processing Details</h3>
                      <div style={{ padding: '16px 20px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Cutting Status</h4>
                          <span className={`badge ${cutInfo.Remarks.includes('Cutting Done') ? 'badge-success' :
                            cutInfo.Remarks.includes('Colour Pending') ? 'badge-warning' : 'badge-danger'
                            }`} style={{ fontSize: 11, fontWeight: 700 }}>
                            {cutInfo.Remarks || '—'}
                          </span>
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Cutting Table</h4>
                          <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{cutInfo['Cutting Table'] || '—'}</strong>
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Quantity Cut</h4>
                          <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{cutInfo['Total Qty'] ? `${fmtNum(cutInfo['Total Qty'])} PCS` : '—'}</strong>
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Cutting Date</h4>
                          <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{cutInfo['Cutting Date'] || '—'}</strong>
                        </div>
                        {pendingShades.length > 0 && (
                          <div style={{ gridColumn: 'span 2' }}>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Shades</h4>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                              {pendingShades.map((shade, sIdx) => (
                                <span key={sIdx} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, backgroundColor: 'rgba(245, 158, 11, 0.08)', color: 'var(--warning)', fontWeight: 600, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                  {shade}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Trims / Design Configurations */}
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Trims & Design Accessories</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Zip Required', val: activeJobOrder['Zip'] },
                  { label: 'Bottom Type', val: activeJobOrder['Bottom Type'] },
                  { label: 'Collar Style', val: activeJobOrder['Collar'] },
                  { label: 'Bone Detail', val: activeJobOrder['Bone'] },
                  { label: 'Sticker Details', val: activeJobOrder['Sticker'] },
                  { label: 'Tape/Lace', val: activeJobOrder['Tape/Lace'] },
                  { label: 'Full Baju (Sleeve)', val: activeJobOrder['FULL BAJU'] }
                ].map(trim => (
                  <div key={trim.label} style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{trim.label}</span>
                    <strong style={{
                      fontSize: 12,
                      color: trim.val && String(trim.val).toLowerCase() !== 'no' && String(trim.val).toLowerCase() !== 'na' ? 'var(--primary)' : 'var(--text-muted)'
                    }}>{trim.val || 'NO'}</strong>
                  </div>
                ))}
              </div>

              {/* Production and Stitching */}
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Production & Embroidery Status</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Direct Stitching</h4>
                  <strong style={{ color: 'var(--text-primary)' }}>{activeJobOrder['Direct Stitching'] || 'No'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fabric Supervisor</h4>
                  <strong style={{ color: 'var(--text-primary)' }}>{activeJobOrder['FABRIC_SUPERVISOR'] || '—'}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Embroidery (Emb)</h4>
                  <strong style={{ color: 'var(--text-primary)' }}>{activeJobOrder['Emb'] || '—'} {activeJobOrder['Emb Details'] ? `(${activeJobOrder['Emb Details']})` : ''}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Printing Details</h4>
                  <strong style={{ color: 'var(--text-primary)' }}>{activeJobOrder['Printing'] || '—'} {activeJobOrder['Printing Details'] ? `(${activeJobOrder['Printing Details']})` : ''}</strong>
                </div>
              </div>

              {/* Challan JSON parse details if exists */}
              {activeJobOrder['Challan No'] && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Active Challan Information</h3>
                  <div style={{ padding: '16px 20px', background: 'rgba(16,185,129,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Challan Number: <strong style={{ color: 'var(--success)' }}>{activeJobOrder['Challan No']}</strong></span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Challan Date: <strong>{activeJobOrder['Challan Date']}</strong></span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 13, borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
                      <div>Challan Complete Lot: <strong>{activeJobOrder['Challan Complete Lot'] || 'No'}</strong></div>
                      <div>Challan Total Qty: <strong style={{ color: 'var(--text-primary)' }}>{activeJobOrder['Challan Total Qty'] || '0'} pcs</strong></div>
                      {activeJobOrder['Challan By'] && <div>Challan By: <strong>{activeJobOrder['Challan By']}</strong></div>}
                      {activeJobOrder['Challan PDF URL'] && (
                        <div>
                          <a href={activeJobOrder['Challan PDF URL']} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Download Challan PDF
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cancellation Details if Cancelled */}
              {String(activeJobOrder['Status']).toLowerCase() === 'cancelled' && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ padding: 18, background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.15)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                      <AlertTriangle size={18} />
                      <span>Cancelled Order Specifications</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, fontSize: 13, borderTop: '1px dashed rgba(239,68,68,0.15)', paddingTop: 10 }}>
                      <div>Cancellation Timestamp: <strong>{activeJobOrder['Cancellation Timestamp']}</strong></div>
                      <div>Cancelled By: <strong>{activeJobOrder['Cancelled By']}</strong></div>
                      {activeJobOrder['Cancellation Approved From'] && <div>Approved From: <strong>{activeJobOrder['Cancellation Approved From']}</strong></div>}
                      <div style={{ gridColumn: 'span 2' }}>Reason: <strong style={{ color: 'var(--text-primary)' }}>{activeJobOrder['Cancellation Reason']}</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks */}
              {activeJobOrder['Remarks'] && (
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remarks / Special Instructions</h4>
                  <p style={{ margin: 0, padding: 16, background: 'var(--surface)', borderLeft: '4px solid var(--primary)', borderRadius: '0 8px 8px 0', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                    "{activeJobOrder['Remarks']}"
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', backgroundColor: 'var(--bg-hover)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => exportSingleJobOrderPdf(activeJobOrder)}
                disabled={pdfBusyId === activeJobOrder['Job Order No']}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {pdfBusyId === activeJobOrder['Job Order No'] ? (
                  <RefreshCw size={15} className="spin-animation" />
                ) : (
                  <Download size={15} />
                )}
                <span>Download PDF</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveJobOrder(null)}>Close Specifications</button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Styling for Premium UI Feel */}
      <style>{`
        .metrics-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .metrics-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .old-inventory-card {
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-md);
          background: var(--surface);
          overflow: hidden;
          margin-top: 8px;
        }

        .premium-table {
          width: 100%;
          border-collapse: collapse;
        }

        /* Royal blue header styling */
        .premium-table thead tr {
          background: linear-gradient(135deg, #1e40af 0%, #1a56db 100%);
          color: #ffffff;
        }

        .premium-table th {
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #ffffff !important;
          background: transparent !important;
          padding: 14px 16px;
          border-bottom: 2px solid #1d4ed8;
          border-right: 1px solid var(--border);
        }

        .premium-table td {
          padding: 14px 16px;
          font-size: 13px;
          vertical-align: middle;
          border-bottom: 1px solid var(--border);
          border-right: 1px solid var(--border);
          color: #000000 !important;
        }

        .premium-table td span:not(.badge),
        .premium-table td strong,
        .premium-table td svg {
          color: #000000 !important;
        }

        /* Hide right border for last column */
        .premium-table td:last-child,
        .premium-table th:last-child {
          border-right: none;
        }

        /* Alternating row colors for premium readability */
        .premium-table tbody tr:nth-child(even) {
          background-color: rgba(248, 250, 252, 0.6);
        }

        .premium-table tbody tr:nth-child(odd) {
          background-color: var(--surface);
        }

        .hover-row:hover {
          background-color: rgba(26, 86, 219, 0.04) !important;
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Multi-select dropdown custom styling */
        .multi-select-dropdown {
          position: relative;
          width: 100%;
        }
        .multi-select-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          font-size: 13.5px;
          cursor: pointer;
          min-height: 38px;
        }
        .multi-select-trigger.disabled {
          background-color: var(--bg-hover);
          color: var(--text-muted);
          cursor: not-allowed;
        }
        .multi-select-values {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 180px;
        }
        .multi-select-values .placeholder {
          color: var(--text-muted);
        }
        .multi-select-values .selected-count {
          font-weight: 600;
          color: var(--primary);
        }
        .dropdown-arrow {
          font-size: 9px;
          color: var(--text-secondary);
        }
        .multi-select-options {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-lg);
          z-index: 150;
          max-height: 250px;
          overflow-y: auto;
          margin-top: 4px;
        }
        .multi-select-actions {
          padding: 6px 12px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
        }
        .clear-all-btn {
          background: none;
          border: none;
          color: var(--danger);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .multi-select-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 13px;
          margin: 0;
        }
        .multi-select-option:hover {
          background-color: var(--bg-hover);
        }
        .multi-select-option input {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
