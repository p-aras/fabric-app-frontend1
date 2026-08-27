import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store.js';
import { generateAndDownloadPdf as sharedGeneratePdf } from '../utils/shortagePdfGenerator.js';
import {
  FileSpreadsheet,
  AlertTriangle,
  Send,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  User,
  Hash,
  Scale,
  Percent,
  Sparkles,
  Info,
  Building2,
  Tag,
  Palette,
  TrendingDown,
  FileCheck2,
  Calculator,
  Receipt,
  ReceiptText,
  Search,
  Check,
  CheckSquare,
  Square,
  ListFilter,
  X,
  Plus,
  Download,
  Printer,
  Boxes,
  Lock
} from 'lucide-react';
import '../Design/ShortageReportForm.css';

const ShortageReportForm = () => {
  const navigate = useNavigate();

  // Current logged in user info
  const [currentUser, setCurrentUser] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    lotNumber: '',
    jobOrderNo: '',
    billNumber: '',
    fabricName: '',
    shade: '',
    tableNo: '',
    unit: 'KGs', // KGs or Mtrs
    requiredQty: '',
    billedQty: '', // Billed Qty / Invoice Weight
    issuedQty: '', // Issued Qty / Issued Weight
    issuedRolls: '',
    recdWeight: '', // Recd Weight / Actual Received Weight
    shortageQty: '', // Calculated from Issued - Recd
    shortagePercentage: '', // ((Issued - Recd) / Issued) * 100
    reason: '',
    reportedBy: '',
    date: new Date().toISOString().split('T')[0],
    issueDate: '',
    remarks: '',
    cmfParty: 'MAHARAJA PROCESSOR', // Job Processor / Party
    process: 'GERMAN FINISH'
  });

  const [loading, setLoading] = useState(false);
  const [fetchingLot, setFetchingLot] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notification, setNotification] = useState(null);

  // Multiple entries state (multi-selection)
  const [matchedEntries, setMatchedEntries] = useState([]);
  const [selectedEntryIndices, setSelectedEntryIndices] = useState([]);

  const debounceTimerRef = useRef(null);

  // Shortage reasons list
  const shortageReasons = [
    'Shrinkage / Quality Rejection',
    'Short Dispatch from Dyeing / Mill',
    'Width Shortage / Selvedge Defect',
    'Damage / Hole / Stain Marks',
    'Excess Lay Wastage',
    'Calculation Variance',
    'Pattern / Marker Layout Expansion',
    'Other'
  ];

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('twms_user') || '{}');
      if (user && user.name) {
        setCurrentUser(user);
        setFormData(prev => ({
          ...prev,
          reportedBy: prev.reportedBy || user.name
        }));
      }
    } catch (e) {
      console.error('Failed to parse user session', e);
    }
  }, []);

  // Calculate Shortage against BILLED WEIGHT (or ISSUED WEIGHT if no billed weight is entered)
  useEffect(() => {
    const issued = parseFloat(formData.issuedQty);
    const billed = parseFloat(formData.billedQty);
    const recd = parseFloat(formData.recdWeight);

    // If Billed Qty is entered, calculate shortage against Billed Qty (e.g. 150 vs 150 = 0 shortage)
    const baseQty = !isNaN(billed) && billed > 0 ? billed : issued;

    if (!isNaN(baseQty) && !isNaN(recd) && baseQty > 0) {
      const diff = baseQty - recd;
      const pct = (diff / baseQty) * 100;
      setFormData(prev => ({
        ...prev,
        shortageQty: diff > 0 ? diff.toFixed(3) : '0.000',
        shortagePercentage: diff > 0 ? pct.toFixed(2) : '0.00'
      }));
    } else if (!isNaN(baseQty) && isNaN(recd)) {
      setFormData(prev => ({
        ...prev,
        shortageQty: '',
        shortagePercentage: ''
      }));
    }
  }, [formData.issuedQty, formData.billedQty, formData.recdWeight]);

  // Derive and classify the exact Business Audit Case (Case 1, Case 2, Case 3)
  const auditScenario = React.useMemo(() => {
    const issued = parseFloat(formData.issuedQty) || 0;
    const billed = parseFloat(formData.billedQty) || (issued > 0 ? issued : 0);
    const recd = parseFloat(formData.recdWeight) || 0;

    if (issued === 0 && billed === 0 && recd === 0) return null;

    const billShortage = Math.max(0, parseFloat((billed - recd).toFixed(3)));
    const billShortagePct = billed > 0 ? parseFloat(((billShortage / billed) * 100).toFixed(2)) : 0;
    const pendingWithProcessor = Math.max(0, parseFloat((issued - billed).toFixed(3)));

    // CASE 1: Full & Equal Delivery (Issued == Billed == Recd)
    if (issued > 0 && Math.abs(issued - billed) < 0.001 && Math.abs(billed - recd) < 0.001) {
      return {
        caseType: 1,
        title: 'CASE 1: Full & Equal Delivery (Issued = Billed = Recd)',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        summary: `Issued ${issued.toFixed(3)} ${formData.unit} = Billed ${billed.toFixed(3)} ${formData.unit} = Recd ${recd.toFixed(3)} ${formData.unit}`,
        desc: '100% full material received. 0.00% shortage against invoice.',
        billShortage: 0,
        billShortagePct: 0,
        pendingWithProcessor: 0
      };
    }

    // CASE 2: Dyeing Shortage (Issued == Billed, but Recd is different)
    if (issued > 0 && Math.abs(issued - billed) < 0.001 && recd < billed) {
      return {
        caseType: 2,
        title: 'CASE 2: Dyeing Shortage / Process Loss (Issued = Billed != Recd)',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        summary: `Billed ${billed.toFixed(3)} ${formData.unit} vs Recd ${recd.toFixed(3)} ${formData.unit} -> Shortage: ${billShortage.toFixed(3)} ${formData.unit} (${billShortagePct.toFixed(2)}%)`,
        desc: 'Full lot billed by processor. Weight loss observed due to dyeing shrinkage / processor shortage.',
        billShortage,
        billShortagePct,
        pendingWithProcessor: 0
      };
    }

    // CASE 3: Partial Billing (Issued > Billed, Billed == Recd e.g. 200kg issued, 150kg billed, 150kg recd)
    if (issued > billed && Math.abs(billed - recd) < 0.001) {
      return {
        caseType: 3,
        title: 'CASE 3: Partial Bill Receipt (Issued > Billed = Recd)',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        summary: `Current Bill: ${billed.toFixed(3)} ${formData.unit} (0.00% Shortage) | Pending with Mill: ${pendingWithProcessor.toFixed(3)} ${formData.unit}`,
        desc: `Partial material received against Bill #${formData.billNumber || '—'}. Current bill has 0% loss. Remaining ${pendingWithProcessor.toFixed(3)} ${formData.unit} balance is pending with Processor.`,
        billShortage: 0,
        billShortagePct: 0,
        pendingWithProcessor
      };
    }

    // CASE 3b: Partial Billing with Shortage (Issued > Billed, Recd < Billed)
    if (issued > billed && recd < billed) {
      return {
        caseType: '3b',
        title: 'CASE 3b: Partial Bill with Dyeing Shortage (Issued > Billed != Recd)',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
        summary: `Bill Shortage: ${billShortage.toFixed(3)} ${formData.unit} (${billShortagePct.toFixed(2)}%) | Pending Balance: ${pendingWithProcessor.toFixed(3)} ${formData.unit}`,
        desc: `Partial bill of ${billed.toFixed(3)} ${formData.unit} received with ${billShortage.toFixed(3)} ${formData.unit} loss. Balance ${pendingWithProcessor.toFixed(3)} ${formData.unit} still pending with Mill.`,
        billShortage,
        billShortagePct,
        pendingWithProcessor
      };
    }

    return null;
  }, [formData.issuedQty, formData.billedQty, formData.recdWeight, formData.unit, formData.billNumber]);

  // State for fetched MySQL received weight
  const [dbRecdData, setDbRecdData] = useState(null);

  // Per-entry Receipt Status Configuration: { [idx]: { status: 'completed' | 'pending', recdRolls: number, totalRolls: number, recdWeight: number } }
  const [entryReceiptConfig, setEntryReceiptConfig] = useState({});

  // Receipt Verification Modal State
  const [receiptModal, setReceiptModal] = useState({
    isOpen: false,
    entryIndex: null,
    entry: null,
    status: 'completed', // 'completed' | 'pending'
    recdRolls: 0,
    totalRolls: 0,
    recdWeight: 0,
    fullSqlWeight: 0
  });

  // Calculate exact SQL weight corresponding to N rolls from DyeingMaterials database
  const calculateSqlWeightForRolls = (entry, rollsCount) => {
    const count = parseInt(rollsCount) || 0;
    if (!entry) return 0;
    const isRib = String(entry.fabricName || '').toUpperCase().includes('RIB');
    const totalEntryRolls = parseInt(entry.totalRolls || entry.balanceRolls || entry.issueRolls || 20) || 20;
    const entryIssuedKg = parseFloat(entry.issueQty || entry.weight || 0) || 0;

    if (count <= 0) return 0;

    if (dbRecdData?.rolls && dbRecdData.rolls.length > 0) {
      // Filter rolls for this specific fabric (RIB or Main Fabric)
      const matchingRolls = dbRecdData.rolls.filter(r => r.isRib === isRib);
      if (matchingRolls.length > 0) {
        if (count >= matchingRolls.length) {
          return parseFloat(matchingRolls.reduce((acc, r) => acc + (parseFloat(r.weight) || 0), 0).toFixed(3));
        }
        const sliced = matchingRolls.slice(0, count);
        const sum = sliced.reduce((acc, r) => acc + (parseFloat(r.weight) || 0), 0);
        return parseFloat(sum.toFixed(3));
      }
    }

    // Fallback using MySQL bifurcated weight or sheet proportion
    const fullDbWeight = isRib && dbRecdData?.ribRecdWeight > 0
      ? dbRecdData.ribRecdWeight
      : (!isRib && dbRecdData?.fabricRecdWeight > 0 ? dbRecdData.fabricRecdWeight : (dbRecdData?.totalRecdWeight || entryIssuedKg));

    if (count >= totalEntryRolls) return parseFloat(fullDbWeight.toFixed(3));
    return parseFloat(((count / totalEntryRolls) * fullDbWeight).toFixed(3));
  };

  // Combine and apply selected entries to the form
  const applyEntriesToForm = (selectedIndices, entriesList, configMap = entryReceiptConfig) => {
    const entries = entriesList || matchedEntries;
    const selected = entries.filter((_, idx) => selectedIndices.includes(idx));

    if (selected.length === 0) {
      setFormData(prev => ({
        ...prev,
        issuedQty: '',
        billedQty: '',
        issuedRolls: '',
        fabricName: '',
        shade: '',
        recdWeight: ''
        // Preserving manual billNumber entered by user
      }));
      return;
    }

    let sumIssued = 0;
    let sumBilled = 0;
    let sumRolls = 0;
    let sumRecdWeight = 0;
    let hasPartial = false;

    selected.forEach(e => {
      const idx = entries.indexOf(e);
      const conf = configMap[idx] || { status: 'completed', recdRolls: parseInt(e.totalRolls || e.balanceRolls || e.issueRolls || 20) || 20 };

      const issQty = parseFloat(e.issueQty || e.weight || 0) || 0;
      const billedQty = parseFloat(e.billedQty || e.opQty || 0) || 0;
      const totalRolls = parseInt(e.totalRolls || e.balanceRolls || e.issueRolls || 20) || 20;

      sumIssued += issQty;
      sumBilled += billedQty;

      if (conf.status === 'pending') {
        hasPartial = true;
        sumRolls += parseInt(conf.recdRolls || 0);
        const w = conf.recdWeight !== undefined ? conf.recdWeight : calculateSqlWeightForRolls(e, conf.recdRolls);
        sumRecdWeight += w;
      } else {
        sumRolls += totalRolls;
        const w = calculateSqlWeightForRolls(e, totalRolls);
        sumRecdWeight += w;
      }
    });

    const uniqueShades = [...new Set(selected.map(e => String(e.shade || '').trim()).filter(Boolean))].join(', ');
    const uniqueParties = [...new Set(selected.map(e => String(e.party || '').trim()).filter(Boolean))].join(', ');
    const uniqueFabrics = [...new Set(selected.map(e => String(e.fabricName || '').trim()).filter(Boolean))].join(', ');
    const uniqueJobOrders = [...new Set(selected.map(e => String(e.jobOrderNo || '').trim()).filter(Boolean))].join(', ');
    const firstIssueDate = selected[0]?.issueDate || '';
    const firstUnit = selected[0]?.unit || 'KGs';
    const firstProcess = selected[0]?.process || 'GERMAN FINISH';

    setFormData(prev => ({
      ...prev,
      lotNumber: selected[0]?.lotNumber || prev.lotNumber,
      jobOrderNo: uniqueJobOrders || prev.jobOrderNo,
      fabricName: uniqueFabrics || prev.fabricName,
      shade: uniqueShades || prev.shade,
      // User enters Bill Number manually; we do NOT overwrite it with Issue No.
      billNumber: prev.billNumber,
      cmfParty: uniqueParties || prev.cmfParty,
      unit: firstUnit || prev.unit,
      process: firstProcess || prev.process,
      issuedQty: sumIssued > 0 ? sumIssued.toFixed(3) : '',
      billedQty: sumBilled > 0 ? sumBilled.toFixed(3) : '',
      issuedRolls: sumRolls > 0 ? String(sumRolls) : prev.issuedRolls,
      recdWeight: sumRecdWeight > 0 ? sumRecdWeight.toFixed(3) : prev.recdWeight,
      reason: hasPartial ? 'Pending Material against Bill / Partial Delivery' : (prev.reason || 'Variance Audit'),
      issueDate: firstIssueDate || prev.issueDate || '',
      date: prev.date || new Date().toISOString().split('T')[0]
    }));
  };

  // Toggle single entry selection with prompt for Completed vs Pending
  const handleToggleEntry = (idx) => {
    if (selectedEntryIndices.includes(idx)) {
      // Deselect entry
      const nextIndices = selectedEntryIndices.filter(i => i !== idx);
      setSelectedEntryIndices(nextIndices);
      const nextConfig = { ...entryReceiptConfig };
      delete nextConfig[idx];
      setEntryReceiptConfig(nextConfig);
      applyEntriesToForm(nextIndices, matchedEntries, nextConfig);
    } else {
      // Open modal to ask if Completed or Pending against bill
      const entry = matchedEntries[idx];
      const totalR = parseInt(entry.totalRolls || entry.balanceRolls || entry.issueRolls || 20) || 20;
      const fullWeight = calculateSqlWeightForRolls(entry, totalR);

      setReceiptModal({
        isOpen: true,
        entryIndex: idx,
        entry,
        status: 'completed',
        recdRolls: totalR,
        totalRolls: totalR,
        recdWeight: fullWeight,
        fullSqlWeight: fullWeight
      });
    }
  };

  // Confirm Receipt Status Modal
  const handleConfirmReceiptModal = () => {
    const { entryIndex, entry, status, recdRolls, totalRolls } = receiptModal;
    if (entryIndex === null || !entry) return;

    const finalRolls = status === 'completed' ? totalRolls : (parseInt(recdRolls) || 1);
    const finalWeight = calculateSqlWeightForRolls(entry, finalRolls);

    const nextConfig = {
      ...entryReceiptConfig,
      [entryIndex]: {
        status,
        recdRolls: finalRolls,
        totalRolls,
        recdWeight: finalWeight,
        fullWeight: receiptModal.fullSqlWeight
      }
    };

    setEntryReceiptConfig(nextConfig);
    const nextIndices = selectedEntryIndices.includes(entryIndex)
      ? selectedEntryIndices
      : [...selectedEntryIndices, entryIndex];

    setSelectedEntryIndices(nextIndices);
    applyEntriesToForm(nextIndices, matchedEntries, nextConfig);
    setReceiptModal({ isOpen: false, entryIndex: null, entry: null, status: 'completed', recdRolls: 0, totalRolls: 0, recdWeight: 0, fullSqlWeight: 0 });
  };

  // Select all entries as Completed by default
  const handleSelectAll = () => {
    const allIndices = matchedEntries.map((_, i) => i);
    const nextConfig = {};
    matchedEntries.forEach((e, idx) => {
      const totalR = parseInt(e.totalRolls || e.balanceRolls || e.issueRolls || 20) || 20;
      const w = calculateSqlWeightForRolls(e, totalR);
      nextConfig[idx] = {
        status: 'completed',
        recdRolls: totalR,
        totalRolls: totalR,
        recdWeight: w,
        fullWeight: w
      };
    });

    setEntryReceiptConfig(nextConfig);
    setSelectedEntryIndices(allIndices);
    applyEntriesToForm(allIndices, matchedEntries, nextConfig);
  };

  // Deselect all entries
  const handleDeselectAll = () => {
    setSelectedEntryIndices([]);
    setEntryReceiptConfig({});
    applyEntriesToForm([], matchedEntries, {});
  };

  // Fetch from PendingStock Sheet & MySQL DyeingMaterials DB when lot number changes
  const fetchLotData = async (lotNoToFetch) => {
    const lot = String(lotNoToFetch || formData.lotNumber).trim();
    if (!lot) return;

    try {
      setFetchingLot(true);
      setNotification(null);
      setMatchedEntries([]);
      setSelectedEntryIndices([]);
      setEntryReceiptConfig({});

      // Query both FabricStock Google Sheet (direct via API key) and MySQL DyeingMaterials table in parallel
      const [sheetRes, dbRecdRes] = await Promise.allSettled([
        store.fetchFabricStockDirect(lot),
        store.fetchDyeingRecdWeightByLot(lot)
      ]);

      let recdWeightFound = null;
      let recdRollsFound = null;

      if (dbRecdRes.status === 'fulfilled' && dbRecdRes.value && dbRecdRes.value.success) {
        if (dbRecdRes.value.totalRecdWeight > 0) {
          recdWeightFound = dbRecdRes.value.totalRecdWeight.toFixed(3);
          recdRollsFound = dbRecdRes.value.totalRecdRolls;
          setDbRecdData(dbRecdRes.value);
        }
      }

      if (sheetRes.status === 'fulfilled' && sheetRes.value && sheetRes.value.success && Array.isArray(sheetRes.value.data) && sheetRes.value.data.length > 0) {
        const sheetData = sheetRes.value.data;
        setMatchedEntries(sheetData);

        const sourceLabel = sheetRes.value.source === 'google-sheets-api-v4' ? 'Google Sheets API v4' : 'FabricStock Sheet';
        const recdMsg = recdWeightFound ? ` & Recd Weight: ${recdWeightFound} KGs (${recdRollsFound} rolls) from DyeingMaterials DB` : '';

        if (sheetData.length === 1) {
          // If single entry found, auto-select it
          const allIndices = [0];
          setSelectedEntryIndices(allIndices);
          const totalR = parseInt(sheetData[0].totalRolls || sheetData[0].balanceRolls || sheetData[0].issueRolls || 20) || 20;
          const w = calculateSqlWeightForRolls(sheetData[0], totalR);
          const config = { 0: { status: 'completed', recdRolls: totalR, totalRolls: totalR, recdWeight: w, fullWeight: w } };
          setEntryReceiptConfig(config);
          applyEntriesToForm(allIndices, sheetData, config);

          setNotification({
            type: 'success',
            message: `Found and autofilled data from ${sourceLabel}${recdMsg} for Lot: ${lot}`
          });
        } else {
          // Multiple entries: wait for user selection, but autofill issueDate and common metadata immediately
          setSelectedEntryIndices([]);
          const firstEntry = sheetData[0];
          setFormData(prev => ({
            ...prev,
            issueDate: firstEntry.issueDate || prev.issueDate,
            cmfParty: firstEntry.cmfParty || firstEntry.party || prev.cmfParty,
            process: firstEntry.process || prev.process,
            jobOrderNo: firstEntry.jobOrderNo || prev.jobOrderNo,
            unit: firstEntry.unit || prev.unit || 'KGs',
            fabricName: firstEntry.fabricName || prev.fabricName,
            issuedQty: '',
            billedQty: '',
            issuedRolls: '',
            shortageQty: '',
            shortagePercentage: '',
            recdWeight: recdWeightFound !== null ? recdWeightFound : ''
          }));

          setNotification({
            type: 'info',
            message: `Found ${sheetData.length} entries for Lot "${lot}" in ${sourceLabel}${recdMsg}. Click an entry below to select receipt status.`
          });
        }
      } else {
        if (recdWeightFound !== null) {
          setFormData(prev => ({
            ...prev,
            recdWeight: recdWeightFound
          }));
          setNotification({
            type: 'success',
            message: `Autofilled Received Weight: ${recdWeightFound} KGs (${recdRollsFound} rolls) from MySQL DyeingMaterials DB for Lot "${lot}".`
          });
        } else {
          setNotification({
            type: 'info',
            message: `No matching records found in FabricStock sheet or DyeingMaterials DB for Lot "${lot}". You can enter details manually.`
          });
        }
      }
    } catch (err) {
      console.warn('Error fetching lot data:', err);
      setNotification({
        type: 'error',
        message: 'Could not fetch lot details: ' + err.message
      });
    } finally {
      setFetchingLot(false);
    }
  };

  const handleLotChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, lotNumber: val }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchLotData(val.trim());
      }, 700);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReset = () => {
    setFormData({
      lotNumber: '',
      jobOrderNo: '',
      billNumber: '',
      fabricName: '',
      shade: '',
      tableNo: '',
      unit: 'KGs',
      requiredQty: '',
      billedQty: '',
      issuedQty: '',
      issuedRolls: '',
      recdWeight: '',
      shortageQty: '',
      shortagePercentage: '',
      reason: '',
      reportedBy: currentUser?.name || '',
      date: new Date().toISOString().split('T')[0],
      issueDate: '',
      remarks: '',
      cmfParty: 'MAHARAJA PROCESSOR',
      process: 'GERMAN FINISH'
    });
    setMatchedEntries([]);
    setSelectedEntryIndices([]);
    setNotification(null);
    setSubmitted(false);
  };

  // --- STRUCTURED INVOICE & AUDIT PDF VIA SHARED GENERATOR ---
  const generateAndDownloadPdf = (data = formData) => {
    return sharedGeneratePdf(data, {
      matchedEntries,
      selectedEntryIndices,
      entryReceiptConfig,
      dbRecdData,
      currentUser
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotification(null);

    try {
      // Basic validation
      if (!formData.lotNumber || !formData.issuedQty || !formData.recdWeight || !formData.reason) {
        setNotification({
          type: 'error',
          message: 'Please fill in all mandatory fields: Lot Number, Issued Qty, Recd Weight, and Reason.'
        });
        setLoading(false);
        return;
      }

      // 1. Prepare payload with selected sheet entries with exact bifurcated received weights
      const selected = matchedEntries.filter((_, idx) => selectedEntryIndices.includes(idx));
      const rawSelected = selected.length > 0 ? selected : matchedEntries;
      const enrichedSelected = rawSelected.map(item => {
        const itemIdx = matchedEntries.indexOf(item);
        const conf = entryReceiptConfig[itemIdx];
        const count = conf ? (conf.status === 'pending' ? parseInt(conf.recdRolls || 0) : parseInt(item.totalRolls || item.issueRolls || 20)) : parseInt(item.totalRolls || item.issueRolls || 20);
        const itemRecdW = conf?.recdWeight !== undefined ? conf.recdWeight : calculateSqlWeightForRolls(item, count);
        return {
          ...item,
          recdRolls: count,
          recdWeight: itemRecdW,
          isPartial: conf?.status === 'pending'
        };
      });

      const payload = {
        ...formData,
        selectedEntries: enrichedSelected.length > 0 ? enrichedSelected : null,
        reportedBy: currentUser?.name || formData.reportedBy || 'Store Operator'
      };

      // 2. Save directly into MySQL ShortageReports Table
      const saveRes = await store.createShortageReport(payload);
      if (!saveRes || !saveRes.success) {
        throw new Error(saveRes?.message || 'Failed to save shortage report to database');
      }

      // 3. Generate & trigger PDF download automatically
      generateAndDownloadPdf(formData);

      const recordCount = Array.isArray(saveRes.data) ? saveRes.data.length : 1;
      const recordIds = Array.isArray(saveRes.data) ? saveRes.data.map(d => `#${d.id}`).join(', ') : `#${saveRes.data?.id || ''}`;
      setSubmitted(true);
      setNotification({
        type: 'success',
        message: `${recordCount} Shortage report classification(s) (${recordIds}) saved to database & Fabric JW Receipt PDF downloaded successfully! Shortage: ${formData.shortageQty} ${formData.unit} (${formData.shortagePercentage}%)`
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: error.message || 'An error occurred while submitting the shortage report.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Compute selected summary metrics
  const selectedEntries = matchedEntries.filter((_, idx) => selectedEntryIndices.includes(idx));
  const totalCombinedIssued = selectedEntries.reduce((acc, e) => acc + (parseFloat(e.issueQty || e.weight || 0) || 0), 0);
  const totalCombinedRolls = selectedEntries.reduce((acc, e) => acc + (parseInt(e.totalRolls || e.balanceRolls || e.issueRolls || 0) || 0), 0);

  return (
    <div className="shortage-form-wrapper">
      <div className="shortage-container">

        {/* --- Hero Banner Card (Royal Blue & White) --- */}
        <div className="shortage-hero-card">
          <div className="shortage-hero-glow-1" />
          <div className="shortage-hero-glow-2" />

          <div className="shortage-hero-content">
            <div className="shortage-hero-left">
              <div className="shortage-hero-icon-box">
                <FileCheck2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '3px 12px 3px 4px',
                    borderRadius: '20px',
                    border: '1.5px solid #FFFFFF',
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF'
                  }}>
                    <span style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: '1.5px solid #FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '12px',
                      color: '#FFFFFF',
                      background: 'rgba(0,0,0,0.25)'
                    }}>
                      6
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '11px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                      6th Report
                    </span>
                  </div>
                  <h1 className="shortage-hero-title">Shortage Report Audit (6th Report)</h1>
                  <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-white tracking-wide uppercase">
                    v2.5 Live
                  </span>
                </div>
                <p className="shortage-hero-subtitle">
                  Audits FabricStock sheet data, defect tags, MySQL roll shortages & generates standard Fabric JW Shortage PDF.
                </p>
              </div>
            </div>

            <div className="shortage-hero-actions">
              <button
                type="button"
                onClick={() => generateAndDownloadPdf(formData)}
                disabled={!formData.lotNumber || !formData.shortageQty}
                className="shortage-btn-ghost"
                title="Download Fabric JW Receipt PDF"
              >
                <Download className="w-4 h-4" />
                <span>Download JW Receipt PDF</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="shortage-btn-ghost"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset All</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- Live Interactive Loading Banner --- */}
        {fetchingLot && (
          <div className="shortage-loading-banner mb-5">
            <div className="shortage-loading-spinner-ring" />
            <div className="flex flex-col gap-0.5">
              <span className="font-extrabold text-blue-900 dark:text-blue-100 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                Fetching FabricStock Data & MySQL Dyeing Records...
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-300">
                Querying Google Sheets v4 API for Lot "{formData.lotNumber}" and checking MySQL DyeingMaterials table in parallel.
              </span>
            </div>
          </div>
        )}

        {/* --- Toast / Alerts --- */}
        {notification && (
          <div className={`shortage-alert ${notification.type === 'success'
              ? 'shortage-alert-success'
              : notification.type === 'info'
                ? 'bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800'
                : 'shortage-alert-error'
            }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
            ) : notification.type === 'info' ? (
              <Info className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* --- MULTIPLE ENTRIES SELECTION DRAWER / BANNER --- */}
        {matchedEntries.length > 1 && (
          <div className="shortage-multiple-entries-banner">
            <div className="shortage-entry-header-controls">
              <div className="flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-extrabold text-blue-950 dark:text-blue-100 text-sm">
                  Found {matchedEntries.length} Sheet Entries for Lot "{formData.lotNumber}" — Click entry to set Receipt Status:
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="shortage-btn-select-all"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All ({matchedEntries.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="shortage-btn-select-none"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Clear Selection</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMatchedEntries([])}
                  className="p-1 hover:bg-blue-200/50 rounded-lg text-slate-500 ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of Entry Cards with Checkboxes & Styled Badges */}
            <div className="shortage-entry-list">
              {matchedEntries.map((entry, idx) => {
                const isSelected = selectedEntryIndices.includes(idx);
                const conf = entryReceiptConfig[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleEntry(idx)}
                    className={`shortage-entry-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-blue-600 dark:text-blue-400 shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded font-bold text-xs font-mono">
                            #{idx + 1}
                          </span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                            {entry.fabricName || 'Fabric'} {entry.shade ? `• ${entry.shade}` : ''}
                          </span>
                          {isSelected && conf && (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 ${conf.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}>
                              {conf.status === 'pending' ? `⚠️ Partial (${conf.recdRolls}/${entry.totalRolls} rolls)` : `✓ Complete (${entry.totalRolls} rolls)`}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="shortage-entry-pill">
                            <strong>Issue No:</strong> {entry.issueNo || entry.billNumber || '—'}
                          </span>
                          <span className="shortage-entry-pill">
                            <strong>Party:</strong> {entry.party || '—'}
                          </span>
                          <span className="shortage-entry-pill">
                            <strong>Date:</strong> {entry.issueDate || '—'}
                          </span>
                          {entry.jobOrderNo && (
                            <span className="shortage-entry-pill">
                              <strong>JO:</strong> {entry.jobOrderNo}
                            </span>
                          )}
                          <span className="shortage-entry-pill">
                            <strong>Rolls:</strong> {entry.totalRolls}
                          </span>
                          <span className="shortage-entry-pill shortage-entry-pill-highlight">
                            <strong>Issued Wt:</strong> {entry.issueQty} {formData.unit}
                          </span>
                          {entry.process && (
                            <span className="shortage-entry-pill">
                              <strong>Process:</strong> {entry.process}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                          <Check className="w-3.5 h-3.5" /> Included
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:border-blue-500">
                          + Add
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Combined Totals Bar */}
            {selectedEntries.length > 0 && (
              <div className="shortage-combined-summary-box">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-bold">
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded font-mono">
                    {selectedEntries.length} of {matchedEntries.length} Selected
                  </span>
                  <span>Combined Totals Autofilled into Form:</span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Combined Issued Qty:</span>{' '}
                    <span className="font-extrabold text-blue-600 dark:text-blue-400 font-mono text-sm">
                      {totalCombinedIssued.toFixed(3) || '0.000'} {formData.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Combined Rolls:</span>{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {totalCombinedRolls}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- Main Interactive Form --- */}
        <form onSubmit={handleSubmit}>
          <div className="shortage-grid">

            {/* CARD 1: ORDER & LOT DETAILS */}
            <div className="shortage-card">
              <div className="shortage-card-header">
                <div className="shortage-card-title-group">
                  <div className="shortage-step-badge">1</div>
                  <div>
                    <h2 className="shortage-card-title">Order & Lot Details</h2>
                    <p className="shortage-card-subtitle">Fabric & Processor Metadata</p>
                  </div>
                </div>
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              {/* Lot Number Input with Search / Auto-fetch action */}
              <div className="shortage-field">
                <label className="shortage-label">
                  <span>Lot Number (FabricStock Sheet Search)</span>
                  <span className="shortage-req">*</span>
                </label>
                <div className="shortage-input-group">
                  <Hash className="w-4 h-4 shortage-input-icon" />
                  <input
                    type="text"
                    name="lotNumber"
                    value={formData.lotNumber}
                    onChange={handleLotChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        fetchLotData(formData.lotNumber);
                      }
                    }}
                    placeholder="Enter Lot No (e.g. MH-4537)"
                    required
                    className="shortage-input shortage-input-with-icon shortage-input-with-action shortage-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => fetchLotData(formData.lotNumber)}
                    disabled={fetchingLot || !formData.lotNumber}
                    className="shortage-inline-fetch-btn"
                  >
                    {fetchingLot ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Fetch</span>
                  </button>
                </div>
              </div>

              <div className="shortage-field-row">
                <div className="shortage-field">
                  <label className="shortage-label">
                    Job Processor / Party
                  </label>
                  <input
                    type="text"
                    name="cmfParty"
                    value={formData.cmfParty}
                    onChange={handleChange}
                    placeholder="e.g. MAHARAJA PROCESSOR"
                    className="shortage-input font-medium"
                  />
                </div>

                <div className="shortage-field">
                  <label className="shortage-label">
                    Process Finish
                  </label>
                  <input
                    type="text"
                    name="process"
                    value={formData.process}
                    onChange={handleChange}
                    placeholder="e.g. GERMAN FINISH"
                    className="shortage-input font-medium"
                  />
                </div>
              </div>

              <div className="shortage-field-row">
                <div className="shortage-field">
                  <label className="shortage-label">
                    Date of Issue
                  </label>
                  <input
                    type="text"
                    name="issueDate"
                    value={formData.issueDate}
                    onChange={handleChange}
                    placeholder="e.g. 2026-08-07"
                    className="shortage-input"
                  />
                </div>

                <div className="shortage-field">
                  <label className="shortage-label">
                    Date of Receipt
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="shortage-input"
                  />
                </div>
              </div>

              <div className="shortage-field">
                <label className="shortage-label">
                  Fabric Description
                </label>
                <input
                  type="text"
                  name="fabricName"
                  value={formData.fabricName}
                  onChange={handleChange}
                  placeholder="e.g. FABRIC MH FLEECE"
                  className="shortage-input font-medium"
                />
              </div>

              <div className="shortage-field-row">
                <div className="shortage-field">
                  <label className="shortage-label">
                    Shade / Color
                  </label>
                  <div className="shortage-input-group">
                    <Palette className="w-4 h-4 shortage-input-icon" />
                    <input
                      type="text"
                      name="shade"
                      value={formData.shade}
                      onChange={handleChange}
                      placeholder="e.g. OLIVE"
                      className="shortage-input shortage-input-with-icon font-medium"
                    />
                  </div>
                </div>

                <div className="shortage-field">
                  <label className="shortage-label">
                    <span>Bill Number</span>
                    {/* <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold ml-1">(User Added)</span> */}
                  </label>
                  <div className="shortage-input-group">
                    <Receipt className="w-4 h-4 shortage-input-icon text-blue-600 dark:text-blue-400" />
                    <input
                      type="text"
                      name="billNumber"
                      value={formData.billNumber}
                      onChange={handleChange}
                      placeholder="Enter Bill No (e.g. 1347)"
                      className="shortage-input shortage-input-with-icon font-mono uppercase font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="shortage-field">
                <label className="shortage-label">
                  Table No / Lay Section
                </label>
                <div className="shortage-input-group">
                  <Building2 className="w-4 h-4 shortage-input-icon" />
                  <input
                    type="text"
                    name="tableNo"
                    value={formData.tableNo}
                    onChange={handleChange}
                    placeholder="e.g. Table 2"
                    className="shortage-input shortage-input-with-icon"
                  />
                </div>
              </div>
            </div>

            {/* CARD 2: BILLED, ISSUED & RECD WEIGHT SHORTAGE CALCULATION */}
            <div className="shortage-card">
              <div className="shortage-card-header">
                <div className="shortage-card-title-group">
                  <div className="shortage-step-badge">2</div>
                  <div>
                    <h2 className="shortage-card-title">Quantity & Weight Audit</h2>
                    <p className="shortage-card-subtitle">Dual Weight & MySQL Verification</p>
                  </div>
                </div>
                <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              {/* ISSUED ROLLS & BILLED QTY ROW */}
              <div className="shortage-field-row">
                <div className="shortage-field">
                  <label className="shortage-label">
                    <div className="flex items-center gap-1.5">
                      <span>Issued Rolls</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Frozen
                      </span>
                    </div>
                    <span className="shortage-req">*</span>
                  </label>
                  <div className="shortage-input-group">
                    <Boxes className="w-4 h-4 shortage-input-icon text-slate-500" />
                    <input
                      type="number"
                      name="issuedRolls"
                      value={formData.issuedRolls}
                      readOnly
                      tabIndex={-1}
                      placeholder="e.g. 20"
                      className="shortage-input shortage-input-with-icon shortage-mono font-bold bg-slate-100/90 dark:bg-slate-800/90 cursor-not-allowed text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 select-none shadow-inner"
                    />
                  </div>
                </div>

                <div className="shortage-field">
                  <label className="shortage-label">
                    <span>Billed Qty ({formData.unit})</span>
                  </label>
                  <div className="shortage-input-group">
                    <ReceiptText className="w-4 h-4 shortage-input-icon text-slate-500" />
                    <input
                      type="number"
                      step="0.001"
                      name="billedQty"
                      value={formData.billedQty}
                      onChange={handleChange}
                      placeholder="520.350"
                      className="shortage-input shortage-input-with-icon shortage-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ISSUED QTY / WEIGHT */}
              <div className="shortage-field">
                <label className="shortage-label">
                  <div className="flex items-center gap-1.5">
                    <span>Issued Qty / Weight ({formData.unit})</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Frozen
                    </span>
                  </div>
                  <span className="shortage-req">*</span>
                </label>
                <div className="shortage-input-group">
                  <Scale className="w-4 h-4 shortage-input-icon text-slate-500" />
                  <input
                    type="number"
                    step="0.001"
                    name="issuedQty"
                    value={formData.issuedQty}
                    readOnly
                    tabIndex={-1}
                    placeholder="520.350"
                    required
                    className="shortage-input shortage-input-with-icon shortage-mono font-bold bg-slate-100/90 dark:bg-slate-800/90 cursor-not-allowed text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 select-none shadow-inner"
                  />
                </div>
              </div>

              {/* RECD WEIGHT / ACTUAL RECEIVED */}
              <div className="shortage-field">
                <label className="shortage-label">
                  <div className="flex items-center gap-1.5">
                    <span>Recd Weight / Actual Received ({formData.unit})</span>
                    {dbRecdData && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 rounded-md text-[10px] font-extrabold tracking-normal lowercase first-letter:uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        MySQL DB: {dbRecdData.totalRecdRolls} rolls
                      </span>
                    )}
                  </div>
                  <span className="shortage-req">*</span>
                </label>
                <div className="shortage-input-group">
                  <TrendingDown className="w-4 h-4 shortage-input-icon text-blue-600" />
                  <input
                    type="number"
                    step="0.001"
                    name="recdWeight"
                    value={formData.recdWeight}
                    onChange={handleChange}
                    placeholder="478.020"
                    required
                    className="shortage-input shortage-input-with-icon shortage-mono font-bold"
                  />
                </div>
              </div>

              {/* Dynamic Business Scenario Indicator (Case 1, Case 2, Case 3) */}
              {auditScenario && (
                <div className={`p-3 rounded-xl border mb-3 flex flex-col gap-1.5 ${auditScenario.badgeClass}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs tracking-wide">
                      {auditScenario.title}
                    </span>
                    {auditScenario.pendingWithProcessor > 0 && (
                      <span className="px-2 py-0.5 bg-white/80 dark:bg-slate-900/80 rounded font-mono font-bold text-[11px]">
                        Pending Mill Lot: {auditScenario.pendingWithProcessor.toFixed(3)} {formData.unit}
                      </span>
                    )}
                  </div>
                  <p className="text-xs m-0 leading-relaxed font-medium">
                    {auditScenario.desc}
                  </p>
                </div>
              )}

              {/* Dynamic Live Formula & Metric Panel */}
              <div className="shortage-metrics-panel">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-blue-200/60 dark:border-blue-800/40">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Formula: Billed ({formData.billedQty || formData.issuedQty || '0'}) - Recd ({formData.recdWeight || '0'})</span>
                  </div>
                  {parseFloat(formData.shortagePercentage) > 3.0 ? (
                    <span className="text-[10px] font-extrabold text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded">
                      ⚠️ Excess Shortage
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                      ✓ Normal Variance
                    </span>
                  )}
                </div>

                <div className="shortage-metric-row">
                  <span className="shortage-metric-label">Calculated Shortage (against Bill)</span>
                  <span className="shortage-metric-val-main">
                    {formData.shortageQty ? `${formData.shortageQty} ${formData.unit}` : `0.000 ${formData.unit}`}
                  </span>
                </div>

                <div className="shortage-metric-row">
                  <span className="shortage-metric-label">Shortage Percentage</span>
                  <span className="shortage-metric-val-badge">
                    <Percent className="w-3.5 h-3.5" />
                    {formData.shortagePercentage || '0.00'}%
                  </span>
                </div>
              </div>

              {/* Computed / Final Shortage Output Box */}
              <div className="shortage-highlight-box">
                <label className="shortage-label" style={{ color: '#1d4ed8', marginBottom: '4px' }}>
                  Final Shortage Weight ({formData.unit}) <span className="shortage-req">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  name="shortageQty"
                  value={formData.shortageQty}
                  onChange={handleChange}
                  placeholder="0.000"
                  required
                  className="shortage-input shortage-mono shortage-highlight-input"
                />
              </div>
            </div>

            {/* CARD 3: REASON & AUDIT DETAILS */}
            <div className="shortage-card">
              <div className="shortage-card-header">
                <div className="shortage-card-title-group">
                  <div className="shortage-step-badge">3</div>
                  <div>
                    <h2 className="shortage-card-title">Reason & Log Info</h2>
                    <p className="shortage-card-subtitle">Quality Audit & QC Remarks</p>
                  </div>
                </div>
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="shortage-field">
                <label className="shortage-label">
                  Shortage Category / Reason <span className="shortage-req">*</span>
                </label>
                <select
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                  className="shortage-select"
                >
                  <option value="">-- Select Root Cause --</option>
                  {shortageReasons.map((r, idx) => (
                    <option key={idx} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="shortage-field">
                <label className="shortage-label">
                  Reported / Prepared By
                </label>
                <div className="shortage-input-group">
                  <User className="w-4 h-4 shortage-input-icon" />
                  <input
                    type="text"
                    name="reportedBy"
                    value={formData.reportedBy}
                    onChange={handleChange}
                    placeholder="Operator Name"
                    className="shortage-input shortage-input-with-icon"
                  />
                </div>
              </div>

              <div className="shortage-field">
                <label className="shortage-label">
                  Investigation Remarks & Notes
                </label>
                <textarea
                  name="remarks"
                  rows={4}
                  value={formData.remarks}
                  onChange={handleChange}
                  placeholder="Enter remarks, specific roll defects, mill comments, etc..."
                  className="shortage-textarea"
                />
              </div>
            </div>

          </div>

          {/* Form Action Controls */}
          <div className="shortage-actions-footer">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="shortage-btn-secondary"
            >
              Clear Form
            </button>

            <button
              type="button"
              onClick={() => generateAndDownloadPdf(formData)}
              disabled={loading || !formData.lotNumber || !formData.shortageQty}
              className="shortage-btn-secondary"
              style={{ borderColor: '#3b82f6', color: '#2563eb' }}
            >
              <Download className="w-4 h-4" />
              <span>Download JW Receipt PDF</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="shortage-btn-primary"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Logging & Generating PDF...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Save & Download PDF</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* --- RECEIPT VERIFICATION MODAL (COMPLETED VS PENDING MATERIAL) --- */}
        {receiptModal.isOpen && receiptModal.entry && (
          <div className="shortage-modal-overlay">
            <div className="shortage-modal-card">
              <div className="shortage-modal-header">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-white" />
                    Material Receipt Verification
                  </h3>
                  <p className="text-xs text-blue-100 mt-0.5 font-medium">
                    Lot: <strong>{receiptModal.entry.lotNumber || formData.lotNumber}</strong> • {receiptModal.entry.fabricName || 'Fabric'} • {receiptModal.entry.shade || 'Shade'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptModal({ isOpen: false, entryIndex: null, entry: null, status: 'completed', recdRolls: 0, totalRolls: 0, recdWeight: 0, fullSqlWeight: 0 })}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="shortage-modal-body">
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Has the <strong>complete material</strong> against this bill been received, or is it a <strong>pending / partial delivery</strong>?
                </div>

                {/* Option 1: Complete Material Received */}
                <div
                  onClick={() => setReceiptModal(prev => ({
                    ...prev,
                    status: 'completed',
                    recdRolls: prev.totalRolls,
                    recdWeight: prev.fullSqlWeight
                  }))}
                  className={`shortage-status-choice ${receiptModal.status === 'completed' ? 'active' : ''}`}
                >
                  <div className="shortage-choice-radio">
                    {receiptModal.status === 'completed' && <div className="shortage-choice-radio-inner" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                        Complete Material Received
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-bold text-[11px]">
                        Full Delivery
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      All <strong>{receiptModal.totalRolls} rolls</strong> received. Full bill quantities and MySQL received weight (<strong>{receiptModal.fullSqlWeight} KGs</strong>) will be loaded.
                    </p>
                  </div>
                </div>

                {/* Option 2: Pending Material Against Bill */}
                <div
                  onClick={() => setReceiptModal(prev => {
                    const defaultRolls = prev.recdRolls > 0 && prev.recdRolls < prev.totalRolls ? prev.recdRolls : Math.max(1, Math.floor(prev.totalRolls / 2));
                    const w = calculateSqlWeightForRolls(prev.entry, defaultRolls);
                    return {
                      ...prev,
                      status: 'pending',
                      recdRolls: defaultRolls,
                      recdWeight: w
                    };
                  })}
                  className={`shortage-status-choice ${receiptModal.status === 'pending' ? 'active' : ''}`}
                >
                  <div className="shortage-choice-radio">
                    {receiptModal.status === 'pending' && <div className="shortage-choice-radio-inner" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                        Pending Material Against Bill
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded font-bold text-[11px]">
                        Partial Delivery
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Only partial rolls received so far. Specify received rolls below; weight is automatically fetched from MySQL database.
                    </p>

                    {/* Pending Rolls Input Stepper (Visible when Pending is selected) */}
                    {receiptModal.status === 'pending' && (
                      <div className="shortage-stepper-box" onClick={e => e.stopPropagation()}>
                        <div className="shortage-stepper-label-row">
                          <label className="shortage-stepper-label">
                            Count of Rolls Received:
                          </label>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Total: {receiptModal.totalRolls} Rolls
                          </span>
                        </div>

                        <div className="shortage-stepper-controls">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(1, parseInt(receiptModal.recdRolls || 1) - 1);
                              const w = calculateSqlWeightForRolls(receiptModal.entry, next);
                              setReceiptModal(p => ({ ...p, recdRolls: next, recdWeight: w }));
                            }}
                            className="shortage-stepper-btn"
                            title="Decrease rolls"
                          >
                            −
                          </button>

                          <input
                            type="number"
                            min="1"
                            max={receiptModal.totalRolls}
                            value={receiptModal.recdRolls}
                            onChange={(e) => {
                              const val = Math.min(receiptModal.totalRolls, Math.max(1, parseInt(e.target.value) || 1));
                              const w = calculateSqlWeightForRolls(receiptModal.entry, val);
                              setReceiptModal(p => ({ ...p, recdRolls: val, recdWeight: w }));
                            }}
                            className="shortage-stepper-input"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.min(receiptModal.totalRolls, parseInt(receiptModal.recdRolls || 1) + 1);
                              const w = calculateSqlWeightForRolls(receiptModal.entry, next);
                              setReceiptModal(p => ({ ...p, recdRolls: next, recdWeight: w }));
                            }}
                            className="shortage-stepper-btn"
                            title="Increase rolls"
                          >
                            +
                          </button>

                          <span className="shortage-stepper-total-text">
                            out of <strong>{receiptModal.totalRolls} total rolls</strong>
                          </span>
                        </div>

                        {/* Live SQL Weight Calculation Preview */}
                        <div className="shortage-sql-preview-bar">
                          <span className="shortage-sql-preview-label">Weight from MySQL:</span>
                          <span className="shortage-sql-preview-val">
                            {receiptModal.recdWeight} KGs ({receiptModal.recdRolls} rolls)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="shortage-modal-footer">
                <button
                  type="button"
                  onClick={() => setReceiptModal({ isOpen: false, entryIndex: null, entry: null, status: 'completed', recdRolls: 0, totalRolls: 0, recdWeight: 0, fullSqlWeight: 0 })}
                  className="shortage-btn-secondary py-2 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReceiptModal}
                  className="shortage-btn-primary py-2 px-5 text-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Populate Form</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ShortageReportForm;
