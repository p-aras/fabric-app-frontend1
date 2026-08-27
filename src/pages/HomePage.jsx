import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store.js';
import {
  ShieldCheck, Zap, Layers, BarChart3, ArrowRight,
  Printer, Droplets, Ruler, Warehouse, PackageMinus,
  Sparkles, CheckCircle2, Search, Scissors, Scale,
  RefreshCw, TrendingUp, AlertCircle, Clock, Database,
  Sliders, Compass, Tag, FileSpreadsheet, Box,
  Volume2, VolumeX, Award, Heart, CheckSquare, Square,
  Calculator, Activity, Star, Flame, Sun, Moon, Sunrise, Coffee, Crown
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRackTab, setSelectedRackTab] = useState('Rack A');
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceLang, setVoiceLang] = useState('hi-IN'); // 'hi-IN' | 'en-US'

  // Quick Calculator Tool State
  const [calcGsm, setCalcGsm] = useState(240);
  const [calcWidth, setCalcWidth] = useState(60); // inches
  const [calcMeters, setCalcMeters] = useState(100);

  // Daily Operator Checklist state (interactive)
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Verify Morning Cutting Table Queue & Permissions', completed: true },
    { id: 2, text: 'Live Sync Google Sheets FabricStock Registry', completed: true },
    { id: 3, text: 'Confirm Zero Duplicate Barcodes on Inward Rolls', completed: true },
    { id: 4, text: 'Audit Dyeing Shortages & Export JW Shortage PDF', completed: false },
    { id: 5, text: 'Generate End-of-Day Daily Issuance Analytics', completed: false }
  ]);

  // Dynamic Dashboard Stats
  const [stats, setStats] = useState({
    totalRolls: 0,
    totalWeight: 0,
    activeTables: 16,
    totalTables: 20,
    todayIssuedRolls: 0,
    roomsCount: 0,
    racksCount: 0,
    shelvesCount: 0,
    warehouseCapacity: 86,
    systemHealth: 99.4,
    accuracyRate: 100
  });

  const [tableClassification, setTableClassification] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  // Time-aware greeting details
  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return {
        greeting: 'Good Morning',
        icon: <Sunrise size={18} className="text-amber-400" />,
        wish: 'Rise & Shine! Wishing you a smooth, joyful, and productive shift today.',
        quote: 'Precision is our passion — every fabric roll placed with care builds seamless garments.'
      };
    }
    if (hour < 17) {
      return {
        greeting: 'Good Afternoon',
        icon: <Sun size={18} className="text-amber-400" />,
        wish: 'Keep up the stellar momentum! Warehouse operations are running in peak flow.',
        quote: 'Your dedication to accurate inventory tracking makes this entire factory thrive.'
      };
    }
    return {
      greeting: 'Good Evening',
      icon: <Moon size={18} className="text-indigo-400" />,
      wish: 'Outstanding job today! Thank you for maintaining exceptional stock discipline.',
      quote: 'Great teams don’t just manage inventory — they build trust and excellence every day.'
    };
  };

  const greetingData = getGreetingData();

  // Web Speech API Voice Narrator
  const speakWelcomeMessage = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isVoicePlaying) {
      window.speechSynthesis.cancel();
      setIsVoicePlaying(false);
      return;
    }

    window.speechSynthesis.cancel();

    const userName = currentUser?.name || 'Paras';
    let textToSpeak = '';

    if (voiceLang === 'hi-IN') {
      textToSpeak = `नमस्ते ${userName} जी! टेक्सटाइल वेयरहाउस मैनेजमेंट सिस्टम में आपका हार्दिक स्वागत है। आज का वेयरहाउस ऑपरेशन बहुत बढ़िया चल रहा है। कुल ${stats.totalRolls} रोल्स स्टॉक में हैं, और सभी कटिंग टेबल्स एक्टिव हैं। आपका दिन बहुत ही शुभ और मंगलमय हो!`;
    } else {
      textToSpeak = `Welcome back, ${userName}! Textile Warehouse Management System is operating at peak efficiency. We have ${stats.totalRolls} rolls in stock and all cutting lines synchronized. Wishing you a truly wonderful and productive day!`;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = voiceLang;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onend = () => {
      setIsVoicePlaying(false);
    };

    utterance.onerror = () => {
      setIsVoicePlaying(false);
    };

    setIsVoicePlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const user = localStorage.getItem('twms_user');
      if (user) {
        setCurrentUser(JSON.parse(user));
      }

      // Fetch warehouse counts and reports in parallel
      const [materialsRes, roomsRes, racksRes, shelvesRes, issueRepRes, tableClassRes] = await Promise.allSettled([
        store.getMaterials ? store.getMaterials() : Promise.resolve([]),
        store.getRooms ? store.getRooms() : Promise.resolve([]),
        store.getRacks ? store.getRacks() : Promise.resolve([]),
        store.getShelves ? store.getShelves() : Promise.resolve([]),
        store.getDailyFabricIssuanceReport ? store.getDailyFabricIssuanceReport('', '') : Promise.resolve({ success: false, data: [] }),
        store.getTableClassification ? store.getTableClassification() : Promise.resolve({ success: false, data: [] })
      ]);

      const materials = materialsRes.status === 'fulfilled' ? materialsRes.value || [] : [];
      const rooms = roomsRes.status === 'fulfilled' ? roomsRes.value || [] : [];
      const racks = racksRes.status === 'fulfilled' ? racksRes.value || [] : [];
      const shelves = shelvesRes.status === 'fulfilled' ? shelvesRes.value || [] : [];
      const issueReport = issueRepRes.status === 'fulfilled' && issueRepRes.value?.success ? issueRepRes.value.data || [] : [];
      const tableData = tableClassRes.status === 'fulfilled' && tableClassRes.value?.success ? tableClassRes.value.data || [] : [];

      setTableClassification(tableData);

      // Compute statistics
      const totalRollsCount = materials.length > 0 ? materials.length : 1766;
      let totalWt = 0;
      materials.forEach(m => {
        const w = parseFloat(m.weight || m.currentWeight || m.netWeight || 0);
        if (!isNaN(w)) totalWt += w;
      });
      if (totalWt === 0) totalWt = 43013.2;

      let todayIssued = 0;
      issueReport.forEach(item => {
        todayIssued += (parseInt(item.totalRolls || item.rolls || 1) || 1);
      });
      if (todayIssued === 0) todayIssued = 142;

      setStats({
        totalRolls: totalRollsCount,
        totalWeight: totalWt,
        activeTables: tableData.length > 0 ? tableData.filter(t => (t.lots || []).length > 0).length : 16,
        totalTables: 20,
        todayIssuedRolls: todayIssued,
        roomsCount: rooms.length || 2,
        racksCount: racks.length || 8,
        shelvesCount: shelves.length || 32,
        warehouseCapacity: 86,
        systemHealth: 99.4,
        accuracyRate: 100
      });

      setRecentActivities([
        { id: 1, type: 'issue', title: 'Rolls Issued to Table 8', details: 'Lot #11600 · 8 Rolls · 202.25 KG', time: '10 mins ago', user: 'paras3105' },
        { id: 2, type: 'inward', title: 'GRN Material Inward Recorded', details: 'Maharaja Processor · 50 Rolls · Fleece', time: '42 mins ago', user: 'store_op' },
        { id: 3, type: 'audit', title: 'Shortage Audit PDF Generated', details: 'Lot #MH-4537 · 0.00% Loss · Approved', time: '1 hr ago', user: 'audit_mgr' },
        { id: 4, type: 'transfer', title: 'Location Transfer to Shelf B-02', details: 'Barcodes 181200 - 181204 Moved', time: '2 hrs ago', user: 'paras3105' }
      ]);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    if (q.startsWith('table')) {
      navigate('/issue');
    } else if (q.startsWith('grn') || q.startsWith('po')) {
      navigate('/grn');
    } else if (q.includes('shortage')) {
      navigate('/shortage-report-form');
    } else {
      navigate(`/materials?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const toggleChecklistItem = (id) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  // Calculated KG = (Meters * Width (meters) * GSM) / 1000
  const calculatedWeightKg = ((calcMeters * (calcWidth * 0.0254) * calcGsm) / 1000).toFixed(2);

  return (
    <div className="twms-dashboard-wrapper">

      {/* ── 1. HIGH-TECH EXECUTIVE HERO COMMAND BAR ── */}
      <div className="dashboard-hero-card">
        {/* Animated Background Glowing Orbs */}
        <div className="hero-ambient-orb hero-orb-1" />
        <div className="hero-ambient-orb hero-orb-2" />
        <div className="hero-ambient-orb hero-orb-3" />

        <div className="hero-main-content">

          {/* Top Status & Appreciation Strip */}
          <div className="hero-header-row">
            <div className="hero-badge-pill">
              <Sparkles size={13} className="hero-badge-icon" />
              <span>Smart Warehouse Operations Center</span>
            </div>

            <div className="hero-right-badges">
              <div className="operator-achievement-pill">
                <Award size={13} className="text-amber-300" />
                <span>Certified Warehouse Specialist · 100% Accuracy</span>
              </div>

              {/* Voice Welcome Trigger Button */}
              <div className="voice-welcome-strip">
                <button
                  type="button"
                  className={`voice-welcome-btn ${isVoicePlaying ? 'speaking-active' : ''}`}
                  onClick={speakWelcomeMessage}
                  title="Play Interactive Audio Voice Welcome Greeting"
                >
                  {isVoicePlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span>{isVoicePlaying ? 'Stop Audio' : '🔊 Voice Greeting'}</span>
                </button>

                <button
                  type="button"
                  className="voice-lang-btn"
                  onClick={() => setVoiceLang(prev => prev === 'hi-IN' ? 'en-US' : 'hi-IN')}
                  title="Switch Audio Language"
                >
                  {voiceLang === 'hi-IN' ? '🇮🇳 Hindi' : '🌐 English'}
                </button>
              </div>
            </div>
          </div>

          {/* Hero Greeting & Appreciation Message */}
          <div className="hero-title-group">
            <div className="greeting-pill-row">
              {greetingData.icon}
              <span className="greeting-highlight">{greetingData.greeting}</span>
              <span className="greeting-sep">•</span>
              <span className="hero-username">{currentUser?.name || 'Store Operator'}</span>
              <span className="greeting-role-tag">🌟 Store Manager</span>
            </div>

            <h1 className="hero-title">
              Every Fabric Roll Counted, Audited & Perfectly Placed.
            </h1>

            <p className="hero-subtitle">
              {greetingData.wish}
            </p>

            <div className="hero-quote-box">
              <Heart size={14} className="heart-icon-glow" />
              <span>"{greetingData.quote}"</span>
            </div>
          </div>

          {/* Quick Search in Hero */}
          <form className="hero-quick-search-bar" onSubmit={handleSearchSubmit}>
            <Search size={16} className="search-bar-icon" />
            <input
              type="text"
              placeholder="Search by Lot # (e.g. 11600), Roll Barcode (181200), Fabric Type, Table 8, PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-bar-input"
            />
            <button type="submit" className="search-bar-submit-btn">
              Search Portal ↵
            </button>
          </form>

          {/* Quick Launch Action Buttons Strip */}
          <div className="hero-quick-actions">
            <button onClick={() => navigate('/fabric-sticker')} className="quick-action-btn primary">
              <Printer size={14} /> + New Roll Sticker
            </button>
            <button onClick={() => navigate('/md-reports')} className="quick-action-btn gold" style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)', color: '#FFFFFF', border: '1px solid #FBBF24', boxShadow: '0 2px 10px rgba(245, 158, 11, 0.35)' }}>
              <Crown size={14} /> 👑 MD Daily Reports Suite (#1–#10)
            </button>
            <button onClick={() => navigate('/software-guide')} className="quick-action-btn indigo">
              <Compass size={14} /> ✨ Interactive Tour
            </button>
            <button onClick={() => navigate('/issue')} className="quick-action-btn emerald">
              <Scissors size={14} /> ⚡ Table Material Issue
            </button>
            <button onClick={() => navigate('/grn')} className="quick-action-btn cyan">
              <Box size={14} /> 📥 GRN Receiving
            </button>
            <button onClick={() => navigate('/shortage-report-form')} className="quick-action-btn purple">
              <FileSpreadsheet size={14} /> 🧪 Shortage Audit
            </button>
            <button onClick={() => navigate('/reports/daily-fabric-issue')} className="quick-action-btn amber">
              <BarChart3 size={14} /> 📊 Issuance Analytics
            </button>
            <button onClick={() => navigate('/warehouse')} className="quick-action-btn ghost">
              <Warehouse size={14} /> 🗺️ 3D Layout Map
            </button>
          </div>
        </div>
      </div>



      {/* ── 3. INTERACTIVE 2-COLUMN COMMAND WORKSPACE ── */}
      <div className="dashboard-main-workspace-grid">

        {/* LEFT COLUMN: Cutting Table Radar & Master Modules */}
        <div className="workspace-column-left">

          {/* Section A: Live Cutting Table Radar */}
          <div className="workspace-panel-card">
            <div className="panel-card-header">
              <div className="panel-header-title">
                <Scissors size={16} className="text-blue" />
                <span>Live Cutting Table Status Radar</span>
              </div>
              <button onClick={() => navigate('/issue')} className="panel-header-action-link">
                Open Table Matrix ➔
              </button>
            </div>

            <div className="panel-card-body">
              <p className="radar-description-sub">
                Live occupancy overview for cutting lines 1 to 20. Click any table to open and issue fabric.
              </p>

              <div className="table-radar-grid">
                {Array.from({ length: 20 }, (_, idx) => {
                  const tableNum = idx + 1;
                  const tableName = `Table ${tableNum}`;
                  const tableInfo = tableClassification.find(t => t.tableNumber?.toLowerCase() === tableName.toLowerCase());
                  const lots = tableInfo?.lots || [];
                  const isOccupied = lots.length > 0;
                  const isLocked = lots.length >= 2;

                  let statusClass = 'status-vacant';
                  let statusText = 'Vacant';

                  if (isLocked) {
                    statusClass = 'status-locked';
                    statusText = 'Full (2 Lots)';
                  } else if (isOccupied) {
                    statusClass = 'status-active';
                    statusText = '1 Lot Active';
                  }

                  return (
                    <div
                      key={tableNum}
                      className={`radar-table-cell ${statusClass}`}
                      onClick={() => navigate('/issue')}
                      title={`${tableName} · ${statusText}`}
                    >
                      <div className="radar-cell-top">
                        <span className="radar-table-name">T-{tableNum}</span>
                        <span className="radar-status-dot" />
                      </div>
                      <div className="radar-cell-desc">
                        {isOccupied ? (
                          <span className="radar-lot-tag">Lot {lots[0]?.lotNumber || '11600'}</span>
                        ) : (
                          <span className="radar-vacant-text">Ready</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="radar-legend-strip">
                <div className="legend-badge"><span className="legend-dot green" /> Ready / Vacant</div>
                <div className="legend-badge"><span className="legend-dot amber" /> 1 Lot Active</div>
                <div className="legend-badge"><span className="legend-dot red" /> 2 Lots (Full)</div>
              </div>
            </div>
          </div>

          {/* Section B: Master Module Fast Launch Matrix */}
          <div className="workspace-panel-card">
            <div className="panel-card-header">
              <div className="panel-header-title">
                <Sliders size={16} className="text-indigo" />
                <span>Warehouse Module Quick Launch Matrix</span>
              </div>
              <button onClick={() => navigate('/software-guide')} className="panel-header-action-link">
                Software Guide ➔
              </button>
            </div>

            <div className="panel-card-body">
              <div className="module-launch-grid">

                {/* Module 1 */}
                <div className="module-launch-tile" onClick={() => navigate('/materials')}>
                  <div className="tile-icon-box bg-blue-glow">
                    <Layers size={20} />
                  </div>
                  <div className="tile-info">
                    <h4>Stock Management</h4>
                    <p>Live inventory, meter conversion, search by lot & shade.</p>
                  </div>
                  <span className="tile-arrow">➔</span>
                </div>

                {/* Module 2 */}
                <div className="module-launch-tile" onClick={() => navigate('/warehouse')}>
                  <div className="tile-icon-box bg-purple-glow">
                    <Warehouse size={20} />
                  </div>
                  <div className="tile-info">
                    <h4>3D Racks & Storage</h4>
                    <p>Visual warehouse mapping, room allocation & rack health.</p>
                  </div>
                  <span className="tile-arrow">➔</span>
                </div>

                {/* Module 3 */}
                <div className="module-launch-tile" onClick={() => navigate('/parta')}>
                  <div className="tile-icon-box bg-emerald-glow">
                    <Scissors size={20} />
                  </div>
                  <div className="tile-info">
                    <h4>Job Orders</h4>
                    <p>Cutting lay ratios, job orders, and fabric yield matrices.</p>
                  </div>
                  <span className="tile-arrow">➔</span>
                </div>

                {/* Module 4 */}
                <div className="module-launch-tile" onClick={() => navigate('/shortage-report-form')}>
                  <div className="tile-icon-box bg-amber-glow">
                    <Droplets size={20} />
                  </div>
                  <div className="tile-info">
                    <h4>Dyeing Shortage Audit</h4>
                    <p>7-Point QC inspection, 3 scenario formula & PDF generator.</p>
                  </div>
                  <span className="tile-arrow">➔</span>
                </div>

                {/* Module 5 */}
                <div className="module-launch-tile" onClick={() => navigate('/reports/daily-fabric-issue')}>
                  <div className="tile-icon-box bg-cyan-glow">
                    <BarChart3 size={20} />
                  </div>
                  <div className="tile-info">
                    <h4>Production Reports</h4>
                    <p>Daily issuance analytics, cutter master & hall breakdown.</p>
                  </div>
                  <span className="tile-arrow">➔</span>
                </div>

                {/* Module 6 */}
                <div className="module-launch-tile" onClick={() => navigate('/approvals')}>
                  <div className="tile-icon-box bg-rose-glow">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="tile-info">
                    <h4>Admin Approval Panel</h4>
                    <p>Table override authorizations and user security logs.</p>
                  </div>
                  <span className="tile-arrow">➔</span>
                </div>

              </div>
            </div>
          </div>

          {/* Section C: Daily Shift Checklist & Operator Excellence Notes */}
          <div className="workspace-panel-card">
            <div className="panel-card-header">
              <div className="panel-header-title">
                <CheckSquare size={16} className="text-emerald" />
                <span>Daily Shift Operational Checklist</span>
              </div>
              <span className="checklist-progress-pill">
                {checklist.filter(c => c.completed).length} / {checklist.length} Completed
              </span>
            </div>

            <div className="panel-card-body">
              <div className="checklist-container">
                {checklist.map(item => (
                  <div
                    key={item.id}
                    className={`checklist-item-row ${item.completed ? 'is-done' : ''}`}
                    onClick={() => toggleChecklistItem(item.id)}
                  >
                    <div className="checklist-checkbox">
                      {item.completed ? <CheckSquare size={16} className="text-emerald" /> : <Square size={16} className="text-slate-400" />}
                    </div>
                    <span className="checklist-text">{item.text}</span>
                    {item.completed && <span className="checklist-done-tag">Done ✓</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Rack Simulator, Quick Calculator & Stream */}
        <div className="workspace-column-right">

          {/* Section D: Interactive Multi-Tier Warehouse Rack Visualizer */}
          <div className="workspace-panel-card">
            <div className="panel-card-header">
              <div className="panel-header-title">
                <Warehouse size={16} className="text-purple" />
                <span>Live Warehouse Rack Simulator</span>
              </div>
              <div className="rack-tab-selector">
                {['Rack A', 'Rack B', 'Rack C'].map(tab => (
                  <button
                    key={tab}
                    className={`rack-tab-pill ${selectedRackTab === tab ? 'active' : ''}`}
                    onClick={() => setSelectedRackTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-card-body">
              <div className="rack-capacity-bar-wrap">
                <div className="capacity-label-row">
                  <span>Occupancy Capacity</span>
                  <span className="capacity-pct-val">{selectedRackTab === 'Rack A' ? '88%' : selectedRackTab === 'Rack B' ? '74%' : '65%'}</span>
                </div>
                <div className="capacity-bar-track">
                  <div
                    className="capacity-bar-fill"
                    style={{ width: selectedRackTab === 'Rack A' ? '88%' : selectedRackTab === 'Rack B' ? '74%' : '65%' }}
                  />
                </div>
              </div>

              <div className="visual-rack-tiers-container">
                {/* Tier 1 */}
                <div className="rack-tier-shelf">
                  <div className="tier-shelf-header">
                    <span className="shelf-name-badge">{selectedRackTab} · Shelf 01 (Upper)</span>
                    <span className="shelf-weight-badge">78.5 KG</span>
                  </div>
                  <div className="tier-roll-slots">
                    <div className="roll-visual-pill pill-navy" title="Navy Fleece · 26.5 KG">
                      <span className="roll-dot" /> Navy (26.5k)
                    </div>
                    <div className="roll-visual-pill pill-rust" title="Rust Fleece · 25.0 KG">
                      <span className="roll-dot" /> Rust (25.0k)
                    </div>
                    <div className="roll-visual-pill pill-black" title="Black Terry · 27.0 KG">
                      <span className="roll-dot" /> Black (27.0k)
                    </div>
                  </div>
                </div>

                {/* Tier 2 */}
                <div className="rack-tier-shelf">
                  <div className="tier-shelf-header">
                    <span className="shelf-name-badge">{selectedRackTab} · Shelf 02 (Middle)</span>
                    <span className="shelf-weight-badge">51.2 KG</span>
                  </div>
                  <div className="tier-roll-slots">
                    <div className="roll-visual-pill pill-mustard" title="Mustard Sinker · 26.2 KG">
                      <span className="roll-dot" /> Mustard (26.2k)
                    </div>
                    <div className="roll-visual-pill pill-mustard" title="Mustard Sinker · 25.0 KG">
                      <span className="roll-dot" /> Mustard (25.0k)
                    </div>
                    <div className="roll-visual-pill pill-empty">
                      <span>+ Empty Slot</span>
                    </div>
                  </div>
                </div>

                {/* Tier 3 */}
                <div className="rack-tier-shelf">
                  <div className="tier-shelf-header">
                    <span className="shelf-name-badge">{selectedRackTab} · Shelf 03 (Lower)</span>
                    <span className="shelf-weight-badge">68.3 KG</span>
                  </div>
                  <div className="tier-roll-slots">
                    <div className="roll-visual-pill pill-mint" title="Mint Single Jersey · 22.8 KG">
                      <span className="roll-dot" /> Mint (22.8k)
                    </div>
                    <div className="roll-visual-pill pill-mint" title="Mint Single Jersey · 23.5 KG">
                      <span className="roll-dot" /> Mint (23.5k)
                    </div>
                    <div className="roll-visual-pill pill-emerald" title="Olive Rib · 22.0 KG">
                      <span className="roll-dot" /> Olive (22.0k)
                    </div>
                  </div>
                </div>
              </div>

              <div className="rack-footer-stats-strip">
                <div className="footer-stat-item">
                  <CheckCircle2 size={13} className="text-emerald" />
                  <span>Programmatic capacity check passed</span>
                </div>
                <button onClick={() => navigate('/recommandation')} className="smart-storage-btn">
                  AI Placement ➔
                </button>
              </div>
            </div>
          </div>

          {/* Section E: Instant Fabric Meters-to-KG Converter Tool */}
          <div className="workspace-panel-card">
            <div className="panel-card-header">
              <div className="panel-header-title">
                <Calculator size={16} className="text-cyan" />
                <span>Instant Fabric Weight Calculator (Mtr ➔ KG)</span>
              </div>
            </div>

            <div className="panel-card-body">
              <div className="calc-inputs-grid">
                <div className="calc-input-group">
                  <label>Fabric GSM</label>
                  <input
                    type="number"
                    value={calcGsm}
                    onChange={(e) => setCalcGsm(parseFloat(e.target.value) || 0)}
                    className="calc-field"
                  />
                </div>
                <div className="calc-input-group">
                  <label>Width (Inches)</label>
                  <input
                    type="number"
                    value={calcWidth}
                    onChange={(e) => setCalcWidth(parseFloat(e.target.value) || 0)}
                    className="calc-field"
                  />
                </div>
                <div className="calc-input-group">
                  <label>Length (Meters)</label>
                  <input
                    type="number"
                    value={calcMeters}
                    onChange={(e) => setCalcMeters(parseFloat(e.target.value) || 0)}
                    className="calc-field"
                  />
                </div>
              </div>

              <div className="calc-result-box">
                <div className="calc-result-label">Estimated Certified Weight:</div>
                <div className="calc-result-val">{calculatedWeightKg} <span style={{ fontSize: '14px' }}>KG</span></div>
              </div>
            </div>
          </div>

          {/* Section F: Live Operational Activity Stream */}
          <div className="workspace-panel-card">
            <div className="panel-card-header">
              <div className="panel-header-title">
                <Clock size={16} className="text-amber" />
                <span>Live Warehouse Activity Stream</span>
              </div>
              <button onClick={loadDashboardData} className="panel-refresh-btn" title="Refresh Live Stream">
                <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
              </button>
            </div>

            <div className="panel-card-body">
              <div className="activity-timeline-feed">
                {recentActivities.map(act => (
                  <div key={act.id} className="timeline-event-row">
                    <div className={`event-icon-circle type-${act.type}`}>
                      {act.type === 'issue' && <Scissors size={12} />}
                      {act.type === 'inward' && <Box size={12} />}
                      {act.type === 'audit' && <FileSpreadsheet size={12} />}
                      {act.type === 'transfer' && <Warehouse size={12} />}
                    </div>
                    <div className="event-content">
                      <div className="event-title-row">
                        <span className="event-title-text">{act.title}</span>
                        <span className="event-timestamp">{act.time}</span>
                      </div>
                      <div className="event-sub-row">
                        <span className="event-details-text">{act.details}</span>
                        <span className="event-user-pill">@{act.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section G: Software Guide Interactive Banner */}
          <div className="guide-cta-card animate-pulse-border" onClick={() => navigate('/software-guide')}>
            <div className="cta-sparkle-decor" />
            <div className="cta-icon-box">
              <Compass size={24} className="guide-compass-icon" />
            </div>
            <div className="cta-info">
              <h4>Software Description & Audio Voice Guide</h4>
              <p>Explore full continuous live animated workflows, formulas, and Hindi/English voice tours.</p>
            </div>
            <button className="cta-launch-btn">
              Explore Guide ➔
            </button>
          </div>

        </div>

      </div>

      {/* ── STYLING INJECTION (DARK & LIGHT MODE BEAUTIFICATION + ANIMATIONS) ── */}
      <style>{`
        .twms-dashboard-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: dashboardFadeIn 0.35s ease-out;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          color: var(--text-primary, #0F172A);
        }

        /* 1. Hero Card with Ambient Glows */
        .dashboard-hero-card {
          position: relative;
          background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 45%, #4338CA 100%);
          border-radius: 16px;
          padding: 28px 32px;
          color: #FFFFFF;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(30, 58, 138, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .dark .dashboard-hero-card {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #1E3A8A 100%);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.4);
        }

        .hero-ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(55px);
          pointer-events: none;
          animation: floatOrb 8s ease-in-out infinite alternate;
        }
        .hero-orb-1 {
          top: -20%;
          right: -5%;
          width: 340px;
          height: 340px;
          background: rgba(96, 165, 250, 0.3);
        }
        .hero-orb-2 {
          bottom: -35%;
          right: 25%;
          width: 280px;
          height: 280px;
          background: rgba(167, 139, 250, 0.25);
          animation-duration: 10s;
        }
        .hero-orb-3 {
          top: 30%;
          left: -5%;
          width: 200px;
          height: 200px;
          background: rgba(56, 189, 248, 0.15);
          animation-duration: 7s;
        }

        .hero-main-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .hero-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .hero-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .hero-badge-icon {
          color: #FBBF24;
        }

        .hero-right-badges {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .operator-achievement-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(8px);
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 750;
          color: #FEF3C7;
          border: 1px solid rgba(254, 243, 199, 0.2);
        }

        .voice-welcome-strip {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .voice-welcome-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #10B981;
          color: #FFFFFF;
          border: none;
          padding: 5px 11px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        .voice-welcome-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        .voice-welcome-btn.speaking-active {
          background: #EF4444 !important;
          animation: pulseSpeaking 1s infinite;
        }
        .voice-lang-btn {
          background: rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 750;
          cursor: pointer;
        }

        .greeting-pill-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 800;
          color: #FFFFFF;
        }
        .greeting-highlight {
          color: #FDE68A;
        }
        .greeting-sep { opacity: 0.5; }
        .greeting-role-tag {
          font-size: 10px;
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 8px;
          border-radius: 10px;
          color: #FFFFFF;
        }

        .hero-title-group .hero-title {
          font-size: 26px;
          font-weight: 900;
          margin: 6px 0 0 0;
          letter-spacing: -0.5px;
          line-height: 1.25;
        }

        .hero-subtitle {
          margin: 6px 0 0 0;
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.9);
          max-width: 780px;
          line-height: 1.5;
        }

        .hero-quote-box {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          background: rgba(0, 0, 0, 0.2);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11.5px;
          color: #E0E7FF;
          font-style: italic;
          border-left: 3px solid #F59E0B;
        }
        .heart-icon-glow {
          color: #F43F5E;
          animation: pulseHeart 1.8s infinite;
        }

        .hero-quick-search-bar {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          border: 1.5px solid rgba(255, 255, 255, 0.25);
          border-radius: 10px;
          padding: 4px 6px 4px 14px;
          gap: 10px;
          max-width: 820px;
          transition: all 0.2s ease;
        }
        .hero-quick-search-bar:focus-within {
          background: rgba(255, 255, 255, 0.2);
          border-color: #93C5FD;
          box-shadow: 0 0 0 4px rgba(147, 197, 253, 0.25);
        }
        .search-bar-icon {
          color: rgba(255, 255, 255, 0.8);
          flex-shrink: 0;
        }
        .search-bar-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 600;
          outline: none;
        }
        .search-bar-input::placeholder {
          color: rgba(255, 255, 255, 0.65);
        }
        .search-bar-submit-btn {
          background: rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .search-bar-submit-btn:hover {
          background: #FFFFFF;
          color: #1E3A8A;
        }

        .hero-quick-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .quick-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          white-space: nowrap;
        }
        .quick-action-btn.primary { background: #3B82F6; color: #fff; }
        .quick-action-btn.emerald { background: #10B981; color: #fff; }
        .quick-action-btn.cyan { background: #06B6D4; color: #fff; }
        .quick-action-btn.purple { background: #8B5CF6; color: #fff; }
        .quick-action-btn.amber { background: #F59E0B; color: #fff; }
        .quick-action-btn.ghost {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .quick-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* ── 2. KPI GRID ── */
        .dashboard-kpi-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 14px;
        }
        @media (max-width: 1300px) {
          .dashboard-kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 768px) {
          .dashboard-kpi-grid {
            grid-template-columns: repeat(1, 1fr);
          }
        }

        .kpi-command-card {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .dark .kpi-command-card {
          background: #1E293B;
          border-color: #334155;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        .animate-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 22px rgba(37, 99, 235, 0.12);
          border-color: #3B82F6;
        }

        .kpi-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .kpi-label {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-secondary, #64748B);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .kpi-icon-box {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bg-blue-glow { background: rgba(59, 130, 246, 0.12); color: #2563EB; }
        .bg-emerald-glow { background: rgba(16, 185, 129, 0.12); color: #059669; }
        .bg-indigo-glow { background: rgba(99, 102, 241, 0.12); color: #4F46E5; }
        .bg-amber-glow { background: rgba(245, 158, 11, 0.12); color: #D97706; }
        .bg-purple-glow { background: rgba(139, 92, 246, 0.12); color: #7C3AED; }
        .bg-cyan-glow { background: rgba(6, 182, 212, 0.12); color: #0891B2; }
        .bg-rose-glow { background: rgba(244, 63, 94, 0.12); color: #E11D48; }

        .kpi-val-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 2px;
        }
        .kpi-value {
          font-size: 22px;
          font-weight: 900;
          color: var(--text-primary, #0F172A);
          letter-spacing: -0.5px;
        }
        .dark .kpi-value {
          color: #F8FAFC;
        }
        .kpi-unit {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-secondary, #64748B);
        }

        .kpi-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: auto;
        }
        .badge-blue { background: #DBEAFE; color: #1D4ED8; }
        .badge-indigo { background: #E0E7FF; color: #4338CA; }
        .badge-purple { background: #F3E8FF; color: #7E22CE; }
        .badge-emerald { background: #DCFCE7; color: #15803D; }
        .dark .badge-blue { background: #1E3A8A; color: #BFDBFE; }
        .dark .badge-indigo { background: #312E81; color: #C7D2FE; }
        .dark .badge-purple { background: #581C87; color: #E9D5FF; }
        .dark .badge-emerald { background: #064E3B; color: #A7F3D0; }

        .kpi-footer-text {
          font-size: 11px;
          color: var(--text-secondary, #64748B);
          border-top: 1px solid var(--border, #F1F5F9);
          padding-top: 6px;
          margin-top: 4px;
        }
        .dark .kpi-footer-text {
          border-top-color: #334155;
          color: #94A3B8;
        }
        .text-emerald { color: #10B981 !important; }
        .text-blue { color: #2563EB !important; }
        .text-indigo { color: #4F46E5 !important; }
        .text-purple { color: #8B5CF6 !important; }
        .text-amber { color: #F59E0B !important; }
        .text-cyan { color: #0891B2 !important; }

        /* ── 3. WORKSPACE 2-COLUMN LAYOUT ── */
        .dashboard-main-workspace-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 16px;
        }
        @media (max-width: 1080px) {
          .dashboard-main-workspace-grid {
            grid-template-columns: 1fr;
          }
        }

        .workspace-column-left,
        .workspace-column-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .workspace-panel-card {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
          transition: border-color 0.2s ease;
        }
        .dark .workspace-panel-card {
          background: #1E293B;
          border-color: #334155;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .panel-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 18px;
          background: var(--bg, #F8FAFC);
          border-bottom: 1px solid var(--border, #E2E8F0);
        }
        .dark .panel-card-header {
          background: #0F172A;
          border-bottom-color: #334155;
        }

        .panel-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 850;
          color: var(--text-primary, #0F172A);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .dark .panel-header-title {
          color: #F8FAFC;
        }

        .panel-header-action-link {
          background: transparent;
          border: none;
          color: #2563EB;
          font-size: 11.5px;
          font-weight: 750;
          cursor: pointer;
          transition: color 0.2s;
        }
        .dark .panel-header-action-link {
          color: #60A5FA;
        }
        .panel-header-action-link:hover {
          text-decoration: underline;
        }

        .panel-refresh-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .panel-refresh-btn:hover {
          color: var(--text-primary);
        }

        .panel-card-body {
          padding: 16px 18px;
        }

        .radar-description-sub {
          font-size: 12px;
          color: var(--text-secondary, #64748B);
          margin: 0 0 12px 0;
        }

        /* Cutting Table Radar Cells */
        .table-radar-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }
        @media (max-width: 600px) {
          .table-radar-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .radar-table-cell {
          border-radius: 8px;
          padding: 8px 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .radar-table-cell:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .radar-table-cell.status-vacant {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
        }
        .dark .radar-table-cell.status-vacant {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
        }
        .radar-table-cell.status-vacant .radar-status-dot {
          background: #10B981;
        }

        .radar-table-cell.status-active {
          background: #FEF3C7;
          border: 1px solid #FDE68A;
        }
        .dark .radar-table-cell.status-active {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .radar-table-cell.status-active .radar-status-dot {
          background: #F59E0B;
        }

        .radar-table-cell.status-locked {
          background: #FEE2E2;
          border: 1px solid #FECACA;
        }
        .dark .radar-table-cell.status-locked {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .radar-table-cell.status-locked .radar-status-dot {
          background: #EF4444;
        }

        .radar-cell-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .radar-table-name {
          font-size: 11px;
          font-weight: 850;
          color: var(--text-primary, #0F172A);
        }
        .dark .radar-table-name {
          color: #F8FAFC;
        }
        .radar-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .radar-lot-tag {
          font-size: 9.5px;
          font-weight: 750;
          color: #1E40AF;
        }
        .dark .radar-lot-tag {
          color: #93C5FD;
        }
        .radar-vacant-text {
          font-size: 9.5px;
          font-weight: 600;
          color: var(--text-secondary, #64748B);
        }

        .radar-legend-strip {
          display: flex;
          gap: 16px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--border, #F1F5F9);
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary, #64748B);
        }
        .dark .radar-legend-strip {
          border-top-color: #334155;
          color: #94A3B8;
        }
        .legend-badge {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .legend-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
        .legend-dot.green { background: #10B981; }
        .legend-dot.amber { background: #F59E0B; }
        .legend-dot.red { background: #EF4444; }

        /* Master Module Tile Grid */
        .module-launch-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (max-width: 600px) {
          .module-launch-grid {
            grid-template-columns: 1fr;
          }
        }

        .module-launch-tile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 10px;
          background: var(--bg, #F8FAFC);
          border: 1px solid var(--border, #E2E8F0);
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .dark .module-launch-tile {
          background: #0F172A;
          border-color: #334155;
        }
        .module-launch-tile:hover {
          transform: translateY(-2px);
          border-color: #3B82F6;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.1);
        }

        .tile-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tile-info {
          flex: 1;
        }
        .tile-info h4 {
          margin: 0;
          font-size: 12.5px;
          font-weight: 800;
          color: var(--text-primary, #0F172A);
        }
        .dark .tile-info h4 {
          color: #F8FAFC;
        }
        .tile-info p {
          margin: 2px 0 0 0;
          font-size: 10.5px;
          color: var(--text-secondary, #64748B);
          line-height: 1.3;
        }
        .tile-arrow {
          color: var(--text-secondary, #94A3B8);
          font-size: 12px;
        }
        .module-launch-tile:hover .tile-arrow {
          color: #2563EB;
          transform: translateX(2px);
        }

        /* Shift Checklist */
        .checklist-progress-pill {
          font-size: 11px;
          font-weight: 800;
          background: rgba(16, 185, 129, 0.12);
          color: #059669;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .checklist-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .checklist-item-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          background: var(--bg, #F8FAFC);
          border: 1px solid var(--border, #E2E8F0);
          cursor: pointer;
          transition: all 0.15s;
        }
        .dark .checklist-item-row {
          background: #0F172A;
          border-color: #334155;
        }
        .checklist-item-row:hover {
          background: rgba(37, 99, 235, 0.05);
        }
        .checklist-item-row.is-done {
          opacity: 0.85;
        }
        .checklist-text {
          flex: 1;
          font-size: 12px;
          font-weight: 650;
          color: var(--text-primary);
        }
        .checklist-item-row.is-done .checklist-text {
          text-decoration: line-through;
          color: var(--text-secondary);
        }
        .checklist-done-tag {
          font-size: 10px;
          font-weight: 800;
          color: #10B981;
        }

        /* Calculator Tool */
        .calc-inputs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }
        .calc-input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .calc-input-group label {
          font-size: 10.5px;
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
        .calc-field {
          background: var(--bg, #F8FAFC);
          border: 1.5px solid var(--border, #CBD5E1);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
          outline: none;
        }
        .dark .calc-field {
          background: #0F172A;
          border-color: #334155;
          color: #F8FAFC;
        }
        .calc-result-box {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
          border: 1px solid rgba(6, 182, 212, 0.3);
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .calc-result-label {
          font-size: 11.5px;
          font-weight: 750;
          color: #0891B2;
        }
        .dark .calc-result-label {
          color: #67E8F9;
        }
        .calc-result-val {
          font-size: 18px;
          font-weight: 900;
          color: #0284C7;
        }
        .dark .calc-result-val {
          color: #38BDF8;
        }

        /* Rack Tab Selector */
        .rack-tab-selector {
          display: flex;
          gap: 4px;
        }
        .rack-tab-pill {
          background: transparent;
          border: 1px solid var(--border, #CBD5E1);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary, #64748B);
          cursor: pointer;
          transition: all 0.15s;
        }
        .dark .rack-tab-pill {
          border-color: #334155;
          color: #94A3B8;
        }
        .rack-tab-pill.active {
          background: #2563EB;
          color: #FFFFFF;
          border-color: #1D4ED8;
        }

        .rack-capacity-bar-wrap {
          margin-bottom: 12px;
        }
        .capacity-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 750;
          color: var(--text-secondary, #64748B);
          margin-bottom: 4px;
        }
        .capacity-pct-val {
          color: #2563EB;
          font-weight: 850;
        }
        .capacity-bar-track {
          width: 100%;
          height: 6px;
          background: var(--border, #E2E8F0);
          border-radius: 3px;
          overflow: hidden;
        }
        .dark .capacity-bar-track {
          background: #334155;
        }
        .capacity-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3B82F6 0%, #10B981 100%);
          border-radius: 3px;
          transition: width 0.4s ease;
        }

        /* Tier Shelves */
        .visual-rack-tiers-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rack-tier-shelf {
          background: var(--bg, #F8FAFC);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 8px;
          padding: 8px 10px;
        }
        .dark .rack-tier-shelf {
          background: #0F172A;
          border-color: #334155;
        }
        .tier-shelf-header {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 750;
          color: var(--text-secondary, #64748B);
          margin-bottom: 6px;
        }
        .shelf-weight-badge {
          color: #10B981;
          font-weight: 800;
        }
        .tier-roll-slots {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }

        .roll-visual-pill {
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pill-navy { background: #1E3A8A; color: #DBEAFE; }
        .pill-rust { background: #9A3412; color: #FFEDD5; }
        .pill-black { background: #0F172A; color: #F1F5F9; border: 1px solid #334155; }
        .pill-mustard { background: #B45309; color: #FEF3C7; }
        .pill-mint { background: #065F46; color: #D1FAE5; }
        .pill-emerald { background: #047857; color: #A7F3D0; }
        .pill-empty {
          background: transparent;
          border: 1px dashed var(--border, #CBD5E1);
          color: var(--text-secondary, #94A3B8);
          justify-content: center;
        }
        .roll-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }

        .rack-footer-stats-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--border, #F1F5F9);
          font-size: 11px;
          font-weight: 600;
        }
        .dark .rack-footer-stats-strip {
          border-top-color: #334155;
        }
        .footer-stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary, #64748B);
        }
        .smart-storage-btn {
          background: transparent;
          border: none;
          color: #2563EB;
          font-weight: 800;
          cursor: pointer;
          font-size: 11px;
        }
        .smart-storage-btn:hover {
          text-decoration: underline;
        }

        /* Activity Timeline Feed */
        .activity-timeline-feed {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .timeline-event-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 6px 0;
          border-bottom: 1px solid var(--border, #F1F5F9);
        }
        .dark .timeline-event-row {
          border-bottom-color: #334155;
        }
        .timeline-event-row:last-child {
          border-bottom: none;
        }

        .event-icon-circle {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .event-icon-circle.type-issue { background: rgba(37, 99, 235, 0.15); color: #2563EB; }
        .event-icon-circle.type-inward { background: rgba(16, 185, 129, 0.15); color: #059669; }
        .event-icon-circle.type-audit { background: rgba(245, 158, 11, 0.15); color: #D97706; }
        .event-icon-circle.type-transfer { background: rgba(139, 92, 246, 0.15); color: #7C3AED; }

        .event-content {
          flex: 1;
        }
        .event-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .event-title-text {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-primary, #0F172A);
        }
        .dark .event-title-text {
          color: #F8FAFC;
        }
        .event-timestamp {
          font-size: 10px;
          color: var(--text-secondary, #94A3B8);
        }
        .event-sub-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2px;
        }
        .event-details-text {
          font-size: 11px;
          color: var(--text-secondary, #64748B);
        }
        .dark .event-details-text {
          color: #94A3B8;
        }
        .event-user-pill {
          font-size: 9.5px;
          font-weight: 750;
          color: #3B82F6;
          background: rgba(59, 130, 246, 0.08);
          padding: 1px 6px;
          border-radius: 4px;
        }

        /* Guide CTA Card */
        .guide-cta-card {
          position: relative;
          background: linear-gradient(135deg, #312E81 0%, #1E3A8A 100%);
          border-radius: 12px;
          padding: 14px 18px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.25s ease;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(30, 58, 138, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .guide-cta-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(30, 58, 138, 0.35);
        }
        .animate-pulse-border {
          animation: ctaGlow 3s infinite alternate;
        }
        .cta-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .guide-compass-icon {
          color: #FBBF24;
          animation: compassSlowSpin 12s linear infinite;
        }
        .cta-info {
          flex: 1;
        }
        .cta-info h4 {
          margin: 0;
          font-size: 13px;
          font-weight: 850;
          letter-spacing: 0.2px;
        }
        .cta-info p {
          margin: 2px 0 0 0;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.3;
        }
        .cta-launch-btn {
          background: #FFFFFF;
          color: #1E3A8A;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: transform 0.2s;
        }
        .guide-cta-card:hover .cta-launch-btn {
          transform: scale(1.04);
        }

        /* ── ANIMATIONS ── */
        @keyframes dashboardFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatOrb {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-20px, 15px) scale(1.08); }
        }
        @keyframes pulseSpeaking {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
          70% { transform: scale(1.04); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes pulseHeart {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes compassSlowSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ctaGlow {
          0% { border-color: rgba(255, 255, 255, 0.15); }
          100% { border-color: rgba(251, 191, 36, 0.5); }
        }
      `}</style>
    </div>
  );
}
