import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { store, BASE_URL } from '../store.js';
import LocationPicker from '../components/LocationPicker.jsx';
import {
  Printer, Play, Square, RotateCcw,
  AlertTriangle, AlertCircle, CheckCircle, Box, Hourglass, FileText
} from 'lucide-react';

const MaterialAgainstPoForm = () => {
  const navigate = useNavigate();

  // Get logged in user data
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Main Form Data
  const [formData, setFormData] = useState({
    poNumber: '',
    cmfName: '',
    fabricName: '',
    group: '',
    shade: '',
    weight: '', // will store meters in database weight column
    lotNumber: '',
    billNumber: '',
    location: '',
    receivedPerson: '',
    authorizedPerson: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Manual Meters Input
  const [manualMeters, setManualMeters] = useState('');

  // PO Items from Google Sheet
  const [poItems, setPoItems] = useState([]);
  const [isFetchingPo, setIsFetchingPo] = useState(false);

  // Fetch PO Details from backend sheet endpoint
  const fetchPoDetailsFromSheet = async () => {
    const poNum = formData.poNumber.trim();
    if (!poNum) {
      showNotification('Please enter a PO number first', 'warning');
      return;
    }

    setIsFetchingPo(true);
    try {
      const res = await fetch(`${BASE_URL}/po/details/${encodeURIComponent(poNum)}`);
      if (!res.ok) {
        throw new Error('PO not found or spreadsheet error');
      }
      const data = await res.json();
      if (data.success && data.items.length > 0) {
        setPoItems(data.items);
        showNotification(`✓ Loaded ${data.items.length} items from PO spreadsheet`, 'success');
        updateInstruction(`Select an item from the PO list below to auto-populate fields.`, 'info');
      } else {
        setPoItems([]);
        showNotification('No items found for this PO number', 'warning');
      }
    } catch (e) {
      console.error(e);
      showNotification('Failed to fetch PO details from Google Sheet', 'error');
      setPoItems([]);
    } finally {
      setIsFetchingPo(false);
    }
  };

  const handleSelectPoItem = (item) => {
    setFormData(prev => ({
      ...prev,
      fabricName: item.description,
      group: item.uom || item.department || 'MTR',
      shade: '', // user fills manually
    }));
    showNotification(`✓ Selected item: ${item.description}`, 'info');
  };


  // Batch processing states
  const [totalRollsInBatch, setTotalRollsInBatch] = useState(1);
  const [currentRollNumber, setCurrentRollNumber] = useState(0);
  const [completedRolls, setCompletedRolls] = useState([]);
  const [batchActive, setBatchActive] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPrintedRoll, setLastPrintedRoll] = useState(null);

  // UI Instructions
  const [uiInstruction, setUiInstruction] = useState('Fill in PO and item details, set rolls quantity, and start the batch.');
  const [instructionType, setInstructionType] = useState('info');

  // Step indicators state
  const [activeSteps, setActiveSteps] = useState({
    step1: false, // Fill Form Details
    step2: false, // Set Total Rolls
    step3: false, // Start Batch
    step4: false, // Enter Meters & Print
    step5: false  // Complete
  });

  // Batch info data
  const [batchNumber, setBatchNumber] = useState('');
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchTime, setBatchTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  // Sequential barcode tracking
  const [nextBarcodeId, setNextBarcodeId] = useState(null);
  const [barcodeSequence, setBarcodeSequence] = useState({
    current: 0,
    next: 1,
    lastGenerated: null
  });
  const [isLoadingSequence, setIsLoadingSequence] = useState(true);

  // Print service states
  const [printServiceStatus, setPrintServiceStatus] = useState('connecting');
  const wsRef = useRef(null);
  const [wsReady, setWsReady] = useState(false);

  // Network offline queue states
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((msg, type = 'info') => {
    setNotification({ text: msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  }, []);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch sequential barcode status on load & network status updates
  useEffect(() => {
    fetchNextSequenceNumber();
    checkNetworkStatus();
    checkPrintServiceStatus();

    // Reload stored queue if exists
    const storedQueue = localStorage.getItem('material_offline_queue');
    if (storedQueue) {
      try {
        setOfflineQueue(JSON.parse(storedQueue));
      } catch (e) {
        console.error('Error loading stored offline queue:', e);
      }
    }

    const interval = setInterval(checkNetworkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Sync offline queue when online status changes to true
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline]);

  // Read user data
  useEffect(() => {
    const userData = localStorage.getItem('twms_user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setLoggedInUser(parsed);
        // Pre-fill received by default
        setFormData(prev => ({
          ...prev,
          receivedPerson: parsed.name || '',
          authorizedPerson: 'Sahil Sir'
        }));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Check network/backend status
  const checkNetworkStatus = async () => {
    if (isCheckingNetwork) return;
    setIsCheckingNetwork(true);
    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${BASE_URL}/stats`, { signal: ctrl.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        setIsOnline(true);
      } else {
        setIsOnline(true); // fallback
      }
    } catch (err) {
      setIsOnline(false);
    } finally {
      setIsCheckingNetwork(false);
    }
  };

  // Stub for print service status check
  const checkPrintServiceStatus = () => {};

  // Connect to Local Python Print Service via WebSocket
  useEffect(() => {
    let wsHost = 'localhost';
    const WS_URL = `ws://${wsHost}:8765`;
    let reconnectTimeout = null;
    let connectionTimeout = null;

    const connectWS = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      console.log('🔌 [PO Print] Connecting to print service at:', WS_URL);
      
      connectionTimeout = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
          setPrintServiceStatus('error');
        }
      }, 5000);

      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ [PO Print] WebSocket connection established');
        setPrintServiceStatus('connected');
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'auth',
            token: 'fabric-print-secret-key-2024'
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          switch (response.type) {
            case 'auth_success':
              setPrintServiceStatus('ready');
              setWsReady(true);
              break;
            case 'auth_failed':
              setPrintServiceStatus('error');
              setWsReady(false);
              break;
            case 'print_result':
              if (response.success) {
                showNotification(`✓ Sticker printed successfully!`, 'success');
              } else {
                showNotification(`✗ Print failed: ${response.message}`, 'error');
              }
              break;
            default:
              console.log('[PO Print] Message:', response);
          }
        } catch (error) {
          console.error(error);
        }
      };

      wsRef.current.onclose = () => {
        clearTimeout(connectionTimeout);
        setPrintServiceStatus('disconnected');
        setWsReady(false);
        reconnectTimeout = setTimeout(connectWS, 4000);
      };

      wsRef.current.onerror = (err) => {
        console.error('[PO Print] WS Error:', err);
      };
    };

    connectWS();

    return () => {
      clearTimeout(reconnectTimeout);
      clearTimeout(connectionTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Sync offline items
  const syncOfflineQueue = async () => {
    const queue = [...offlineQueue];
    let successCount = 0;

    for (let i = 0; i < queue.length; i++) {
      const payload = queue[i];
      try {
        const response = await fetch(`${BASE_URL}/google-sheets/store-fabric-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          successCount++;
        } else {
          console.warn('Failed to sync queue item:', payload.barcodeId);
          break;
        }
      } catch (err) {
        console.error('Network error while syncing queue item:', err);
        break; 
      }
    }

    const remaining = queue.slice(successCount);
    setOfflineQueue(remaining);
    localStorage.setItem('material_offline_queue', JSON.stringify(remaining));

    if (successCount > 0) {
      showNotification(`✓ Synced ${successCount} offline records successfully!`, 'success');
    }
  };

  // Fetch sequence info from DB
  const fetchNextSequenceNumber = async () => {
    setIsLoadingSequence(true);
    try {
      const response = await fetch(`${BASE_URL}/google-sheets/next-barcode-id?type=po`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to retrieve sequence number');
      const data = await response.json();

      if (data.success && data.data) {
        const seqData = data.data;
        setNextBarcodeId(seqData.barcodeId);
        setBarcodeSequence({
          current: seqData.lastId || 0,
          next: seqData.numericId,
          lastGenerated: seqData.barcodeId
        });
      }
    } catch (error) {
      console.error('Error fetching sequential barcode id:', error);
      const fallbackSeq = Math.floor(8000000 + Math.random() * 999999);
      setNextBarcodeId(String(fallbackSeq));
    } finally {
      setIsLoadingSequence(false);
    }
  };

  // Form Validation checks
  const isFormValid = () => {
    return (
      formData.poNumber.trim() !== '' &&
      formData.cmfName.trim() !== '' &&
      formData.fabricName.trim() !== '' &&
      formData.group.trim() !== '' &&
      formData.shade.trim() !== '' &&
      formData.lotNumber.trim() !== '' &&
      formData.billNumber.trim() !== '' &&
      formData.location.trim() !== '' &&
      formData.receivedPerson.trim() !== '' &&
      formData.authorizedPerson.trim() !== ''
    );
  };

  // Update instruction banner helper
  const updateInstruction = (text, type = 'info') => {
    setUiInstruction(text);
    setInstructionType(type);
  };

  // Step progression evaluator
  const evaluateSteps = () => {
    const updated = { ...activeSteps };

    updated.step1 = isFormValid();
    updated.step2 = totalRollsInBatch > 0;
    updated.step3 = batchActive;
    updated.step4 = batchActive && manualMeters.trim() !== '';
    updated.step5 = batchActive && currentRollNumber >= totalRollsInBatch;

    setActiveSteps(updated);
  };

  useEffect(() => {
    evaluateSteps();
  }, [formData, totalRollsInBatch, batchActive, manualMeters, currentRollNumber]);

  // Submit and Sync Roll Details
  const saveRollData = async (data, rollNumber) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const API_URL = `${BASE_URL}/google-sheets/store-fabric-data`;

      const payload = {
        barcodeId: data.uniqueBarcodeId,
        batchNumber: batchNumber,
        batchDate: batchDate,
        batchTime: batchTime,
        cmfName: data.cmfName,
        fabricName: data.fabricName,
        shade: data.shade,
        lotNumber: data.lotNumber,
        group: data.group || '',
        billNumber: data.billNumber || formData.billNumber || '',
        date: data.date || new Date().toISOString().split('T')[0],
        location: data.location || '',
        receivedPerson: data.receivedPerson || '',
        authorizedPerson: data.authorizedPerson || '',
        rollNumber: rollNumber,
        batchTotal: data.totalRolls || totalRollsInBatch,
        batchStatus: 'completed',
        weight: data.weight, // manual meters value stored in weight column
        generatedAt: data.generatedAt || new Date().toLocaleTimeString(),
        timestamp: data.timestamp || new Date().toISOString(),
        status: 'in_stock',
        poNumber: data.poNumber,
        unit: 'MTR' // save as MTR
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseData = await response.json();

      if (responseData.success && isMounted.current) {
        showNotification(`✓ Roll ${rollNumber} saved (Barcode: ${data.uniqueBarcodeId})`, 'success');
        return true;
      }
      return false;

    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`❌ OFFLINE WARNING: Saving locally. Error:`, error.message);

      const offlinePayload = {
        barcodeId: data.uniqueBarcodeId,
        batchNumber: batchNumber,
        batchDate: batchDate,
        batchTime: batchTime,
        cmfName: data.cmfName,
        fabricName: data.fabricName,
        shade: data.shade,
        lotNumber: data.lotNumber,
        group: data.group || '',
        billNumber: data.billNumber || formData.billNumber || '',
        date: data.date || new Date().toISOString().split('T')[0],
        location: data.location || '',
        receivedPerson: data.receivedPerson || '',
        authorizedPerson: data.authorizedPerson || '',
        rollNumber: rollNumber,
        batchTotal: data.totalRolls || totalRollsInBatch,
        batchStatus: 'completed',
        weight: data.weight,
        generatedAt: data.generatedAt || new Date().toLocaleTimeString(),
        timestamp: data.timestamp || new Date().toISOString(),
        status: 'in_stock',
        poNumber: data.poNumber,
        unit: 'MTR'
      };

      const updatedQueue = [...offlineQueue, offlinePayload];
      setOfflineQueue(updatedQueue);
      localStorage.setItem('material_offline_queue', JSON.stringify(updatedQueue));

      showNotification(`💾 Saved Offline (${updatedQueue.length} items pending sync)`, 'warning');
      return true;
    }
  };

  // Send Print Sticker Command via Python WebSocket Service
  const sendPrintStickerRequest = async (rollData) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      showNotification('Print service not connected. Please check if print_service.py is running.', 'error');
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify({
        type: 'print',
        data: {
          cmfName: rollData.cmfName,
          fabricName: rollData.fabricName,
          group: rollData.group,
          shade: rollData.shade,
          weight: rollData.weight, // meters
          lotNumber: rollData.lotNumber,
          billNumber: rollData.billNumber,
          date: rollData.date,
          location: rollData.location,
          receivedPerson: rollData.receivedPerson,
          authorizedPerson: rollData.authorizedPerson,
          rollNumber: rollData.rollNumber,
          totalRolls: rollData.totalRolls,
          uniqueBarcodeId: rollData.uniqueBarcodeId,
          unit: 'MTR', // unit is MTR
          poNumber: rollData.poNumber
        }
      }));
      return true;
    } catch (error) {
      showNotification('Failed to send print job.', 'error');
      return false;
    }
  };

  // Manual Meters Save and Print Action
  const handleManualSaveAndPrint = async () => {
    if (!manualMeters || parseFloat(manualMeters) <= 0) {
      showNotification('Please enter a valid meters value', 'warning');
      return;
    }
    if (!isFormValid()) {
      showNotification('Please fill in all form details first', 'warning');
      return;
    }
    if (!batchActive) {
      showNotification('Please start the batch scan process first to lock details', 'warning');
      return;
    }

    const metersVal = parseFloat(manualMeters).toFixed(2);
    setIsProcessing(true);

    const rollNo = currentRollNumber + 1;
    const nextVal = barcodeSequence.next + (rollNo - 1);
    const barcodeStr = String(nextVal).padStart(6, '0');

    const rollData = {
      uniqueBarcodeId: barcodeStr,
      cmfName: formData.cmfName,
      fabricName: formData.fabricName,
      shade: formData.shade,
      lotNumber: formData.lotNumber,
      group: formData.group,
      billNumber: formData.billNumber,
      date: formData.date,
      location: formData.location,
      receivedPerson: formData.receivedPerson,
      authorizedPerson: formData.authorizedPerson,
      weight: metersVal, // Store meters in weight column
      rollNumber: rollNo,
      totalRolls: totalRollsInBatch,
      generatedAt: new Date().toLocaleTimeString(),
      timestamp: new Date().toISOString(),
      poNumber: formData.poNumber,
      unit: 'MTR'
    };

    console.log(`🏷️ Printing Roll #${rollNo} against PO: ${formData.poNumber} | Meters: ${metersVal} | Barcode: ${barcodeStr}`);

    const printSuccess = await sendPrintStickerRequest(rollData);
    const saveSuccess = await saveRollData(rollData, rollNo);

    if (saveSuccess) {
      setCompletedRolls(prev => [...prev, rollData]);
      setLastPrintedRoll(rollNo);
      setManualMeters(''); // Clear input for next roll

      if (rollNo >= totalRollsInBatch) {
        setCurrentRollNumber(totalRollsInBatch);
        updateInstruction('🎉 Batch Completed successfully!', 'success');
        showNotification('Batch completed successfully!', 'success');
        completeBatchRun();
        fetchNextSequenceNumber();
      } else {
        setCurrentRollNumber(rollNo);
        updateInstruction(`✓ Roll #${rollNo} saved. Enter meters for Roll #${rollNo + 1}`, 'info');
      }
    } else {
      updateInstruction('❌ Database sync failed. Press retry or bypass.', 'warning');
    }

    setIsProcessing(false);
  };

  // Start Batch Controls
  const startBatchProcess = () => {
    if (!isFormValid()) {
      showNotification('Please fill in all form details first', 'warning');
      return;
    }

    if (totalRollsInBatch <= 0) {
      showNotification('Please set a valid rolls quantity', 'warning');
      return;
    }

    fetchNextSequenceNumber();

    const nextBatchNo = `BTCH-${Date.now().toString().slice(-6)}`;
    setBatchNumber(nextBatchNo);
    setBatchDate(new Date().toISOString().split('T')[0]);
    setBatchTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    setBatchActive(true);
    setCurrentRollNumber(0);
    setCompletedRolls([]);
    setLastPrintedRoll(null);

    updateInstruction(`Batch ${nextBatchNo} active. Enter meters for Roll #1 and press ENTER or click Save.`, 'info');
  };

  // Complete Batch Controls
  const completeBatchRun = async () => {
    try {
      await fetch(`${BASE_URL}/batch/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchNumber })
      });
    } catch (e) {}

    setBatchActive(false);
    fetchNextSequenceNumber();
  };

  // Stop Batch early
  const stopBatchEarly = async () => {
    setShowStopConfirm(false);
    updateInstruction('⚠️ Batch stopped early by operator.', 'warning');
    await completeBatchRun();
    setBatchActive(false);
    showNotification('Batch stopped.', 'info');
  };

  // Reset form values
  const resetFormFields = () => {
    if (batchActive) return;

    setFormData({
      poNumber: '',
      cmfName: '',
      fabricName: '',
      group: '',
      shade: '',
      weight: '',
      lotNumber: '',
      billNumber: '',
      location: '',
      receivedPerson: loggedInUser?.name || '',
      authorizedPerson: 'Sahil Sir',
      date: new Date().toISOString().split('T')[0]
    });
    setCompletedRolls([]);
    setManualMeters('');
    updateInstruction('Form reset. Fill details to start batch again.', 'info');
  };

  const handleInputChange = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 40px',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      backgroundColor: '#fff',
      color: '#1e293b'
    }}>
      {/* Floating Active Progress Panel */}
      {batchActive && (
        <div style={{
          position: 'fixed', right: 32, top: 120, width: 320, zIndex: 100,
          background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(79, 70, 229, 0.15)', borderRadius: 24,
          padding: '24px 20px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ background: '#eef2ff', padding: 8, borderRadius: 10, color: '#4f46e5' }}>
              <Box size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: '900', color: '#0f172a' }}>Batch Progress</h3>
          </div>
          
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 13, fontWeight: '800', color: '#4f46e5' }}>{batchNumber}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Date: {batchDate} · Time: {batchTime}</div>
          </div>

          <div style={{ background: '#eef2ff', border: '1.5px dashed rgba(79, 70, 229, 0.25)', padding: 12, borderRadius: 12, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: '850', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next Barcode ID</div>
            <div style={{ fontSize: 22, fontWeight: '900', color: '#312e81', letterSpacing: '1px', marginTop: 4 }}>{nextBarcodeId || '------'}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              <span>Progress Tracker</span>
              <span>{currentRollNumber} / {totalRollsInBatch} rolls</span>
            </div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                width: `${Math.min(100, Math.max(0, (currentRollNumber / totalRollsInBatch) * 100))}%`,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, background: '#f0fdf4', padding: '10px 8px', borderRadius: 10, textAlign: 'center', border: '1px solid #dcfce7', color: '#15803d', fontSize: 11, fontWeight: '700' }}>
              Completed: {currentRollNumber}
            </div>
            <div style={{ flex: 1, background: '#fffbeb', padding: '10px 8px', borderRadius: 10, textAlign: 'center', border: '1px solid #fef3c7', color: '#b45309', fontSize: 11, fontWeight: '700' }}>
              Remaining: {Math.max(0, totalRollsInBatch - currentRollNumber)}
            </div>
          </div>

          <button onClick={() => setShowStopConfirm(true)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 0', border: 'none', borderRadius: 12, background: '#fee2e2', color: '#dc2626',
            fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fca5a5'}
          onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
          >
            <Square size={14} /> Stop & Cancel Batch
          </button>
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', border: '1px solid rgba(79, 70, 229, 0.15)', padding: 12, borderRadius: 16, color: '#4f46e5' }}>
            <FileText size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.75px' }}>
              Add Material Against PO (Meters)
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 4, marginBottom: 0, fontWeight: 500 }}>
              Verify Purchase Order details and enter fabric roll measurements manually in meters.
            </p>
          </div>
        </div>
      </div>

      {/* System Status Indicators */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        background: '#fff', padding: '12px 24px', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', fontWeight: '700', color: '#475569' }}>
            <Printer size={16} /> Printer:
            <span style={{
              padding: '3px 10px', borderRadius: 12, fontSize: '11px', fontWeight: '800',
              background: printServiceStatus === 'ready' ? '#f0fdf4' : '#fee2e2',
              color: printServiceStatus === 'ready' ? '#16a34a' : '#dc2626',
              border: `1px solid ${printServiceStatus === 'ready' ? '#bbf7d0' : '#fca5a5'}`
            }}>
              {printServiceStatus === 'ready' ? 'Ready' : 'Not Connected'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', fontWeight: '700', color: '#475569' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isOnline ? '#10b981' : '#ef4444',
              boxShadow: `0 0 8px ${isOnline ? '#10b981' : '#ef4444'}`
            }} />
            <span style={{ color: '#475569' }}>
              {isCheckingNetwork ? 'Checking Network...' : isOnline ? 'Network OK' : 'Local Mode Only'}
            </span>
            {offlineQueue.length > 0 && (
              <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '10px', padding: '1px 6px', borderRadius: 10, fontWeight: '800' }}>
                {offlineQueue.length} queue
              </span>
            )}
          </div>
        </div>

        {notification && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: notification.type === 'success' ? '#f0fdf4' : '#fffbeb',
            color: notification.type === 'success' ? '#15803d' : '#b45309',
            padding: '4px 14px', borderRadius: 12, border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fef3c7'}`,
            fontSize: '12px', fontWeight: '700', animation: 'pulse 1.5s infinite'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: notification.type === 'success' ? '#10b981' : '#f59e0b' }} />
            <span>{notification.text}</span>
          </div>
        )}
      </div>

      {/* Guide Banner */}
      {uiInstruction && (
        <div style={{
          background: instructionType === 'success' ? '#f0fdf4' : instructionType === 'warning' ? '#fffbeb' : '#eff6ff',
          borderLeft: `5px solid ${instructionType === 'success' ? '#10b981' : instructionType === 'warning' ? '#f59e0b' : '#3b82f6'}`,
          borderRadius: 12, padding: '14px 20px', marginBottom: 28, display: 'flex', gap: 10, alignItems: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.01)'
        }}>
          <span style={{ fontSize: 18 }}>
            {instructionType === 'success' ? '✓' : instructionType === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <span style={{ fontSize: '13.5px', color: '#1e293b', fontWeight: '700' }}>{uiInstruction}</span>
        </div>
      )}

      {/* Form Split Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Side Column: Manual Meters entry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Manual Meters Entry Card */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
            padding: 28, boxShadow: '0 10px 25px rgba(0,0,0,0.02)'
          }}>
            <h4 style={{ margin: '0 0 20px 0', fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', fontWeight: '900' }}>Manual Meters Input</h4>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: 8 }}>
                Roll Meters Value (Meters)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter meters (e.g. 120.5)"
                value={manualMeters}
                onChange={e => setManualMeters(e.target.value)}
                disabled={!batchActive}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleManualSaveAndPrint();
                  }
                }}
                style={{
                  width: '100%', padding: '14px 16px', border: '2px solid #cbd5e1',
                  borderRadius: 12, fontSize: '18px', color: '#1e293b', outline: 'none',
                  fontWeight: '800', boxSizing: 'border-box', background: !batchActive ? '#f1f5f9' : '#fff',
                  textAlign: 'center', letterSpacing: '0.5px', transition: 'border-color 0.2s'
                }}
                onFocus={e => { if(batchActive) e.target.style.borderColor = '#4f46e5'; }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1'; }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                {!batchActive ? '⚠️ Start the batch scan below to enable measurements input.' : '💡 Type meters and press ENTER to print sticker & save roll.'}
              </p>
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                onClick={handleManualSaveAndPrint}
                disabled={isProcessing || !batchActive || !manualMeters || parseFloat(manualMeters) <= 0}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 0', borderRadius: 12, border: 'none',
                  background: (!batchActive || !manualMeters || parseFloat(manualMeters) <= 0) ? '#e2e8f0' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: (!batchActive || !manualMeters || parseFloat(manualMeters) <= 0) ? '#94a3b8' : '#fff',
                  fontWeight: '850', fontSize: '14px', cursor: (!batchActive || !manualMeters || parseFloat(manualMeters) <= 0) ? 'not-allowed' : 'pointer',
                  boxShadow: (!batchActive || !manualMeters || parseFloat(manualMeters) <= 0) ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                <Printer size={16} /> Save Roll & Print Sticker (Mtrs)
              </button>
            </div>
          </div>

          {/* Workflow progress timeline */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
            padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.02)'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', fontWeight: '900' }}>Workflow Steps</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { active: activeSteps.step1, num: '1', label: 'Fill Form Details (All fields are required)' },
                { active: activeSteps.step2, num: '2', label: 'Set Total Rolls quantity' },
                { active: activeSteps.step3, num: '3', label: 'Click "Start Batch" to lock details' },
                { active: activeSteps.step4, num: '4', label: 'Enter roll meters & print sticker' },
                { active: activeSteps.step5, num: '5', label: 'Complete batch' },
              ].map((step, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 12, background: step.active ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${step.active ? '#bbf7d0' : '#e2e8f0'}`,
                  transition: 'all 0.2s'
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', background: step.active ? '#10b981' : '#cbd5e1',
                    color: '#fff', fontSize: '11px', fontWeight: '900'
                  }}>
                    {step.active ? '✓' : step.num}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: step.active ? '#15803d' : '#475569' }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Batch controls */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
            padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.02)'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', fontWeight: '900' }}>Batch Control Panel</h4>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: 6 }}>Total Rolls in Batch</label>
                <input
                  type="number"
                  value={totalRollsInBatch === '' ? '' : totalRollsInBatch}
                  onChange={e => {
                    const val = e.target.value;
                    setTotalRollsInBatch(val === '' ? '' : Math.max(1, parseInt(val) || 1));
                  }}
                  disabled={batchActive}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                    borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                    fontWeight: '700', background: batchActive ? '#f1f5f9' : '#fff'
                  }}
                />
              </div>

              {!batchActive ? (
                <button
                  type="button"
                  onClick={startBatchProcess}
                  disabled={!isFormValid()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '11px 20px', borderRadius: 12, border: 'none',
                    background: isFormValid() ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0',
                    color: isFormValid() ? '#fff' : '#94a3b8',
                    cursor: isFormValid() ? 'pointer' : 'not-allowed',
                    boxShadow: isFormValid() ? '0 4px 12px rgba(16,185,129,0.25)' : 'none',
                    fontWeight: '800', fontSize: '13px', height: '40px', boxSizing: 'border-box'
                  }}
                >
                  <Play size={14} /> Start Batch
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowStopConfirm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '11px 20px', borderRadius: 12, border: 'none',
                    background: '#fee2e2', color: '#dc2626',
                    cursor: 'pointer', fontWeight: '800', fontSize: '13px',
                    height: '40px', boxSizing: 'border-box'
                  }}
                >
                  <Square size={14} /> Stop Batch
                </button>
              )}

              <button
                type="button"
                onClick={resetFormFields}
                disabled={batchActive}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 16px', borderRadius: 12, border: '1px solid #cbd5e1',
                  background: '#fff', color: '#475569',
                  cursor: batchActive ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '13px',
                  height: '40px', boxSizing: 'border-box'
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>

          {/* Form details card */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
            padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.02)'
          }}>
            <h4 style={{ margin: '0 0 18px 0', fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', fontWeight: '900' }}>Roll Metadata Details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>PO Number <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      value={formData.poNumber}
                      onChange={e => handleInputChange('poNumber', e.target.value)}
                      disabled={batchActive}
                      placeholder="e.g. PO-20251028-5328"
                      style={{
                        width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                        borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                        fontWeight: '700', boxSizing: 'border-box', background: batchActive ? '#f1f5f9' : '#fff'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchPoDetailsFromSheet}
                    disabled={batchActive || isFetchingPo}
                    style={{
                      padding: '10px 16px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      color: '#fff', fontWeight: '800', fontSize: '12px', cursor: 'pointer',
                      height: '40px', boxSizing: 'border-box', transition: 'all 0.25s',
                      boxShadow: '0 2px 6px rgba(79,70,229,0.15)'
                    }}
                  >
                    {isFetchingPo ? 'Fetching...' : 'Fetch Details'}
                  </button>
                </div>

                {poItems.length > 0 && (
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14,
                    padding: 16, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 10
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '850', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Items Found in PO ({poItems.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                      {poItems.map((item, index) => {
                        const isSelected = formData.fabricName === item.description;
                        return (
                          <div
                            key={index}
                            onClick={() => !batchActive && handleSelectPoItem(item)}
                            style={{
                              padding: '8px 12px', borderRadius: 10, border: `1px solid ${isSelected ? '#818cf8' : '#e2e8f0'}`,
                              background: isSelected ? '#eff6ff' : '#fff', cursor: batchActive ? 'not-allowed' : 'pointer',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s'
                            }}
                          >
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#1e293b' }}>{item.description}</div>
                              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: 2 }}>Line #{item.lineNo} · {item.department}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '12.5px', fontWeight: '900', color: '#4f46e5' }}>{item.qty} {item.uom}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>


              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>CMP Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    value={formData.cmfName}
                    onChange={e => handleInputChange('cmfName', e.target.value)}
                    disabled={batchActive}
                    placeholder="e.g. CMF-Fabric"
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                      borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                      fontWeight: '700', boxSizing: 'border-box', background: batchActive ? '#f1f5f9' : '#fff'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>Fabric Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    value={formData.fabricName}
                    onChange={e => handleInputChange('fabricName', e.target.value)}
                    disabled={batchActive}
                    placeholder="e.g. Cotton 30s"
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                      borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                      fontWeight: '700', boxSizing: 'border-box', background: batchActive ? '#f1f5f9' : '#fff'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>Group <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    value={formData.group}
                    onChange={e => handleInputChange('group', e.target.value)}
                    disabled={batchActive}
                    placeholder="e.g. Knitted"
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                      borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                      fontWeight: '700', boxSizing: 'border-box', background: batchActive ? '#f1f5f9' : '#fff'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>Shade <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    value={formData.shade}
                    onChange={e => handleInputChange('shade', e.target.value)}
                    disabled={batchActive}
                    placeholder="e.g. Navy Blue"
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                      borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                      fontWeight: '700', boxSizing: 'border-box', background: batchActive ? '#f1f5f9' : '#fff'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>Lot Number <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    value={formData.lotNumber}
                    onChange={e => handleInputChange('lotNumber', e.target.value)}
                    disabled={batchActive}
                    placeholder="e.g. LOT-4509"
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                      borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                      fontWeight: '700', boxSizing: 'border-box', background: batchActive ? '#f1f5f9' : '#fff'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>Bill Number <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    value={formData.billNumber}
                    onChange={e => handleInputChange('billNumber', e.target.value)}
                    disabled={batchActive}
                    placeholder="e.g. BILL-9921"
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                      borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                      fontWeight: '700', boxSizing: 'border-box', background: batchActive ? '#f1f5f9' : '#fff'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>Date <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => handleInputChange('date', e.target.value)}
                    disabled={batchActive}
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                      borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                      fontWeight: '700', boxSizing: 'border-box', background: batchActive ? '#f1f5f9' : '#fff'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>Location <span style={{ color: '#ef4444' }}>*</span></label>
                <LocationPicker
                  value={formData.location}
                  onChange={val => handleInputChange('location', val)}
                  disabled={batchActive}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>Received Person <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    value={formData.receivedPerson}
                    onChange={e => handleInputChange('receivedPerson', e.target.value)}
                    disabled={batchActive}
                    placeholder="e.g. John Doe"
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                      borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                      fontWeight: '700', boxSizing: 'border-box', background: batchActive ? '#f1f5f9' : '#fff'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: 5 }}>Authorized Person <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    value={formData.authorizedPerson}
                    onChange={e => handleInputChange('authorizedPerson', e.target.value)}
                    disabled={batchActive}
                    placeholder="e.g. Sarah Smith"
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                      borderRadius: 10, fontSize: '13.5px', color: '#1e293b', outline: 'none',
                      fontWeight: '700', boxSizing: 'border-box', background: batchActive ? '#f1f5f9' : '#fff'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Processing and Sticker preview */}
          {isProcessing && (
            <div style={{
              position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
              background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
              color: '#fff'
            }}>
              <Printer size={32} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontWeight: '800', fontSize: '15px' }}>Generating sticker and syncing to database...</span>
            </div>
          )}

          {/* Scanned / Printed roll history table inside batch */}
          {completedRolls.length > 0 && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
              overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.02)'
            }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <h4 style={{ margin: 0, fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', fontWeight: '900' }}>
                  Sticker Barcodes Printed in this Batch ({completedRolls.length})
                </h4>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 20px', fontWeight: '800', color: '#475569' }}>Roll #</th>
                      <th style={{ padding: '12px 20px', fontWeight: '800', color: '#475569' }}>Barcode ID</th>
                      <th style={{ padding: '12px 20px', fontWeight: '800', color: '#475569' }}>Fabric Name</th>
                      <th style={{ padding: '12px 20px', fontWeight: '800', color: '#475569' }}>Length</th>
                      <th style={{ padding: '12px 20px', fontWeight: '800', color: '#475569' }}>Time</th>
                      <th style={{ padding: '12px 20px', fontWeight: '800', color: '#475569' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRolls.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 20px', fontWeight: '900' }}>#{r.rollNumber}</td>
                        <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: 14 }}>{r.uniqueBarcodeId}</td>
                        <td style={{ padding: '12px 20px', fontWeight: '600' }}>{r.fabricName} ({r.shade})</td>
                        <td style={{ padding: '12px 20px', fontWeight: '800' }}>{r.weight} MTR</td>
                        <td style={{ padding: '12px 20px', color: '#64748b' }}>{r.generatedAt}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{
                            background: '#dcfce7', color: '#15803d', padding: '2px 8px',
                            borderRadius: 12, fontSize: '10px', fontWeight: '800', border: '1px solid #bbf7d0'
                          }}>✓ Synced</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stop Confirmation Dialog */}
      {showStopConfirm && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
          background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 32, maxWidth: 440, width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ background: '#fef2f2', padding: 8, borderRadius: 10, color: '#ef4444' }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: '900', color: '#0f172a' }}>Stop Batch Process?</h3>
            </div>
            <p style={{ color: '#475569', fontSize: '13.5px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              You have printed <strong>{currentRollNumber}</strong> rolls of <strong>{totalRollsInBatch}</strong> planned. Stop early and cancel remaining?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowStopConfirm(false)}
                style={{
                  padding: '10px 18px', borderRadius: 12, border: '1px solid #cbd5e1',
                  background: '#fff', color: '#475569', fontWeight: '800', fontSize: '13px', cursor: 'pointer'
                }}
              >
                Go Back
              </button>
              <button
                onClick={stopBatchEarly}
                style={{
                  padding: '10px 18px', borderRadius: 12, border: 'none',
                  background: '#dc2626', color: '#fff', fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.2)'
                }}
              >
                Yes, Stop Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide in styles */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
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

export default MaterialAgainstPoForm;
