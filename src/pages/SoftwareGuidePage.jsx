import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackagePlus, Warehouse, Scissors, Droplets, ShieldCheck,
  FileSpreadsheet, ArrowLeft, ChevronRight, CheckCircle2,
  Lightbulb, Workflow, Volume2, VolumeX, FolderTree, Sparkles,
  Search, Shield, History, Printer, Scale, Ruler, Database,
  Grid, AlertCircle, Layers, ClipboardList, Settings, Home,
  Boxes, BarChart3
} from 'lucide-react';

export default function SoftwareGuidePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('index'); // 'index' | 'pipeline' | 'scenarios'
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(4000);
  const [searchModuleQuery, setSearchModuleQuery] = useState('');

  // Voice Narration State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechLang, setSpeechLang] = useState('hi-IN'); // 'hi-IN' | 'en-US'
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const utteranceRef = useRef(null);

  // Complete Master Module & Sub-Module Tree for the Index Panel
  const moduleIndexTree = [
    {
      id: 'mod-stock-add',
      title: 'Stock Management & Inward',
      titleHi: 'स्टॉक मैनेजमेंट और कपड़ा इनवर्ड',
      icon: PackagePlus,
      color: '#2563EB',
      badge: '9 Sub-Modules',
      subModules: [
        { name: 'Material Master', path: '/materials', icon: Boxes, desc: 'Central fabric items, types & shades catalogue' },
        { name: 'Old Inventory', path: '/old-inventory', icon: History, desc: 'Historical opening fabric stock rolls' },
        { name: 'Material Add (Fabric Sticker)', path: '/fabric-sticker', icon: Printer, desc: 'Inward rolls & print thermal barcode stickers' },
        { name: 'Dyeing Material Inward', path: '/dyeing-material', icon: Droplets, desc: 'Log dyeing challans, colors & roll weights' },
        { name: 'Fabric Stock (Meters)', path: '/fabric-stock', icon: Ruler, desc: 'Track fabric inventory measured in meters' },
        { name: 'Fabric Stock (KGs)', path: '/fabric-stock-kgs', icon: Scale, desc: 'Track fabric inventory measured in kilograms' },
        { name: 'Material Against PO', path: '/material-against-po', icon: FileSpreadsheet, desc: 'Verify incoming goods with Purchase Orders' },
        { name: 'Fabric PO Audit', path: '/fabric-po-audit', icon: Database, desc: 'Reconcile vendor invoices against purchase orders' },
        { name: 'Re-Add Material in Stock', path: '/re-add-material', icon: Printer, desc: 'Re-introduce returned or corrected rolls' }
      ]
    },
    {
      id: 'mod-warehouse',
      title: 'Warehouse, Racks & Storage',
      titleHi: 'वेयरहाउस शेल्फ, रैक और स्टोरेज',
      icon: Warehouse,
      color: '#059669',
      badge: '5 Sub-Modules',
      subModules: [
        { name: 'Warehouse 3D Map', path: '/warehouse', icon: Warehouse, desc: 'Visual 3D room, rack, and shelf inventory' },
        { name: 'Storage AI Recommendation', path: '/recommendation', icon: Sparkles, desc: 'Smart automated rack and shelf bin suggestion' },
        { name: 'Material Receive (GRN)', path: '/grn', icon: PackagePlus, desc: 'Official Goods Receipt Note with challan logging' },
        { name: 'Material Transfer', path: '/transfer', icon: Workflow, desc: 'Move rolls between racks with Admin approval' },
        { name: 'Fabric Returns Log', path: '/fabric-receiving-history', icon: History, desc: 'Audit returned fabric rolls history' }
      ]
    },
    {
      id: 'mod-parta',
      title: 'Job Order Matrix & Cutting Issue',
      titleHi: 'जॉब ऑर्डर पार्टा और कटिंग टेबल इशू',
      icon: Scissors,
      color: '#D97706',
      badge: '5 Sub-Modules',
      subModules: [
        { name: 'Job Order Matrix (Parta)', path: '/parta', icon: Grid, desc: 'Table-wise cutting allocation & fabric assignment' },
        { name: 'Job Orders Management', path: '/job-orders', icon: Layers, desc: 'Master production job orders and garment styles' },
        { name: 'Material Issue', path: '/issue', icon: Scissors, desc: 'Issue rolls to cutting halls with balance deduction' },
        { name: 'Daily Fabric Issue Log', path: '/reports/daily-fabric-issue', icon: FileSpreadsheet, desc: 'Timestamped fabric dispatch logs by table' },
        { name: 'Pending Info in Parta', path: '/parta-pending', icon: AlertCircle, desc: 'Track pending lot details in cutting tables' }
      ]
    },
    {
      id: 'mod-shortage',
      title: 'Dyeing Shortage & Quality Audit',
      titleHi: 'डाइंग शॉर्टेज और 7-पॉइंट QC ऑडिट',
      icon: Droplets,
      color: '#7C3AED',
      badge: '3 Sub-Modules',
      subModules: [
        { name: 'Shortage Report Form', path: '/shortage-report-form', icon: FileSpreadsheet, desc: 'Log roll bifurcations and calculate weight loss' },
        { name: 'Dyeing Shortage & QC Report', path: '/reports/dyeing-shortage', icon: Droplets, desc: '3-Scenario stock audit, 7-point QC & PDF export' },
        { name: 'Table Wise Classification', path: '/reports/table-wise-classification', icon: Layers, desc: 'Classify fabric distribution across tables' }
      ]
    },
    {
      id: 'mod-reports',
      title: 'Daily Production & Inventory Reports',
      titleHi: 'डेली प्रोडक्शन और इन्वेंटरी रिपोर्ट्स',
      icon: BarChart3,
      color: '#E11D48',
      badge: '7 Sub-Modules',
      subModules: [
        { name: 'Daily Cutting Master Report', path: '/reports/daily-cutting-report', icon: Scissors, desc: 'Master daily cutting ledger and roll consumption' },
        { name: 'Cutter Master Wise Report', path: '/reports/daily-cutting/cutter-master', icon: Scissors, desc: 'Productivity metrics categorized by cutter master' },
        { name: 'Supervisor Wise Report', path: '/reports/daily-cutting/supervisor', icon: Layers, desc: 'Output comparison by floor supervisor' },
        { name: 'Cutting Hall Wise Report', path: '/reports/daily-cutting/hall', icon: Warehouse, desc: 'Cutting volume grouped by factory halls' },
        { name: 'Cutting Location Wise Report', path: '/reports/daily-cutting/location', icon: Grid, desc: 'Cutting distribution across warehouse locations' },
        { name: 'Quantity Wise Inventory', path: '/reports/daily-inventory/quantity-wise', icon: Scale, desc: 'Total fabric weight balance by roll count' },
        { name: 'Item Wise Inventory', path: '/reports/daily-inventory/item-wise', icon: Boxes, desc: 'Breakdown by Fleece, Interlock, Rib & Single Jersey' }
      ]
    },
    {
      id: 'mod-admin',
      title: 'Admin, Approvals & System',
      titleHi: 'एडमिन अप्रूवल और सेटिंग्स',
      icon: Shield,
      color: '#0F172A',
      badge: '4 Sub-Modules',
      subModules: [
        { name: 'Dashboard Home', path: '/', icon: Home, desc: 'Main control center with KPI analytics' },
        { name: 'Admin Approval Panel', path: '/approvals', icon: ShieldCheck, desc: 'Authorize special issuance & rack transfer requests' },
        { name: 'Attendance System', path: '/attendance', icon: ClipboardList, desc: 'Operator and staff attendance logs' },
        { name: 'System Settings', path: '/settings', icon: Settings, desc: 'User management, dark mode & system configuration' }
      ]
    }
  ];

  // 6 Lifecycle Stages for Live Animated Flow
  const stages = [
    {
      id: 'step-inward',
      stepNum: 1,
      tag: 'STAGE 1: INWARD & BARCODE',
      titleEn: 'Fabric Inward, PO Verification & Barcode Printing',
      titleHi: 'कपड़ा इनवर्ड, वजन और बारकोड स्टीकर जनरेशन',
      shortTitle: '1. Inward & Stickers',
      icon: PackagePlus,
      color: '#2563EB',
      summary: 'When fabric rolls arrive from yarn suppliers, knitting mills, or processors, they are weighed on digital scales and barcoded.',
      role: 'Store Inward Operator & Gate Incharge',
      voiceHi: 'स्टेप 1: कपड़ा इनवर्ड और बारकोड स्टीकर। जब मिल से कपड़ा आता है, तो डिजिटल कांटे पर हर रोल का वजन तोला जाता है। सॉफ्टवेयर में लॉट नंबर, फैब्रिक का नाम, शेड और वजन डालकर बारकोड स्टीकर प्रिंट किया जाता है।',
      voiceEn: 'Step 1: Fabric Inward and Barcode Sticker. When fabric arrives, each roll is weighed digitally. Unique lot numbers and printable barcode stickers are generated, saving initial inward weight into the database.',
      pages: [
        { name: 'Material Add (Fabric Sticker)', path: '/fabric-sticker', desc: 'Print physical roll labels & stickers' },
        { name: 'Material Against PO', path: '/material-against-po', desc: 'Verify incoming rolls against Purchase Orders' },
        { name: 'GRN (Goods Receipt Note)', path: '/grn', desc: 'Log official store receipt with challan number' }
      ],
      workings: [
        {
          point: 'Roll-by-Roll Physical Weighing & Counting',
          detail: 'Each fabric roll is weighed on digital scales. Number of rolls and total weight in KGs or Meters are recorded directly into the system.'
        },
        {
          point: 'Lot Number & Barcode Generation',
          detail: 'System allocates a unique Lot Number (e.g. MH-4537) and generates thermal printable roll stickers containing Lot No, Fabric Name, Shade, Gross Weight, Net Weight, and Barcode.'
        },
        {
          point: 'PO Compliance & Vendor Challan Check',
          detail: 'Software checks ordered PO quantity vs delivered challan quantity to ensure no excess dispatch or wrong fabric shade is accepted.'
        }
      ],
      tips: [
        '💡 Tip: Always scan the roll barcode or enter exact Lot Number so that all future cutting and shortage tracking links automatically.',
        '⚠️ Small Rule: If roll weight has more than 5% difference from vendor bill, flag as "Weight Discrepancy" before unloading.',
        '🔄 System Action: Automatically updates both MySQL `DyeingMaterials` / `FabricStock` tables and syncs with Google Sheets API.'
      ],
      formula: 'Inward Gross Weight = Net Fabric Weight + Paper Tube / Tare Weight (approx 0.400 - 0.600 KG per roll)'
    },
    {
      id: 'step-warehouse',
      stepNum: 2,
      tag: 'STAGE 2: WAREHOUSE ALLOCATION',
      titleEn: 'Smart Storage Recommendation & 3D Warehouse Binning',
      titleHi: 'वेयरहाउस शेल्फ, रैक और ऑटोमैटिक स्टोरेज लोकेशन',
      shortTitle: '2. Warehouse Bins',
      icon: Warehouse,
      color: '#059669',
      summary: 'Storing hundreds of fabric rolls in systematic room, rack, and shelf coordinates for lightning-fast retrieval.',
      role: 'Warehouse Floor Manager & Shelf Operators',
      voiceHi: 'स्टेप 2: वेयरहाउस शेल्फ और रैक मैनेजमेंट। सिस्टम फैब्रिक के प्रकार और शेड के आधार पर अपने आप खाली शेल्फ और रैक का सुझाव देता है, ताकि कपड़ा ढूंढना आसान हो और रैक ओवरलोड न हो।',
      voiceEn: 'Step 2: Warehouse Racks and Storage. The software automatically recommends optimal room, rack, and shelf locations matching fabric category and prevents rack capacity overfill.',
      pages: [
        { name: 'Warehouse 3D Map', path: '/warehouse', desc: 'Visual room and rack capacity monitor' },
        { name: 'Storage Recommendation', path: '/recommendation', desc: 'Automated AI binning suggestion' },
        { name: 'Internal Transfer', path: '/transfer', desc: 'Move rolls between racks with Admin approval' }
      ],
      workings: [
        {
          point: 'Smart Location Suggestion Algorithm',
          detail: 'When adding rolls, the system suggests the nearest available Shelf (e.g. Room A -> Rack 2 -> Shelf 3) matching the same Fabric Category and Shade.'
        },
        {
          point: 'Real-time Capacity & Overfill Protection',
          detail: 'Every rack has a maximum roll capacity limit (e.g. 50 rolls). The software blocks overfilling and prevents misplacing heavy rolls on top racks.'
        },
        {
          point: 'Controlled Internal Transfer with Admin Approval',
          detail: 'If an operator moves fabric between racks, an automatic transfer request is generated. Admin must approve or reject in the Approval Panel.'
        }
      ],
      tips: [
        '💡 Tip: Use the visual Warehouse Grid to see color-coded occupancy (Green = Empty, Yellow = Partial, Red = Full).',
        '⚠️ Small Rule: Never mix fleece and single jersey on the same shelf to avoid fiber contamination.',
        '🔄 System Action: Updates live capacity counter in real time across all connected devices.'
      ],
      formula: 'Shelf Occupancy % = (Current Loaded Rolls / Maximum Shelf Capacity) * 100'
    },
    {
      id: 'step-parta',
      stepNum: 3,
      tag: 'STAGE 3: CUTTING ISSUE & PARTA',
      titleEn: 'Job Order Matrix (Parta), Eligibility & Cutting Table Issue',
      titleHi: 'जॉब ऑर्डर पार्टा मैट्रिक्स और कटिंग टेबल इशू',
      shortTitle: '3. Parta & Issue',
      icon: Scissors,
      color: '#D97706',
      summary: 'Issuing specific lots to cutting masters, supervisors, and tables based on production job orders and cutting requirements.',
      role: 'Cutting Master, Floor Supervisor & Store Dispatcher',
      voiceHi: 'स्टेप 3: जॉब ऑर्डर पार्टा मैट्रिक्स और कटिंग इशू। प्रोडक्शन जॉब ऑर्डर के अनुसार कटिंग टेबल और कटर मास्टर को कपड़ा इशू किया जाता है। इशू होते ही वेयरहाउस से बैलेंस रोल और वजन अपने आप घट जाता है।',
      voiceEn: 'Step 3: Job Order Matrix and Cutting Issue. Fabric is dispatched to cutting tables and cutter masters based on job order requirements, instantly calculating remaining balance stock.',
      pages: [
        { name: 'Job Order Matrix (Parta)', path: '/parta', desc: 'Live job order cutting table matrix' },
        { name: 'Daily Fabric Issue', path: '/reports/daily-fabric-issue', desc: 'Dispatch logs by table & date' },
        { name: 'Admin Approval Panel', path: '/approvals', desc: 'Authorize special issuance requests' }
      ],
      workings: [
        {
          point: 'Parta Matrix Fabric Allocation',
          detail: 'The software checks Job Order specifications (e.g. JO-332 for 5,000 T-Shirts requiring 520 KG Olive Fleece). It displays matching available lots in stock.'
        },
        {
          point: 'Eligibility Verification & Admin Override',
          detail: 'If a cutter requests a lot that does not match Job Order shade or table criteria, software locks the issue and sends a "Special Issuance Request" to Admin with operator reason.'
        },
        {
          point: 'Automatic Balance Calculation upon Dispatch',
          detail: 'When 10 rolls (250 KG) are issued out of a 20-roll lot (500 KG), software instantly updates remaining balance (10 rolls / 250 KG) in warehouse stock.'
        }
      ],
      tips: [
        '💡 Tip: Cutting masters can view exact Table Numbers (e.g. Table 2, Table 4) to ensure accurate lay planning.',
        '⚠️ Small Rule: If Admin rejects a special issue request, the system prevents printing the issue slip.',
        '🔄 System Action: Deducts stock from warehouse inventory and logs a timestamped dispatch entry in the Daily Issue Log.'
      ],
      formula: 'Remaining Warehouse Stock = Total Inward Quantity - Cumulative Issued to Tables'
    },
    {
      id: 'step-shortage',
      stepNum: 4,
      tag: 'STAGE 4: DYEING SHORTAGE AUDIT',
      titleEn: 'Dual Weight Shortage Calculation & 3-Scenario Stock Audit',
      titleHi: 'डाइंग शॉर्टेज कैलकुलेशन और 3-केस स्टॉक ट्रैकिंग',
      shortTitle: '4. Dyeing Shortage',
      icon: Droplets,
      color: '#7C3AED',
      summary: 'Auditing material sent to dye houses vs billed invoice weights vs actual received weights to detect process loss and track pending mill stock.',
      role: 'Fabric QC Inspector, Dyeing Store Incharge & Accounts Auditor',
      voiceHi: 'स्टेप 4: डाइंग शॉर्टेज और स्टॉक ऑडिट। यह तीन केस को ट्रैक करता है: केस 1 में पूरा माल बराबर आया। केस 2 में डाइंग प्रोसेस में वजन कम हुआ। केस 3 में आधा बिल आया और बाकी माल मिल में पेंडिंग है।',
      voiceEn: 'Step 4: Dyeing Shortage and 3-Scenario Audit. Automatically classifies stock into Case 1 (Balanced), Case 2 (Dyeing Shortage Loss), and Case 3 (Partial Bill with Pending Mill Stock).',
      pages: [
        { name: 'Shortage Report Form', path: '/shortage-report-form', desc: 'Interactive roll bifurcation & shortage logging' },
        { name: 'Dyeing Shortage Report', path: '/reports/dyeing-shortage', desc: 'High-density report with scenario badges & PDF download' }
      ],
      workings: [
        {
          point: 'The 3 Business Cases of Dyeing Stock Audit',
          detail: 'Case 1 (Full & Equal: Issued = Billed = Recd = 0% Shortage); Case 2 (Dyeing Shortage: Issued = Billed != Recd -> Process weight loss); Case 3 (Partial Bill: Issued > Billed = Recd -> 0% loss on current bill, balance pending with mill).'
        },
        {
          point: 'Bifurcation between Main Fabric & RIB',
          detail: 'When a single lot contains both Fleece (e.g. 520.35 KG) and matching RIB (e.g. 84.00 KG), software creates individual classifications while generating a unified combined PDF.'
        },
        {
          point: 'Direct Google Sheets v4 API & MySQL Roll Query',
          detail: 'Entering a Lot No automatically pulls FabricStock sheet entries, verifies MySQL rolls, and lets operators toggle Completed vs Pending status.'
        }
      ],
      tips: [
        '💡 Tip: In Case 3 (e.g. 200 KG issued, 150 KG billed & received), the shortage is 0.00 KG because the invoice is clean, but 50.00 KG is tracked as "Pending at Mill".',
        '⚠️ Small Rule: Any shortage above 10% or weight loss > 50 KG is automatically flagged as "REJECT" for investigation.',
        '🔄 System Action: Saves structured audit record with billNumber and triggers instant composite PDF download.'
      ],
      formula: 'Shortage on Bill = Billed Qty - Received Weight  |  Pending Mill Stock = Issued Qty - Billed Qty'
    },
    {
      id: 'step-qc',
      stepNum: 5,
      tag: 'STAGE 5: 7-POINT QUALITY AUDIT',
      titleEn: 'Per-Lot 7-Point Physical Fabric QC Inspection',
      titleHi: 'प्रति-लॉट 7-पॉइंट फिजिकल क्वालिटी और फैब्रिक चेकिंग',
      shortTitle: '5. 7-Point QC',
      icon: ShieldCheck,
      color: '#0284C7',
      summary: 'Before fabric is approved for spreading on the cutting table, the QC inspector conducts a 7-point physical inspection against technical specifications.',
      role: 'Quality Assurance Inspector & Cutting Incharge',
      voiceHi: 'स्टेप 5: 7-पॉइंट क्वालिटी इंस्पेक्शन। कटिंग से पहले कपड़े की सफाई, हैंड फील, रेडी डाया, रेडी जीएसएम, रिब का डाया, रिब की सफाई और शेड मैचिंग को चेक करके पास या फेल किया जाता है।',
      voiceEn: 'Step 5: 7-Point Quality Audit. Before cutting, fabric is physically tested for Cleanliness, Hand Feel, DIA width, GSM density, RIB DIA, and Color Matching, generating a monochrome 2-page PDF report.',
      pages: [
        { name: 'Shortage Report QC Dialog', path: '/reports/dyeing-shortage', desc: 'Interactive 7-point QC inspection modal' }
      ],
      workings: [
        {
          point: 'The 7 Mandatory QC Inspection Parameters',
          detail: '1. FABRIC SAAF HAI YA NHI (Cleanliness), 2. HAND FEEL THIK HAI YA NHI (Softness/Texture), 3. READY DIA KITNA HAI (Finished Width in inches), 4. READY GSM KITNA HAI (Density with GSM cutter), 5. RIB KA DIA KITNA HAI (Collar/Cuff Width), 6. RIB SAAF HAI YA NHI (Fluff/Lint Check), 7. KAPDA S RIB KI MATCHING OK HAI YA NHI (100% Tone Match).'
        },
        {
          point: 'Instant QC Approval / Rejection Verdict',
          detail: 'Inspector selects "QC Pass (Ready for Cutting)" or "QC Reject (Hold Lot)". Software stores inspector name, timestamp, and notes in database.'
        },
        {
          point: 'Monochrome 2-Page Composite PDF Generation',
          detail: 'Generates Page 1 (Dyeing Shortage & Shrinkage Breakdown) and Page 2 (Final Fabric Inspection Audit Sheet with Knitting Head Signature box).'
        }
      ],
      tips: [
        '💡 Tip: All checklist parameters are Romanized ASCII text to ensure zero corrupted symbols in PDF generators.',
        '⚠️ Small Rule: If RIB shade does not match main body fabric, mark Question #7 as "MISMATCH" to hold the lot from cutting.',
        '🔄 System Action: Updates `inspectionDetails` JSON column in MySQL and reflects live badge on Dyeing Shortage dashboard.'
      ],
      formula: 'GSM Density = (Weight of 100cm² round cutter sample in grams) * 100'
    },
    {
      id: 'step-reports',
      stepNum: 6,
      tag: 'STAGE 6: PRODUCTION REPORTS',
      titleEn: 'Multi-Dimension Production, Cutter & Inventory Analytics',
      titleHi: 'डेली कटिंग, सुपरवाइजर, हॉल और इन्वेंटरी रिपोर्ट्स',
      shortTitle: '6. Production Reports',
      icon: FileSpreadsheet,
      color: '#E11D48',
      summary: 'Comprehensive multi-dimensional reports for management, production heads, accounts, and audit teams.',
      role: 'Production Head, Store Manager & Accounts Head',
      voiceHi: 'स्टेप 6: डेली प्रोडक्शन और इन्वेंटरी रिपोर्ट्स। कटर मास्टर, सुपरवाइजर और कटिंग हॉल के हिसाब से डेली रिपोर्ट तैयार होती है, जिसे एक क्लिक में एक्सेल या पीडीएफ में डाउनलोड किया जा सकता है।',
      voiceEn: 'Step 6: Daily Production and Inventory Reports. Provides cutter master-wise, supervisor-wise, and hall-wise daily cutting analytics with instant one-click Excel and PDF export.',
      pages: [
        { name: 'Daily Cutting Report', path: '/reports/daily-cutting-report', desc: 'Master daily cutting ledger' },
        { name: 'Cutter Master Wise', path: '/reports/daily-cutting/cutter-master', desc: 'Productivity by cutter master' },
        { name: 'Supervisor & Hall Wise', path: '/reports/daily-cutting/supervisor', desc: 'Hall-wise output comparison' },
        { name: 'Quantity Wise Inventory', path: '/reports/daily-inventory/quantity-wise', desc: 'Total fabric roll stock balance' }
      ],
      workings: [
        {
          point: 'Cutter Master & Supervisor Productivity Tracking',
          detail: 'Tracks how many garments/rolls each cutter master and supervisor cut on each table per shift.'
        },
        {
          point: 'Total Warehouse Quantity & Item-Wise Stock',
          detail: 'Shows real-time stock balance across Fleece, Single Jersey, Interlock, RIB, Collars, and Tapes.'
        },
        {
          point: 'One-Click Excel (XLSX) Export & Thermal Printing',
          detail: 'Every table has instant CSV/Excel export with styled headers and browser print preview.'
        }
      ],
      tips: [
        '💡 Tip: Use the date filter on Daily Cutting Report to generate weekly or monthly production summaries.',
        '⚠️ Small Rule: Reconcile warehouse stock against Google Sheets at the end of each working day.',
        '🔄 System Action: Automatically consolidates data from issue slips, cutter logs, and shortage tables.'
      ],
      formula: 'Cutting Efficiency % = (Actual Garment Output Weight / Total Issued Fabric Weight) * 100'
    }
  ];

  // Speech Synthesizer Functions
  const stopSpeech = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingIndex(null);
  };

  const speakText = (text, idx = null, onEnd = null) => {
    if (!window.speechSynthesis) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.includes(speechLang.split('-')[0])) || voices[0];
    if (matchedVoice) utterance.voice = matchedVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (idx !== null) {
        setSpeakingIndex(idx);
        setSelectedStepIndex(idx);
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingIndex(null);
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingIndex(null);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const startFullAudioTour = () => {
    setIsAutoPlaying(false);
    let curr = 0;

    const playNext = () => {
      if (curr >= stages.length) {
        setIsSpeaking(false);
        setSpeakingIndex(null);
        return;
      }
      const s = stages[curr];
      const txt = speechLang === 'hi-IN' ? s.voiceHi : s.voiceEn;
      speakText(txt, curr, () => {
        curr++;
        setTimeout(playNext, 600);
      });
    };

    playNext();
  };

  useEffect(() => {
    let timer = null;
    if (isAutoPlaying && !isSpeaking && activeTab === 'pipeline') {
      timer = setInterval(() => {
        setSelectedStepIndex(prev => (prev + 1) % stages.length);
      }, playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isAutoPlaying, isSpeaking, playbackSpeed, activeTab]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const activeStage = stages[selectedStepIndex];

  // Filter modules in Index panel
  const filteredModules = moduleIndexTree.map(mod => {
    const q = searchModuleQuery.toLowerCase().trim();
    if (!q) return mod;
    const matchModTitle = mod.title.toLowerCase().includes(q) || mod.titleHi.toLowerCase().includes(q);
    const matchedSubs = mod.subModules.filter(sub =>
      sub.name.toLowerCase().includes(q) || sub.desc.toLowerCase().includes(q)
    );
    if (matchModTitle) return mod;
    if (matchedSubs.length > 0) return { ...mod, subModules: matchedSubs };
    return null;
  }).filter(Boolean);

  return (
    <div className="twms-guide-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');

        /* LIGHT & DARK MODE CSS VARIABLES */
        .twms-guide-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: var(--text-primary, #0F172A);
          padding: 6px;
          min-height: calc(100vh - 60px);
          background: var(--bg, #F8FAFC);
        }

        .guide-container {
          max-width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* 1. Header Hero Strip */
        .guide-header-hero {
          background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #1D4ED8 100%);
          border-radius: 8px;
          padding: 8px 14px;
          color: #FFFFFF;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
          flex-wrap: wrap;
          gap: 8px;
        }

        .dark .guide-header-hero {
          background: linear-gradient(135deg, #020617 0%, #1E1B4B 50%, #1E3A8A 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .hero-left-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .hero-icon-square {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
        }

        .hero-title-group h1 {
          font-size: 15.5px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.3px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hero-title-group p {
          margin: 0;
          font-size: 11px;
          color: #93C5FD;
        }

        .hero-btn-action {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          font-weight: 700;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .hero-btn-action:hover { background: rgba(255, 255, 255, 0.25); }

        /* 2. Top Navigation Mode Switcher */
        .guide-mode-switcher {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 8px;
          padding: 4px;
          display: flex;
          gap: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .dark .guide-mode-switcher {
          background: #1E293B;
          border-color: #334155;
        }

        .guide-mode-tab {
          flex: 1;
          padding: 6px 12px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary, #64748B);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .guide-mode-tab.active {
          background: #2563EB;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        }

        .dark .guide-mode-tab:not(.active) {
          color: #94A3B8;
        }
        .dark .guide-mode-tab:hover:not(.active) {
          background: #334155;
          color: #F8FAFC;
        }

        /* 3. Audio Voice Tour Banner */
        .voice-action-bar {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 8px;
          padding: 6px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .dark .voice-action-bar {
          background: #1E293B;
          border-color: #334155;
        }

        .voice-title-pill {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .voice-mic-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #EEF2FF;
          color: #4F46E5;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dark .voice-mic-icon {
          background: #312E81;
          color: #A5B4FC;
        }

        .voice-text-title {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-primary, #1E1B4B);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dark .voice-text-title { color: #F8FAFC; }

        .voice-text-sub {
          font-size: 10.5px;
          color: var(--text-secondary, #64748B);
        }
        .dark .voice-text-sub { color: #94A3B8; }

        .btn-voice-play {
          background: #10B981;
          color: #FFFFFF;
          border: none;
          font-weight: 800;
          font-size: 11.5px;
          padding: 5px 12px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .btn-voice-play:hover { background: #059669; }

        .btn-voice-stop {
          background: #EF4444;
          color: #FFFFFF;
          border: none;
          font-weight: 800;
          font-size: 11.5px;
          padding: 5px 12px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .lang-pill-btn {
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid var(--border, #CBD5E1);
          background: var(--bg, #F8FAFC);
          color: var(--text-primary, #475569);
          cursor: pointer;
        }
        .dark .lang-pill-btn {
          background: #334155;
          border-color: #475569;
          color: #E2E8F0;
        }
        .lang-pill-btn.active {
          background: #2563EB !important;
          color: #FFFFFF !important;
          border-color: #1D4ED8 !important;
        }

        /* 4. MASTER INDEX TREE PANEL (Main Module -> Sub Module -> Direct Navigate) */
        .index-panel-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .index-search-bar {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 8px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dark .index-search-bar {
          background: #1E293B;
          border-color: #334155;
        }

        .index-search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 12px;
          color: var(--text-primary, #0F172A);
          outline: none;
        }
        .dark .index-search-input { color: #F8FAFC; }

        .index-tree-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .main-module-block {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
        }
        .dark .main-module-block {
          background: #1E293B;
          border-color: #334155;
        }

        .main-module-header {
          padding: 8px 12px;
          background: var(--bg, #F8FAFC);
          border-bottom: 1px solid var(--border, #E2E8F0);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .dark .main-module-header {
          background: #0F172A;
          border-color: #334155;
        }

        .main-mod-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .main-mod-icon {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
        }

        .main-mod-title {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--text-primary, #0F172A);
        }
        .dark .main-mod-title { color: #F8FAFC; }

        .main-mod-hindi {
          font-size: 10px;
          color: #2563EB;
          font-weight: 700;
        }
        .dark .main-mod-hindi { color: #60A5FA; }

        .sub-modules-list {
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sub-module-row {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid var(--border, #E2E8F0);
          background: var(--surface, #FFFFFF);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .dark .sub-module-row {
          background: #0F172A;
          border-color: #334155;
        }

        .sub-module-row:hover {
          border-color: #2563EB;
          background: #EFF6FF;
          transform: translateX(2px);
        }
        .dark .sub-module-row:hover {
          background: #1E3A8A;
          border-color: #3B82F6;
        }

        .sub-row-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sub-name {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-primary, #0F172A);
        }
        .dark .sub-name { color: #F8FAFC; }

        .sub-desc {
          font-size: 10px;
          color: var(--text-secondary, #64748B);
        }
        .dark .sub-desc { color: #94A3B8; }

        .sub-open-btn {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 10.5px;
          font-weight: 800;
          color: #2563EB;
          padding: 2px 6px;
          border-radius: 4px;
          background: #EFF6FF;
        }
        .dark .sub-open-btn {
          background: #1E293B;
          color: #60A5FA;
        }

        /* 5. 6-Stage Single-Row Compact Flow Strip */
        .stage-flow-strip {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 6px;
          width: 100%;
        }

        .stage-flow-card {
          background: var(--surface, #FFFFFF);
          border: 1.5px solid var(--border, #E2E8F0);
          border-radius: 8px;
          padding: 6px 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: all 0.2s ease;
          overflow: hidden;
        }
        .dark .stage-flow-card {
          background: #1E293B;
          border-color: #334155;
        }

        .stage-flow-card:hover {
          border-color: #3B82F6;
          background: #EFF6FF;
          transform: translateY(-1px);
        }
        .dark .stage-flow-card:hover {
          background: #1E3A8A;
          border-color: #60A5FA;
        }

        .stage-flow-card.active-flow {
          border-color: #2563EB;
          background: #EFF6FF;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
        }
        .dark .stage-flow-card.active-flow {
          background: #1E3A8A;
          border-color: #3B82F6;
        }

        .stage-flow-card.speaking-card {
          border-color: #10B981;
          background: #ECFDF5;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
        }

        .flow-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .flow-num-badge {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          background: #F1F5F9;
          color: #334155;
          font-weight: 800;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dark .flow-num-badge {
          background: #334155;
          color: #E2E8F0;
        }
        .stage-flow-card.active-flow .flow-num-badge {
          background: #2563EB;
          color: #FFFFFF;
        }

        .flow-title-text {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-primary, #0F172A);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dark .flow-title-text { color: #F8FAFC; }

        .flow-hindi-text {
          font-size: 9.5px;
          color: var(--text-secondary, #64748B);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dark .flow-hindi-text { color: #94A3B8; }

        /* 6. Spotlight Stage Card */
        .spotlight-stage-card {
          background: var(--surface, #FFFFFF);
          border: 1.5px solid var(--border, #E2E8F0);
          border-radius: 8px;
          padding: 12px 14px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .dark .spotlight-stage-card {
          background: #1E293B;
          border-color: #334155;
        }

        .spotlight-header-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .spotlight-stage-badge {
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .spotlight-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-primary, #0F172A);
          margin: 0;
        }
        .dark .spotlight-title { color: #F8FAFC; }

        .spotlight-hindi {
          font-size: 12px;
          font-weight: 700;
          color: #2563EB;
          margin: 1px 0 6px 0;
        }
        .dark .spotlight-hindi { color: #60A5FA; }

        .spotlight-summary {
          font-size: 11.5px;
          color: var(--text-secondary, #475569);
          line-height: 1.4;
          margin: 0 0 8px 0;
        }
        .dark .spotlight-summary { color: #CBD5E1; }

        .workings-list-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .working-row-item {
          background: var(--bg, #F8FAFC);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 6px;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .dark .working-row-item {
          background: #0F172A;
          border-color: #334155;
        }

        .working-point-title {
          font-size: 11.5px;
          font-weight: 800;
          color: var(--text-primary, #0F172A);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .dark .working-point-title { color: #F8FAFC; }

        .working-point-desc {
          font-size: 10.5px;
          color: var(--text-secondary, #475569);
          line-height: 1.35;
          padding-left: 17px;
        }
        .dark .working-point-desc { color: #94A3B8; }

        .spotlight-right-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tips-compact-card {
          background: var(--bg, #F8FAFC);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 6px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dark .tips-compact-card {
          background: #0F172A;
          border-color: #334155;
        }

        .tip-bullet {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-primary, #1E293B);
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 4px;
          padding: 4px 6px;
          line-height: 1.35;
        }
        .dark .tip-bullet {
          background: #1E293B;
          border-color: #334155;
          color: #E2E8F0;
        }

        .formula-compact-box {
          background: #0F172A;
          color: #F8FAFC;
          border-radius: 6px;
          padding: 6px 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .formula-compact-label {
          font-size: 8.5px;
          text-transform: uppercase;
          color: #94A3B8;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
        }

        .shortcut-pages-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 4px;
        }

        .shortcut-page-card {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 5px;
          padding: 5px 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dark .shortcut-page-card {
          background: #0F172A;
          border-color: #334155;
        }
        .shortcut-page-card:hover {
          border-color: #2563EB;
          background: #EFF6FF;
          transform: translateX(2px);
        }
        .dark .shortcut-page-card:hover {
          background: #1E3A8A;
          border-color: #60A5FA;
        }

        .shortcut-name {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-primary, #0F172A);
        }
        .dark .shortcut-name { color: #F8FAFC; }

        .shortcut-desc {
          font-size: 9.5px;
          color: var(--text-secondary, #64748B);
        }
        .dark .shortcut-desc { color: #94A3B8; }

        /* 7. 3-Scenario Cards Strip */
        .scenarios-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }

        .scenario-box {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--border, #E2E8F0);
          border-radius: 6px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .dark .scenario-box {
          background: #1E293B;
          border-color: #334155;
        }

        .scenario-box.c1 { border-top: 3px solid #10B981; }
        .scenario-box.c2 { border-top: 3px solid #F59E0B; }
        .scenario-box.c3 { border-top: 3px solid #3B82F6; }

        .scenario-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 800;
          color: var(--text-primary, #0F172A);
        }
        .dark .scenario-header-row { color: #F8FAFC; }

        .scenario-math-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--text-primary, #334155);
          font-weight: 700;
        }
        .dark .scenario-math-text { color: #CBD5E1; }

        .scenario-explanation {
          font-size: 10px;
          color: var(--text-secondary, #64748B);
          line-height: 1.35;
        }
        .dark .scenario-explanation { color: #94A3B8; }

        @media (max-width: 1024px) {
          .index-tree-grid { grid-template-columns: 1fr; }
          .stage-flow-strip { grid-template-columns: repeat(3, 1fr); }
          .spotlight-stage-card { grid-template-columns: 1fr; }
          .scenarios-grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="guide-container">

        {/* 1. Header Hero Strip */}
        <div className="guide-header-hero">
          <div className="hero-left-box">
            <div className="hero-icon-square">
              <Workflow size={18} />
            </div>
            <div className="hero-title-group">
              <h1>
                <span>Textile Warehouse Software Manual & Master Roadmap</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-white/20 uppercase">v2.5</span>
              </h1>
              <p>Master Index Panel, Workflow Pipelines, 3-Case Audit Logic & Direct Module Access</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="hero-btn-action"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={11} /> Back to Dashboard
            </button>
          </div>
        </div>

        {/* 2. Top Navigation Mode Switcher */}
        <div className="guide-mode-switcher">
          <button
            type="button"
            className={`guide-mode-tab ${activeTab === 'index' ? 'active' : ''}`}
            onClick={() => setActiveTab('index')}
          >
            <FolderTree size={14} />
            <span>1. Master Module & Sub-Module Index Explorer</span>
          </button>
          <button
            type="button"
            className={`guide-mode-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            <Workflow size={14} />
            <span>2. Live Continuous Workflow Pipeline</span>
          </button>
          <button
            type="button"
            className={`guide-mode-tab ${activeTab === 'scenarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('scenarios')}
          >
            <Scale size={14} />
            <span>3. Shortage & Stock Audit Scenarios</span>
          </button>
        </div>

        {/* 3. Audio Voice Tour Banner */}
        <div className="voice-action-bar">
          <div className="voice-title-pill">
            <div className="voice-mic-icon">
              <Volume2 size={16} />
            </div>
            <div>
              <div className="voice-text-title">
                <span>🔊 AI Audio Voice Narrator (आवाज़ में सुनें)</span>
                {isSpeaking && (
                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded text-[8.5px] font-bold uppercase animate-pulse">
                    Speaking Step {speakingIndex !== null ? speakingIndex + 1 : 'Tour'}
                  </span>
                )}
              </div>
              <div className="voice-text-sub">
                Click below to hear an instant, concise voice walkthrough of the entire software in Hindi or English!
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Switcher */}
            <button
              type="button"
              className={`lang-pill-btn ${speechLang === 'hi-IN' ? 'active' : ''}`}
              onClick={() => setSpeechLang('hi-IN')}
            >
              🇮🇳 Hindi
            </button>
            <button
              type="button"
              className={`lang-pill-btn ${speechLang === 'en-US' ? 'active' : ''}`}
              onClick={() => setSpeechLang('en-US')}
            >
              🌐 English
            </button>

            {/* Play/Stop Audio Tour Button */}
            {!isSpeaking ? (
              <button
                type="button"
                className="btn-voice-play"
                onClick={startFullAudioTour}
              >
                <Volume2 size={13} />
                <span>Play Full Voice Tour</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-voice-stop"
                onClick={stopSpeech}
              >
                <VolumeX size={13} />
                <span>Stop Voice</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: MASTER MODULE & SUB-MODULE INDEX EXPLORER */}
        {activeTab === 'index' && (
          <div className="index-panel-container">
            {/* Search Filter Bar */}
            <div className="index-search-bar">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search modules, sub-modules or features (e.g. Sticker, Parta, Shortage, Cutting, Approval)..."
                className="index-search-input"
                value={searchModuleQuery}
                onChange={e => setSearchModuleQuery(e.target.value)}
              />
              {searchModuleQuery && (
                <button
                  onClick={() => setSearchModuleQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* 2-Column Hierarchical Module Tree Grid */}
            <div className="index-tree-grid">
              {filteredModules.map((mod) => {
                const ModIcon = mod.icon;
                return (
                  <div key={mod.id} className="main-module-block">
                    {/* Main Module Header */}
                    <div className="main-module-header">
                      <div className="main-mod-left">
                        <div className="main-mod-icon" style={{ background: mod.color }}>
                          <ModIcon size={14} />
                        </div>
                        <div>
                          <div className="main-mod-title">{mod.title}</div>
                          <div className="main-mod-hindi">{mod.titleHi}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {mod.badge}
                      </span>
                    </div>

                    {/* Sub-Modules List */}
                    <div className="sub-modules-list">
                      {mod.subModules.map((sub, sIdx) => {
                        const SubIcon = sub.icon;
                        return (
                          <div
                            key={sIdx}
                            className="sub-module-row"
                            onClick={() => navigate(sub.path)}
                            title={`Navigate to ${sub.name}`}
                          >
                            <div className="sub-row-left">
                              <SubIcon size={14} style={{ color: mod.color }} className="shrink-0" />
                              <div>
                                <div className="sub-name">{sub.name}</div>
                                <div className="sub-desc">{sub.desc}</div>
                              </div>
                            </div>
                            <span className="sub-open-btn">
                              <span>Open</span>
                              <ChevronRight size={12} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE CONTINUOUS WORKFLOW PIPELINE & SPOTLIGHT */}
        {activeTab === 'pipeline' && (
          <div className="flex flex-col gap-2">
            {/* 6-Stage Single-Row Compact Flow Strip */}
            <div className="stage-flow-strip">
              {stages.map((stg, sIdx) => {
                const isSelected = selectedStepIndex === sIdx;
                const isSpeakingThis = speakingIndex === sIdx;
                const IconC = stg.icon;
                return (
                  <div
                    key={stg.id}
                    onClick={() => {
                      setSelectedStepIndex(sIdx);
                      setIsAutoPlaying(false);
                    }}
                    className={`stage-flow-card ${isSelected ? 'active-flow' : ''} ${isSpeakingThis ? 'speaking-card' : ''}`}
                  >
                    <div className="flow-top-row">
                      <div className="flow-num-badge">{stg.stepNum}</div>
                      <IconC size={13} style={{ color: stg.color }} />
                    </div>
                    <div className="flow-title-text">{stg.shortTitle}</div>
                    <div className="flow-hindi-text">{stg.titleHi}</div>
                  </div>
                );
              })}
            </div>

            {/* Active Stage Live Spotlight Card */}
            <div className="spotlight-stage-card">
              {/* Left Column: Core Workings & Explanations */}
              <div>
                <div className="spotlight-header-strip">
                  <div className="flex items-center gap-2">
                    <span
                      className="spotlight-stage-badge"
                      style={{ background: '#EFF6FF', color: activeStage.color, border: '1px solid #BFDBFE' }}
                    >
                      {activeStage.tag}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      Role: <strong className="text-slate-800 dark:text-slate-200">{activeStage.role}</strong>
                    </span>
                  </div>

                  {/* Individual Step Voice Button */}
                  <button
                    type="button"
                    className="lang-pill-btn active flex items-center gap-1"
                    onClick={() => {
                      const txt = speechLang === 'hi-IN' ? activeStage.voiceHi : activeStage.voiceEn;
                      speakText(txt, selectedStepIndex);
                    }}
                  >
                    <Volume2 size={11} />
                    <span>Listen Step (बोलकर सुनें)</span>
                  </button>
                </div>

                <h2 className="spotlight-title">{activeStage.titleEn}</h2>
                <div className="spotlight-hindi">{activeStage.titleHi}</div>
                <p className="spotlight-summary">{activeStage.summary}</p>

                <div className="workings-list-box">
                  {activeStage.workings.map((w, wIdx) => (
                    <div key={wIdx} className="working-row-item">
                      <div className="working-point-title">
                        <CheckCircle2 size={12} className="text-blue-600 shrink-0" />
                        <span>{w.point}</span>
                      </div>
                      <div className="working-point-desc">{w.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Tips, Formulas & Direct Module Links */}
              <div className="spotlight-right-col">
                <div className="tips-compact-card">
                  <div className="text-[10.5px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1">
                    <Lightbulb size={12} className="text-amber-500" />
                    <span>Important Small-to-Small Things:</span>
                  </div>
                  {activeStage.tips.map((t, tIdx) => (
                    <div key={tIdx} className="tip-bullet">{t}</div>
                  ))}
                </div>

                {activeStage.formula && (
                  <div className="formula-compact-box">
                    <span className="formula-compact-label">Calculations & Logic:</span>
                    <span>{activeStage.formula}</span>
                  </div>
                )}

                <div className="shortcut-pages-grid">
                  <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Direct Module Access:
                  </span>
                  {activeStage.pages.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      className="shortcut-page-card"
                      onClick={() => navigate(p.path)}
                    >
                      <div>
                        <div className="shortcut-name">{p.name}</div>
                        <div className="shortcut-desc">{p.desc}</div>
                      </div>
                      <div className="flex items-center gap-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        <span>Open</span>
                        <ChevronRight size={12} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 3 REAL-WORLD SHORTAGE & STOCK AUDIT SCENARIOS */}
        {activeTab === 'scenarios' && (
          <div className="scenarios-grid-3">
            <div className="scenario-box c1">
              <div className="scenario-header-row">
                <span>CASE 1: Full & Equal Delivery</span>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded font-bold text-[9px]">0% Loss</span>
              </div>
              <div className="scenario-math-text">Issued: 200kg = Billed: 200kg = Recd: 200kg</div>
              <div className="scenario-explanation">
                100% full fabric received. Zero shortage on bill. Pending at Mill is 0 KG.
              </div>
            </div>

            <div className="scenario-box c2">
              <div className="scenario-header-row">
                <span>CASE 2: Dyeing Shortage (Process Loss)</span>
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 rounded font-bold text-[9px]">Process Loss</span>
              </div>
              <div className="scenario-math-text">Issued: 200kg = Billed: 200kg != Recd: 185kg</div>
              <div className="scenario-explanation">
                Full lot billed by mill, but actual received weight is 185kg (15kg / 7.5% shortage).
              </div>
            </div>

            <div className="scenario-box c3">
              <div className="scenario-header-row">
                <span>CASE 3: Partial Bill Delivery</span>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-300 rounded font-bold text-[9px]">Balance at Mill</span>
              </div>
              <div className="scenario-math-text">Issued: 200kg -&gt; Billed: 150kg = Recd: 150kg</div>
              <div className="scenario-explanation">
                Current bill has 0% loss (150kg). 50kg balance is tracked as "Pending at Mill".
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
