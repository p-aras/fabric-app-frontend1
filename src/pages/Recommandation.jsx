import { useState, useEffect, useRef, useMemo } from 'react';
import { store } from '../store.js';
import {
  Search, Sparkles, Box, Layers, CheckCircle2, AlertCircle,
  Info, RefreshCw, Warehouse, HelpCircle, ArrowRight, X, ArrowUpRight,
  Mic, MicOff, Volume2, MessageSquare, User, Check, Send, ArrowLeft,
  Loader2, FileText, Scale
} from 'lucide-react';

const CATEGORIES = ['Summer Fabric', 'Winter Fabric', 'Accessories'];
const SUB_CATS = {
  'Summer Fabric': ['Plain Cotton', 'Woven', 'Viscose Lining', 'Double Knit', 'Cotton Twill', 'Interlock'],
  'Winter Fabric': ['Rib Knit', 'Polar Fleece', 'Heavy Denim', 'Woolen'],
  'Accessories': ['Plastic Buttons', 'Metal Zippers', 'Threads', 'Labels', 'Elastic'],
};
const UNITS = ['Roll'];

export default function Recommandation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState([]);
  const [racks, setRacks] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [parsedOcrData, setParsedOcrData] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Selected location details table states
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);

  // Placement Modal states
  const [selectedShelf, setSelectedShelf] = useState(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: '',
    category: CATEGORIES[0],
    subCategory: SUB_CATS[CATEGORIES[0]][0],
    color: '',
    supplier: '',
    weight: '100',
    rolls: '5',
    unit: 'Roll',
    status: 'Active',
    billNumber: '',
    poNumber: '',
  });
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // --- VOICE AGENT STATES ---
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentState, setAgentState] = useState('idle'); // 'idle', 'speaking', 'listening', 'processing'
  const [transcript, setTranscript] = useState('');
  const [agentReply, setAgentReply] = useState('');
  const [agentHistory, setAgentHistory] = useState([]); // [{ role: 'agent'|'user', text: '' }]
  const [keyboardInput, setKeyboardInput] = useState('');

  const recognitionRef = useRef(null);
  const stateRef = useRef({ rooms, racks, shelves, materials, searchQuery });
  useEffect(() => {
    stateRef.current = { rooms, racks, shelves, materials, searchQuery };
  });

  // Load database tables
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch active/dyeing materials and settings first (fast)
      const [settingsData, materialsData] = await Promise.all([
        store.getSettingsData(),
        store.getMaterials()
      ]);

      setRooms(settingsData.rooms || []);
      setRacks(settingsData.racks || []);
      setShelves(settingsData.shelves || []);
      setSuppliers(settingsData.suppliers || []);

      const activeList = (materialsData || []).map(m => ({
        ...m,
        inventoryType: m.category === 'Dyeing' ? 'Dyeing Material' : 'Active Inventory'
      }));

      setMaterials(activeList);
      setLoading(false); // Stop loader so page becomes interactive immediately

      // 2. Fetch legacy old inventory in the background (heavy dataset)
      setTimeout(async () => {
        try {
          const oldInvRes = await store.getInventory(1, 10000, '', '', '', '', 'All');
          const rawOldList = oldInvRes?.data || [];
          const legacyList = rawOldList
            .filter(inv => {
              const pkgs = parseInt(inv.bal_pkgs) || 0;
              const wt = parseFloat(inv.bal_wt) || 0;
              return pkgs > 0 || wt > 0;
            })
            .map(inv => ({
              id: `old-${inv.id}`,
              code: inv.barcode || `OLD-${inv.id}`,
              name: inv.item_description || 'Legacy Material',
              category: 'Old Inventory',
              color: inv.shade || '—',
              weight: parseFloat(inv.bal_wt) || 0.00,
              rolls: parseInt(inv.bal_pkgs) || 0,
              supplier: inv.party || '—',
              location: inv.store || 'Unassigned',
              status: 'Active',
              inventoryType: 'Old Inventory',
              lotNo: inv.lot_no || '—'
            }));

          // Asynchronously merge legacy list with active materials
          setMaterials(prev => [...prev, ...legacyList]);
        } catch (oldErr) {
          console.error("Error loading background legacy inventory in Recommendation:", oldErr);
        }
      }, 50);

    } catch (e) {
      console.error(e);
      setError('Failed to fetch warehouse data. Please check connection.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Init Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'hi-IN'; // Listen for Hindi/Hinglish
      rec.interimResults = true; // Real-time feedback
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setAgentState('listening');
        setTranscript('');
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          updateAgentSpeech('Mujhe koi aawaz nahi aayi. Kripya fir se try karein.');
        } else {
          setAgentState('idle');
        }
      };

      rec.onend = () => {
        setAgentState(prev => prev === 'listening' ? 'idle' : prev);
      };

      rec.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setTranscript(currentText);
        }

        if (finalTranscript.trim()) {
          setAgentHistory(prev => [...prev, { role: 'user', text: finalTranscript }]);
          processVoiceInput(finalTranscript);
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleQuickSearch = (term) => {
    setSearchQuery(term);
  };

  const getLocColors = (name) => {
    let hash = 0;
    const cleanName = String(name || 'Unassigned');
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return {
      primary: `hsl(${hue}, 65%, 48%)`,
      bgLight: `hsl(${hue}, 65%, 97%)`,
    };
  };

  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setError('');
    setParsedOcrData(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await store.parseBillOcr(formData);
      if (res.success && res.data) {
        setParsedOcrData(res.data);
        setSearchQuery(res.data.materialName || res.data.category || '');
        setSuccessToast(`GRN Invoice Scanned! Storage recommendations loaded below.`);
        setTimeout(() => setSuccessToast(''), 5000);
      } else {
        throw new Error(res.error || 'Failed to parse invoice');
      }
    } catch (err) {
      console.error(err);
      setError(`OCR Error: ${err.message}`);
    } finally {
      setOcrLoading(false);
      // Reset input element so same file can be uploaded again
      e.target.value = '';
    }
  };

  // Logic to calculate locations list (same structure as WarehousePage)
  const locationsData = useMemo(() => {
    const map = {};
    materials.forEach(m => {
      const loc = (m.location || 'Unassigned').trim();
      if (!map[loc]) {
        map[loc] = {
          id: loc,
          name: loc,
          rolls: 0,
          weight: 0,
          itemsCount: 0,
          categories: new Set(),
          items: []
        };
      }
      map[loc].rolls += (parseInt(m.rolls) || 0);
      map[loc].weight += (parseFloat(m.weight) || 0);
      map[loc].itemsCount += 1;
      if (m.category) {
        map[loc].categories.add(m.category);
      }
      map[loc].items.push(m);
    });



    return Object.values(map).map(loc => {
      const shelfConfig = shelves.find(s => s.id === loc.id);
      const capacity = shelfConfig ? (shelfConfig.capacity || 500) : 0;
      const pct = capacity > 0 ? Math.round((loc.rolls / capacity) * 100) : 0;
      return {
        ...loc,
        categories: Array.from(loc.categories),
        capacity,
        pct,
        hasCapacity: capacity > 0,
        room: shelfConfig ? shelfConfig.room : null
      };
    });
  }, [materials, shelves]);

  // Extract dynamic search suggestions from actual data (by item description)
  const dynamicSuggestions = useMemo(() => {
    const suggestions = new Set();
    const defaults = ['Cotton Blue Fabric', 'Heavy Denim Black', 'Rib Knit Red', 'Viscose Lining White', 'Buttons Plastic', 'Metal Zippers'];

    materials.forEach(m => {
      // Use the actual item description (mapped to m.name)
      if (m.name && m.name.trim() && m.name !== 'Legacy Material' && m.name !== 'New Material') {
        // Limit suggestion length slightly for better button rendering
        const cleanName = m.name.trim();
        suggestions.add(cleanName);
      }
    });

    const list = Array.from(suggestions).filter(term => term && term.length > 1);
    if (list.length === 0) {
      return defaults;
    }

    // Mix in defaults if we have very few elements
    if (list.length < 4) {
      defaults.forEach(d => {
        if (list.length < 8 && !list.includes(d)) {
          list.push(d);
        }
      });
    }

    return list.slice(0, 8);
  }, [materials]);

  // Logic to calculate recommendations
  const getRecommendations = (queryText = searchQuery) => {
    if (!queryText.trim()) {
      return { sameMaterialLocations: [], otherLocations: [], matchedMaterialsCount: 0, targetCategory: '' };
    }

    const query = queryText.toLowerCase().trim();

    // 1. Determine target category from matches or default to query if it is one of the category names
    let targetCategory = '';
    const categoryMatch = CATEGORIES.find(c => c.toLowerCase().includes(query));

    if (categoryMatch) {
      targetCategory = categoryMatch;
    } else {
      const matchingMaterials = materials.filter(m => {
        return (
          m.name?.toLowerCase().includes(query) ||
          m.category?.toLowerCase().includes(query) ||
          m.subCategory?.toLowerCase().includes(query)
        );
      });
      if (matchingMaterials.length > 0) {
        const categoryCounts = {};
        matchingMaterials.forEach(m => {
          if (m.category) {
            categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
          }
        });
        let maxCount = 0;
        Object.entries(categoryCounts).forEach(([cat, count]) => {
          if (count > maxCount) {
            maxCount = count;
            targetCategory = cat;
          }
        });
      }
    }

    // 2. Group locations:
    // A. Locations with similar materials
    // B. Other Locations (no similar materials)
    const sameMaterialLocations = [];
    const otherLocations = [];

    locationsData.forEach(loc => {
      const matchingItems = loc.items.filter(item => {
        return (
          item.name?.toLowerCase().includes(query) ||
          item.code?.toLowerCase().includes(query) ||
          (item.color && item.color.toLowerCase().includes(query)) ||
          (item.category && item.category.toLowerCase().includes(query)) ||
          (item.lotNo && item.lotNo.toLowerCase().includes(query))
        );
      });

      const hasMatchingItems = matchingItems.length > 0;
      const val = {
        ...loc,
        matchingItems,
        matchedCount: matchingItems.length
      };

      if (hasMatchingItems) {
        sameMaterialLocations.push(val);
      } else {
        otherLocations.push(val);
      }
    });

    const matchedMaterialsCount = sameMaterialLocations.reduce((sum, l) => sum + l.matchedCount, 0);

    // Sort sameMaterialLocations by matchedCount descending
    sameMaterialLocations.sort((a, b) => b.matchedCount - a.matchedCount);

    // Sort otherLocations: prioritize ones with capacity that are not full, and matching categories
    otherLocations.sort((a, b) => {
      const aMatchesRoom = targetCategory && a.categories.includes(targetCategory);
      const bMatchesRoom = targetCategory && b.categories.includes(targetCategory);
      if (aMatchesRoom !== bMatchesRoom) return aMatchesRoom ? -1 : 1;

      const aFull = a.hasCapacity && a.rolls >= a.capacity;
      const bFull = b.hasCapacity && b.rolls >= b.capacity;
      if (aFull !== bFull) return aFull ? 1 : -1;

      return a.rolls - b.rolls; // Least filled first
    });

    return {
      sameMaterialLocations,
      otherLocations,
      matchedMaterialsCount,
      targetCategory
    };
  };

  const { sameMaterialLocations, otherLocations, matchedMaterialsCount, targetCategory } = getRecommendations();

  // Reset table pagination when selectedLocation or itemSearch changes
  useEffect(() => {
    setTablePage(1);
  }, [selectedLocation, itemSearch]);

  // Selected location details helper calculations
  const selectedLocDetails = useMemo(() => {
    return locationsData.find(l => l.id === selectedLocation);
  }, [locationsData, selectedLocation]);

  // Items within selected location matching itemSearch
  const filteredItems = useMemo(() => {
    if (!selectedLocDetails) return [];
    return selectedLocDetails.items.filter(item => {
      const q = itemSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.color && item.color.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.lotNo && item.lotNo.toLowerCase().includes(q))
      );
    });
  }, [selectedLocDetails, itemSearch]);

  const itemsPerPage = 50;
  const paginatedItems = useMemo(() => {
    const start = (tablePage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, tablePage]);

  const totalTablePages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));

  // --- SPEECH OUTPUT UTILITY ---
  const speakHindiText = (text, callbackOnEnd = null) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Delay of 100ms prevents the async cancel from clearing the new utterance in Chrome/Safari
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const hiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('HI'));
        if (hiVoice) {
          utterance.voice = hiVoice;
        } else {
          const inVoice = voices.find(v => v.lang.includes('IN') || v.lang.includes('in'));
          if (inVoice) utterance.voice = inVoice;
        }
      }

      utterance.onstart = () => setAgentState('speaking');
      utterance.onend = () => {
        setAgentState('idle');
        if (callbackOnEnd) callbackOnEnd();
      };
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setAgentState('idle');
        if (callbackOnEnd) callbackOnEnd();
      };

      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const updateAgentSpeech = (text, followUp = null) => {
    setAgentReply(text);
    setAgentHistory(prev => [...prev, { role: 'agent', text }]);
    speakHindiText(text, followUp);
  };

  // --- STT TRIGGERS ---
  const startListening = () => {
    if (recognitionRef.current && agentState !== 'listening') {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition', e);
      }
    }
  };

  // --- AGENT CYCLE START ---
  const triggerVoiceAgent = () => {
    setAgentOpen(true);
    setAgentHistory([]);
    setTranscript('');

    setTimeout(() => {
      updateAgentSpeech('Aap kaun sa type ka material enter karna chahte hain?', () => {
        startListening();
      });
    }, 400);
  };

  // --- PARSE USER VOICE INPUT ---
  const processVoiceInput = (text) => {
    setAgentState('processing');

    const stopwords = [
      'karna', 'hai', 'chahiye', 'chahie', 'ka', 'sa', 'type', 'material',
      'enter', 'ki', 'ko', 'dikhao', 'dhundo', 'batao', 'h', 'app', 'aap',
      'please', 'me', 'in', 'store', 'rakhna', 'he', 'se', 'ya', 'nhi', 'nahi',
      'mujhe', 'karo', 'karana'
    ];

    const cleanWords = text.toLowerCase().split(' ').filter(w => !stopwords.includes(w) && w.trim().length > 0);

    let foundKeyword = '';
    const allKeywords = [
      'cotton', 'denim', 'woolen', 'buttons', 'zippers', 'threads', 'labels',
      'elastic', 'viscose', 'fleece', 'plain', 'woven', 'knit', 'summer', 'winter'
    ];

    for (const word of cleanWords) {
      const match = allKeywords.find(k => word.includes(k) || k.includes(word));
      if (match) {
        foundKeyword = match;
        break;
      }
    }

    const finalSearchTerm = foundKeyword || cleanWords[0] || text;

    if (!finalSearchTerm) {
      updateAgentSpeech('Mujhe samajh nahi aaya. Kripya fir se material ka naam bolein.', () => {
        startListening();
      });
      return;
    }

    setSearchQuery(finalSearchTerm);

    const results = getRecommendations(finalSearchTerm);

    if (results.matchedMaterialsCount > 0 && results.sameMaterialLocations.length > 0) {
      const placements = results.sameMaterialLocations.slice(0, 3).map(l => l.name);
      let replySpeech = `Same type ka material location ${placements.join(', ')} me pehle se hi stored hai. Aap wahan store kar sakte hain.`;
      updateAgentSpeech(replySpeech);
    } else {
      let replySpeech = `Same type ka material kisi bhi location me nahi mila. `;
      if (results.otherLocations.length > 0) {
        replySpeech += `Naye material ke liye location ${results.otherLocations[0].name} me jagah chune.`;
      } else {
        replySpeech += `Naye material ke liye jagah chune.`;
      }
      updateAgentSpeech(replySpeech);
    }
  };

  const handleSendKeyboardInput = () => {
    if (!keyboardInput.trim()) return;
    const userInput = keyboardInput;
    setKeyboardInput('');
    setAgentHistory(prev => [...prev, { role: 'user', text: userInput }]);
    processVoiceInput(userInput);
  };

  // Handle opening placement modal
  const handleOpenPlacement = (shelf) => {
    setSelectedShelf(shelf);

    const shelfRoom = rooms.find(r => r.id === shelf.room);
    const categoryGuess = shelfRoom ? shelfRoom.category : CATEGORIES[0];
    const subCategoryGuess = SUB_CATS[categoryGuess]?.[0] || '';

    if (parsedOcrData) {
      setModalForm({
        name: parsedOcrData.materialName || '',
        category: parsedOcrData.category || categoryGuess,
        subCategory: parsedOcrData.subCategory || subCategoryGuess,
        color: parsedOcrData.color || '',
        supplier: parsedOcrData.supplier || suppliers[0]?.id || '',
        weight: String(parsedOcrData.weight || 0),
        rolls: String(parsedOcrData.rolls || 0),
        unit: parsedOcrData.unit || 'Roll',
        status: 'Active',
        billNumber: parsedOcrData.invoiceNo || '',
        poNumber: parsedOcrData.poNumber || ''
      });
    } else {
      let nameGuess = searchQuery;
      if (nameGuess) {
        nameGuess = nameGuess.charAt(0).toUpperCase() + nameGuess.slice(1);
      }
      setModalForm({
        name: nameGuess || 'New Material',
        category: categoryGuess,
        subCategory: subCategoryGuess,
        color: '',
        supplier: suppliers[0]?.id || '',
        weight: '100',
        rolls: '10',
        unit: 'Roll',
        status: 'Active',
        billNumber: '',
        poNumber: ''
      });
    }
    setFormError('');
    setShowPlacementModal(true);
  };

  const handleSavePlacement = async () => {
    setFormError('');
    if (!modalForm.name.trim() || !modalForm.supplier) {
      setFormError('Please fill in Material Name and select a Supplier.');
      return;
    }

    const payload = {
      ...modalForm,
      rolls: parseInt(modalForm.rolls) || 0,
      weight: parseFloat(modalForm.weight) || 0,
      stockKg: parseFloat(modalForm.weight) || 0,
      location: selectedShelf.id,
    };

    try {
      await store.addMaterial(payload);
      setSuccessToast(`Successfully stored "${payload.name}" in Location ${selectedShelf.id}!`);
      setShowPlacementModal(false);
      setParsedOcrData(null); // Clear OCR parsed data
      loadData(); // reload stats
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (e) {
      console.error(e);
      setFormError(e.message || 'Error saving material data.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* CSS CUSTOM ANIMATIONS FOR VOICE AGENT */}
      <style>{`
        .voice-agent-glow {
          box-shadow: 0 0 15px var(--primary);
          animation: agentGlow 2s infinite ease-in-out;
        }
        @keyframes agentGlow {
          0% { box-shadow: 0 0 5px var(--primary); }
          50% { box-shadow: 0 0 20px var(--primary); }
          100% { box-shadow: 0 0 5px var(--primary); }
        }
        .listening-glow {
          box-shadow: 0 0 15px var(--danger);
          animation: listeningGlow 1.2s infinite ease-in-out;
        }
        @keyframes listeningGlow {
          0% { box-shadow: 0 0 3px var(--danger); }
          50% { box-shadow: 0 0 15px var(--danger); }
          100% { box-shadow: 0 0 3px var(--danger); }
        }
        .audio-wave {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 30px;
        }
        .audio-bar {
          width: 3px;
          height: 4px;
          background-color: var(--primary);
          border-radius: 3px;
        }
        .audio-bar.speaking {
          animation: barWave 0.8s ease-in-out infinite alternate;
        }
        .audio-bar.listening {
          background-color: var(--danger);
          animation: barWave 0.5s ease-in-out infinite alternate;
        }
        @keyframes barWave {
          0% { height: 4px; }
          100% { height: 26px; }
        }
        .spin {
          animation: spin 1.5s linear infinite;
        }
      `}</style>

      {/* HEADER */}
      <div className="page-header">
        <div className="page-title-block" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <button
            onClick={() => window.history.back()}
            className="btn btn-secondary btn-icon btn-sm"
            style={{ borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="breadcrumb">
              <span>Home</span>
              <span>/</span>
              <span>Storage Recommendation</span>
            </div>
            <h1 style={{ margin: 0 }}>Location Recommendation System</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* VOICE AGENT START BUTTON WITH CUSTOM ROBOT IMAGE */}
          <button
            className="btn btn-primary voice-agent-glow"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: '24px' }}
            onClick={triggerVoiceAgent}
          >
            <img
              src="/robot-agent.png"
              alt="AI"
              style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1px solid white' }}
            />
            Talk to AI Assistant (Hindi)
          </button>

          <button className="btn btn-secondary btn-icon" onClick={loadData} disabled={loading} title="Reload Data">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* TOAST SUCCESS */}
      {successToast && (
        <div className="alert alert-success animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle2 size={20} />
          <div>
            <strong style={{ display: 'block' }}>Placement Registered!</strong>
            <span style={{ fontSize: 13 }}>{successToast}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '100px 40px', marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <RefreshCw size={36} className="spin" style={{ color: 'var(--primary)' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Analyzing warehouse storage structure...</div>
        </div>
      ) : (
        <>
          {/* PREMIUM STATS HEADER */}
          <div className="grid grid-4" style={{ gap: 16, marginBottom: 12 }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'linear-gradient(135deg, var(--primary-light) 0%, rgba(59, 130, 246, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
              <div style={{ padding: 10, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex' }}>
                <Layers size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total Warehouse Stock</div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {materials.reduce((sum, m) => sum + (parseInt(m.rolls) || 0), 0).toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Rolls</span>
                </h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <div style={{ padding: 10, borderRadius: '50%', background: 'var(--success)', color: 'white', display: 'flex' }}>
                <Scale size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total Active Weight</div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {materials.reduce((sum, m) => sum + (parseFloat(m.weight) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Kg</span>
                </h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 100%)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
              <div style={{ padding: 10, borderRadius: '50%', background: '#8b5cf6', color: 'white', display: 'flex' }}>
                <Warehouse size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Active Storage Areas</div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {locationsData.length} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Locations</span>
                </h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 18px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Stock Segments</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span>Active Stock:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{materials.filter(m => m.inventoryType === 'Active Inventory').length} items</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span>Dyeing Stock:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{materials.filter(m => m.inventoryType === 'Dyeing Material').length} items</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span>Old Inventory:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{materials.filter(m => m.inventoryType === 'Old Inventory').length} items</strong>
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH CARD */}
          <div className="grid grid-3" style={{ gap: 20 }}>
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div className="card-header">
                <div className="card-title">
                  <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                  Find Best Storage Location
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="topbar-search" style={{ flex: 1, margin: 0, padding: '2px 8px', border: '1.5px solid var(--border)' }}>
                    <Search size={17} className="search-icon" style={{ color: 'var(--text-muted)' }} />
                    <input
                      id="recommendation-search-input"
                      style={{ fontSize: 14, height: 40 }}
                      placeholder="Type material type or category (e.g. Cotton, Winter Fabric, Zippers)..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSearchQuery('')}
                        style={{ padding: 4, height: 'auto', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <label className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, margin: 0, cursor: ocrLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                    {ocrLoading ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
                    {ocrLoading ? 'Scanning...' : 'Scan GRN Bill'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleOcrUpload}
                      style={{ display: 'none' }}
                      disabled={ocrLoading}
                    />
                  </label>
                </div>

                {parsedOcrData && (
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1.5px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13.5,
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
                      <FileText size={18} style={{ color: 'var(--primary)' }} />
                      <div>
                        <strong>Scanned Invoice Details:</strong>
                        <span style={{ marginLeft: 8 }}>
                          Inv: {parsedOcrData.invoiceNo || 'N/A'} | PO: {parsedOcrData.poNumber || 'N/A'} | Name: {parsedOcrData.materialName} ({parsedOcrData.rolls} Rolls, {parsedOcrData.weight} Kg)
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 10px', height: 'auto', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                      onClick={() => {
                        setParsedOcrData(null);
                        setSearchQuery('');
                      }}
                    >
                      Clear Scan
                    </button>
                  </div>
                )}

                {/* QUICK SEARCH CHIPS */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Quick Search Suggestions
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {dynamicSuggestions.map(term => (
                      <button
                        key={term}
                        className={`btn btn-sm ${searchQuery.toLowerCase() === term.toLowerCase() ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ borderRadius: 20, fontSize: 12, padding: '4px 12px' }}
                        onClick={() => handleQuickSearch(term)}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* WAREHOUSE STATE BRIEF */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Warehouse size={16} />
                  Warehouse Overview
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Registered Materials</span>
                  <strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>{materials.length} Items</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Racks / Rooms</span>
                  <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{racks.length} Racks in {rooms.length} Halls</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Warehouse Capacity</span>
                  <strong style={{ fontSize: 14, color: 'var(--success)' }}>
                    {shelves.reduce((sum, s) => sum + s.capacity, 0).toLocaleString()} Rolls
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          ) : !searchQuery.trim() ? (
            /* EMP STATE */
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', border: '1.5px dashed var(--border)' }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto',
                color: 'var(--primary)'
              }}>
                <Layers size={24} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Intelligent Storage Placement Finder</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 500, margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                (like <strong>"Cotton"</strong> or <strong>"Buttons"</strong>)
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {dynamicSuggestions.slice(0, 3).map((term, idx) => (
                  <button
                    key={term}
                    className={`btn ${idx === 0 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => handleQuickSearch(term)}
                  >
                    Search "{term}" <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* RECOMMENDATION CONTENT */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* SEARCH STATUS BAR */}
              <div style={{
                padding: '12px 18px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)',
                    boxShadow: '0 0 8px var(--primary)'
                  }} />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    Recommendations for query: <strong>"{searchQuery}"</strong>
                  </span>
                  {targetCategory && (
                    <span className="badge badge-primary" style={{ fontSize: 11, padding: '2px 8px' }}>
                      Target Room Category: {targetCategory}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Found <strong>{matchedMaterialsCount}</strong> matching materials currently in database.
                </div>
              </div>

              {/* AI PLACEMENT ANALYSIS BOX */}
              {matchedMaterialsCount > 0 && sameMaterialLocations.length > 0 && (
                <div className="card animate-fade-in" style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  borderRadius: 'var(--radius-lg)'
                }}>
                  <div style={{ padding: 8, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex' }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI Placement Recommendation Analysis</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      We found <strong>{matchedMaterialsCount} similar items</strong> stored in <strong>{sameMaterialLocations.length} locations</strong>.
                      For best grouping and efficiency, we recommend placing your new rolls at <strong style={{ color: 'var(--primary)' }}>{sameMaterialLocations[0].name}</strong>, which contains the highest concentration of matching materials ({sameMaterialLocations[0].matchedCount} items).
                    </p>
                  </div>
                </div>
              )}

              {/* SECTION A: SAME TYPE ALREADY IN LOCATION */}
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                  Section A: Recommended Storage Locations (Same Type of Material Present)
                </h2>
                {sameMaterialLocations.length === 0 ? (
                  <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Info size={18} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 650, color: 'var(--text-primary)', marginBottom: 4 }}>
                          No Similar Materials Stored Yet
                        </h4>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                          There are no storage areas containing materials matching <strong>"{searchQuery}"</strong>.
                          Please refer to Section B below to start storing this category in a new location.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-2" style={{ gap: 20 }}>
                    {sameMaterialLocations.map(loc => {
                      const colors = getLocColors(loc.name);
                      return (
                        <div
                          key={loc.id}
                          className="card card-hover"
                          style={{
                            borderLeft: `6px solid ${colors.primary}`,
                            cursor: 'pointer',
                            background: selectedLocation === loc.id ? colors.bgLight : 'var(--surface)',
                            boxShadow: selectedLocation === loc.id ? `0 0 0 2px ${colors.primary}` : 'none'
                          }}
                          onClick={() => setSelectedLocation(loc.id === selectedLocation ? null : loc.id)}
                        >
                          <div className="card-header" style={{ paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--text-primary)' }}>
                                {loc.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {loc.categories.length > 0 ? loc.categories.join(' • ') : 'General Store'}
                              </div>
                            </div>
                            <span className="badge badge-success" style={{ fontWeight: 700, fontSize: 11 }}>
                              {loc.matchedCount} Similar Items
                            </span>
                          </div>

                          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* Capacity status if configured */}
                            {loc.hasCapacity ? (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                                  <span>Storage Capacity</span>
                                  <span>{loc.pct}% Full ({loc.rolls} / {loc.capacity} Rolls)</span>
                                </div>
                                <div className="progress-bar" style={{ height: 6 }}>
                                  <div
                                    className={`progress-fill ${loc.pct >= 90 ? 'red' : loc.pct >= 50 ? 'yellow' : 'green'}`}
                                    style={{ width: `${Math.min(100, loc.pct)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
                                <div>Total Rolls: <strong style={{ color: 'var(--text-primary)' }}>{loc.rolls}</strong></div>
                                <div>Total Weight: <strong style={{ color: 'var(--text-primary)' }}>{loc.weight.toFixed(1)} Kg</strong></div>
                              </div>
                            )}

                            {/* Stored items snippet */}
                            <div style={{ background: 'var(--bg)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                                Currently Storing
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                {loc.items.length === 0 ? (
                                  <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Empty Location</span>
                                ) : (
                                  <>
                                    {loc.items.slice(0, 4).map((m, idx) => {
                                      const isMatch = loc.matchingItems.some(mi => mi.id === m.id);
                                      return (
                                        <span key={m.id} style={isMatch ? { fontWeight: 700, color: 'var(--success)' } : {}}>
                                          {m.name} ({m.rolls}R){idx < Math.min(loc.items.length, 4) - 1 ? ', ' : ''}
                                        </span>
                                      );
                                    })}
                                    {loc.items.length > 4 && (
                                      <span style={{ color: 'var(--text-muted)' }}> and {loc.items.length - 4} more...</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Store Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                              <button
                                className={`btn btn-sm btn-primary`}
                                disabled={loc.hasCapacity && loc.rolls >= loc.capacity}
                                style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPlacement(loc);
                                }}
                              >
                                {loc.hasCapacity && loc.rolls >= loc.capacity ? 'Full' : 'Store Here'}
                                {!(loc.hasCapacity && loc.rolls >= loc.capacity) && <ArrowUpRight size={13} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION B: OTHER AVAILABLE LOCATIONS */}
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} style={{ color: 'var(--primary)' }} />
                  Section B: Other Storage Locations (No Similar Materials Stored)
                </h2>
                <div className="grid grid-2" style={{ gap: 20 }}>
                  {otherLocations.slice(0, 12).map(loc => {
                    const colors = getLocColors(loc.name);
                    const isMatchingCategory = targetCategory && loc.categories.includes(targetCategory);
                    return (
                      <div
                        key={loc.id}
                        className="card card-hover"
                        style={{
                          borderLeft: `6px solid ${colors.primary}`,
                          cursor: 'pointer',
                          background: selectedLocation === loc.id ? colors.bgLight : isMatchingCategory ? 'var(--surface)' : 'rgba(255, 255, 255, 0.02)',
                          opacity: isMatchingCategory ? 1 : 0.85,
                          boxShadow: selectedLocation === loc.id ? `0 0 0 2px ${colors.primary}` : 'none'
                        }}
                        onClick={() => setSelectedLocation(loc.id === selectedLocation ? null : loc.id)}
                      >
                        <div className="card-header" style={{ paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                              {loc.name}
                              {isMatchingCategory && (
                                <span className="badge badge-primary" style={{ fontSize: 10, fontWeight: 700 }}>
                                  Category Match
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                              {loc.categories.length > 0 ? loc.categories.join(' • ') : 'General Store'}
                            </div>
                          </div>
                          <span className="badge badge-secondary" style={{ fontSize: 11 }}>
                            Available Zone
                          </span>
                        </div>

                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {/* Capacity status if configured */}
                          {loc.hasCapacity ? (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                                <span>Storage Capacity</span>
                                <span>{loc.pct}% Full ({loc.rolls} / {loc.capacity} Rolls)</span>
                              </div>
                              <div className="progress-bar" style={{ height: 6 }}>
                                <div
                                  className={`progress-fill ${loc.pct >= 90 ? 'red' : loc.pct >= 50 ? 'yellow' : 'green'}`}
                                  style={{ width: `${Math.min(100, loc.pct)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
                              <div>Total Rolls: <strong style={{ color: 'var(--text-primary)' }}>{loc.rolls}</strong></div>
                              <div>Total Weight: <strong style={{ color: 'var(--text-primary)' }}>{loc.weight.toFixed(1)} Kg</strong></div>
                            </div>
                          )}

                          {/* Stored items snippet */}
                          <div style={{ background: 'var(--bg)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                              Currently Storing
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              {loc.items.length === 0 ? (
                                <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Empty Location (Perfect for storage)</span>
                              ) : (
                                <>
                                  {loc.items.slice(0, 4).map((m, idx) => (
                                    <span key={m.id}>
                                      {m.name} ({m.rolls}R){idx < Math.min(loc.items.length, 4) - 1 ? ', ' : ''}
                                    </span>
                                  ))}
                                  {loc.items.length > 4 && (
                                    <span style={{ color: 'var(--text-muted)' }}> and {loc.items.length - 4} more...</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Store Button */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                            <button
                              className={`btn btn-sm btn-secondary`}
                              disabled={loc.hasCapacity && loc.rolls >= loc.capacity}
                              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPlacement(loc);
                              }}
                            >
                              {loc.hasCapacity && loc.rolls >= loc.capacity ? 'Full' : 'Store Here'}
                              {!(loc.hasCapacity && loc.rolls >= loc.capacity) && <ArrowUpRight size={13} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Details Table Section */}
          {selectedLocation && selectedLocDetails && (
            <div className="card" style={{ marginTop: 24 }}>
              <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">
                  <Box size={15} />
                  Materials in Location: <span style={{ color: getLocColors(selectedLocDetails.name).primary, fontWeight: 700 }}>{selectedLocDetails.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: 30, height: '32px', fontSize: '12px' }}
                      placeholder="Filter items inside location..."
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Showing {filteredItems.length} of {selectedLocDetails.items.length}
                  </span>
                </div>
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                {filteredItems.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 0' }}>
                    <div className="empty-state-icon"><Info size={24} /></div>
                    <h4>No Items Match Filter</h4>
                    <p>Try clearing your search query to see all items in this storage area.</p>
                  </div>
                ) : (
                  <div className="table-wrap" style={{ border: 'none' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Barcode/Code</th>
                          <th>Material Name</th>
                          <th>Inventory Type</th>
                          <th>Category</th>
                          <th>Color/Shade</th>
                          <th>Lot No</th>
                          <th>Weight (Kg)</th>
                          <th>Stock (Rolls)</th>
                          <th>Supplier</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map(m => (
                          <tr key={m.id}>
                            <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>{m.code}</td>
                            <td style={{ fontWeight: 600 }}>{m.name}</td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: m.inventoryType === 'Active Inventory' ? 'var(--primary-light)' : m.inventoryType === 'Dyeing Material' ? '#f3e8ff' : '#ffedd5',
                                color: m.inventoryType === 'Active Inventory' ? 'var(--primary)' : m.inventoryType === 'Dyeing Material' ? '#6b21a8' : '#c2410c'
                              }}>
                                {m.inventoryType}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-primary" style={{ fontSize: 11 }}>
                                {m.category}
                              </span>
                            </td>
                            <td>{m.color || '—'}</td>
                            <td style={{ fontWeight: 600 }}>{m.lotNo || '—'}</td>
                            <td>{m.weight} Kg</td>
                            <td style={{ fontWeight: 700 }}>{m.rolls}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {(!m.supplier) ? '—' : (isNaN(m.supplier) ? (suppliers.find(s => s.id === m.supplier || s.name === m.supplier)?.name || m.supplier) : (suppliers.find(s => s.id === Number(m.supplier))?.name || m.supplier))}
                            </td>
                            <td>
                              <span className={`badge ${m.status === 'Active' ? 'badge-success' : m.status === 'Low Stock' ? 'badge-warning' : 'badge-secondary'}`}>
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {totalTablePages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--bg)',
                    borderBottomLeftRadius: 'var(--radius-md)',
                    borderBottomRightRadius: 'var(--radius-md)'
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Page <strong>{tablePage}</strong> of <strong>{totalTablePages}</strong> ({filteredItems.length} items)
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); setTablePage(p => Math.max(1, p - 1)); }}
                        disabled={tablePage === 1}
                      >
                        Prev
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); setTablePage(p => Math.min(totalTablePages, p + 1)); }}
                        disabled={tablePage === totalTablePages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* PLACEMENT / STORAGE MODAL */}
      {showPlacementModal && selectedShelf && (
        <div className="modal-overlay" style={{ zIndex: 1100, backdropFilter: 'none', background: 'rgba(0, 0, 0, 0.4)' }}>
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <Box size={18} style={{ color: 'var(--primary)' }} />
                Store Material in Location {selectedShelf.id}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPlacementModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formError && (
                <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 12px' }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Material Name <span className="required">*</span></label>
                <input
                  className="form-control"
                  value={modalForm.name}
                  onChange={e => setModalForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Cotton Blue Fabric"
                />
              </div>

              <div className="form-grid form-grid-2" style={{ gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={modalForm.category}
                    onChange={e => {
                      const cat = e.target.value;
                      setModalForm(f => ({ ...f, category: cat, subCategory: SUB_CATS[cat]?.[0] || '' }));
                    }}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sub Category</label>
                  <select
                    className="form-control"
                    value={modalForm.subCategory}
                    onChange={e => setModalForm(f => ({ ...f, subCategory: e.target.value }))}
                  >
                    {(SUB_CATS[modalForm.category] || []).map(sc => <option key={sc}>{sc}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-grid form-grid-2" style={{ gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Color / Shade</label>
                  <input
                    className="form-control"
                    value={modalForm.color}
                    onChange={e => setModalForm(f => ({ ...f, color: e.target.value }))}
                    placeholder="e.g. Navy Blue"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Supplier <span className="required">*</span></label>
                  <select
                    className="form-control"
                    value={modalForm.supplier}
                    onChange={e => setModalForm(f => ({ ...f, supplier: parseInt(e.target.value) }))}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-grid form-grid-2" style={{ gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Invoice / Bill No</label>
                  <input
                    className="form-control"
                    value={modalForm.billNumber}
                    onChange={e => setModalForm(f => ({ ...f, billNumber: e.target.value }))}
                    placeholder="e.g. INV-2025-001"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchase Order (PO) No</label>
                  <input
                    className="form-control"
                    value={modalForm.poNumber}
                    onChange={e => setModalForm(f => ({ ...f, poNumber: e.target.value }))}
                    placeholder="e.g. PO-2025-001"
                  />
                </div>
              </div>

              <div className="form-grid form-grid-3" style={{ gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Roll Quantity</label>
                  <input
                    className="form-control"
                    type="number"
                    value={modalForm.rolls}
                    onChange={e => setModalForm(f => ({ ...f, rolls: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (Kg)</label>
                  <input
                    className="form-control"
                    type="number"
                    value={modalForm.weight}
                    onChange={e => setModalForm(f => ({ ...f, weight: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select
                    className="form-control"
                    value={modalForm.unit}
                    onChange={e => setModalForm(f => ({ ...f, unit: e.target.value }))}
                  >
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setShowPlacementModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSavePlacement}>
                  Confirm & Store
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING AI VOICE ASSISTANT PANEL WITH USER ROBOT IMAGE --- */}
      {agentOpen && (
        <div
          className="card"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '30px',
            width: '360px',
            maxHeight: '480px',
            zIndex: 1050,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.25s ease'
          }}
        >
          {/* Panel Header */}
          <div
            className="card-header"
            style={{
              padding: '12px 16px',
              background: 'var(--primary-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src="/robot-agent.png"
                alt="Robot Assistant"
                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)' }}
              />
              <div>
                <strong style={{ fontSize: 13, color: 'var(--primary)', display: 'block' }}>AI Voice Assistant</strong>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Hindi Voice Agent Active</span>
              </div>
            </div>
            <button
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                if (recognitionRef.current) recognitionRef.current.abort();
                setAgentOpen(false);
              }}
              title="Close Voice Assistant"
            >
              <X size={16} />
            </button>
          </div>

          {/* Panel Chat Body */}
          <div
            style={{
              padding: '16px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxHeight: '280px',
              background: 'var(--bg)'
            }}
          >
            {agentHistory.length === 0 && !transcript ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>
                Start speaking to get recommendations...
              </div>
            ) : (
              <>
                {agentHistory.map((chat, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: chat.role === 'user' ? 'flex-end' : 'flex-start',
                      width: '100%'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      marginBottom: 2
                    }}>
                      {chat.role === 'user' ? (
                        <><span>Aap (User)</span><User size={10} /></>
                      ) : (
                        <>
                          <img
                            src="/robot-agent.png"
                            alt="AI"
                            style={{ width: 12, height: 12, borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span>Assistant</span>
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '12px',
                        fontSize: 12.5,
                        lineHeight: 1.4,
                        maxWidth: '85%',
                        background: chat.role === 'user' ? 'var(--primary)' : 'var(--border-light)',
                        color: chat.role === 'user' ? 'white' : 'var(--text-primary)',
                        borderTopRightRadius: chat.role === 'user' ? '2px' : '12px',
                        borderTopLeftRadius: chat.role === 'user' ? '12px' : '2px',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {chat.text}
                    </div>
                  </div>
                ))}

                {/* Real-time transcript preview bubble */}
                {agentState === 'listening' && transcript && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      width: '100%',
                      opacity: 0.8,
                      animation: 'fadeIn 0.2s ease'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      marginBottom: 2
                    }}>
                      <span>Listening...</span>
                      <User size={10} />
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '12px',
                        fontSize: 12.5,
                        lineHeight: 1.4,
                        maxWidth: '85%',
                        background: 'rgba(26, 86, 219, 0.1)',
                        color: 'var(--primary)',
                        borderTopRightRadius: '2px',
                        borderTopLeftRadius: '12px',
                        fontStyle: 'italic',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px dashed var(--primary)'
                      }}
                    >
                      {transcript}...
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Keyboard input composer */}
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--surface)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              placeholder="Type material name (e.g. Cotton)..."
              style={{
                flex: 1,
                background: 'var(--bg)',
                border: '1.5px solid var(--border)',
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '12.5px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
              value={keyboardInput}
              onChange={(e) => setKeyboardInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendKeyboardInput();
              }}
            />
            <button
              className="btn btn-primary btn-icon btn-sm"
              style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={handleSendKeyboardInput}
              disabled={!keyboardInput.trim()}
              title="Send text"
            >
              <Send size={14} />
            </button>
          </div>

          {/* Agent Voice State Indicator Panel */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--surface)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10
            }}
          >
            {/* Visual Wave Animation */}
            {agentState !== 'idle' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: agentState === 'listening' ? 'var(--danger)' : 'var(--primary)', fontWeight: 600 }}>
                  {agentState === 'speaking' ? 'Speaking...' : agentState === 'listening' ? 'Listening...' : 'Thinking...'}
                </span>
                <div className="audio-wave">
                  <div className={`audio-bar ${agentState}`} style={{ animationDelay: '0.1s' }} />
                  <div className={`audio-bar ${agentState}`} style={{ animationDelay: '0.3s' }} />
                  <div className={`audio-bar ${agentState}`} style={{ animationDelay: '0.5s' }} />
                  <div className={`audio-bar ${agentState}`} style={{ animationDelay: '0.2s' }} />
                  <div className={`audio-bar ${agentState}`} style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}

            {agentState === 'idle' && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Tap mic button below to speak again
              </span>
            )}

            {/* Mic Action button and Close button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                className={`btn btn-icon ${agentState === 'listening' ? 'listening-glow btn-danger' : 'btn-primary'}`}
                style={{ width: 46, height: 46, borderRadius: '50%' }}
                onClick={() => {
                  if (agentState === 'speaking') {
                    if (window.speechSynthesis) window.speechSynthesis.cancel();
                    setAgentState('idle');
                  } else if (agentState === 'listening') {
                    if (recognitionRef.current) recognitionRef.current.stop();
                  } else {
                    startListening();
                  }
                }}
                title={agentState === 'listening' ? 'Stop Listening' : 'Talk'}
              >
                {agentState === 'listening' ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button
                className="btn btn-secondary"
                style={{
                  borderRadius: '20px',
                  fontSize: 12,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.05)'
                }}
                onClick={() => {
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                  if (recognitionRef.current) recognitionRef.current.abort();
                  setAgentOpen(false);
                }}
              >
                <X size={14} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
