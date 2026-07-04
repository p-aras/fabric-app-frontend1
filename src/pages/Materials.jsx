import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store.js';
import { Plus, Search, Edit, Trash2, Eye, Package, Filter, Download, QrCode, X, AlertTriangle, ArrowLeft } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import LocationPicker from '../components/LocationPicker.jsx';

// Custom Soft & Premium Multi-Select Dropdown Component
function MultiSelect({ label, options, selectedValues, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  // Close dropdown on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter(opt =>
    String(opt).toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (val) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  return (
    <div className="multiselect-container" ref={containerRef} style={{ position: 'relative', minWidth: '160px', zIndex: isOpen ? 101 : 1 }}>
      <button
        type="button"
        className="form-control"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          cursor: 'pointer',
          background: 'var(--surface)',
          borderColor: isOpen ? 'var(--primary)' : 'var(--border)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingRight: '12px',
          width: '100%'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedValues.length === 0
            ? placeholder
            : `${label} (${selectedValues.length})`}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>▼</span>
      </button>

      {isOpen && (
        <div className="multiselect-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          marginTop: '4px',
          maxHeight: '260px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px'
        }}>
          {options.length > 5 && (
            <input
              type="text"
              placeholder="Search..."
              className="form-control"
              style={{
                fontSize: '12px',
                padding: '6px 8px',
                marginBottom: '8px',
                height: 'auto'
              }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px 6px 4px', borderBottom: '1px solid var(--border)', marginBottom: '6px' }}>
            <button
              type="button"
              className="btn btn-link btn-xs"
              style={{ padding: 0, fontSize: '11px', textDecoration: 'none' }}
              onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
            >
              {selectedValues.length === options.length ? 'Clear All' : 'Select All'}
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredOptions.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>No options found</span>
            ) : (
              filteredOptions.map(opt => {
                const isChecked = selectedValues.includes(opt);
                return (
                  <label
                    key={opt}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: isChecked ? 'rgba(26, 86, 219, 0.05)' : 'transparent',
                      transition: 'background 0.15s ease',
                      userSelect: 'none',
                      margin: 0
                    }}
                    className="multiselect-option-label"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOption(opt)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}


const CATEGORIES = ['Summer Fabric', 'Winter Fabric', 'Accessories'];
const SUB_CATS = {
  'Summer Fabric': ['Plain Cotton', 'Woven', 'Viscose Lining', 'Double Knit', 'Cotton Twill', 'Interlock'],
  'Winter Fabric': ['Rib Knit', 'Polar Fleece', 'Heavy Denim', 'Woolen'],
  'Accessories': ['Plastic Buttons', 'Metal Zippers', 'Threads', 'Labels', 'Elastic'],
};
const UNITS = ['Roll', 'MTR', 'Kg'];

function MaterialForm({ material, suppliers, categories = [], subcategories = [], onSave, onClose }) {
  const [form, setForm] = useState(material ? { ...material, lotNo: material.lotNo || '' } : {
    name: '',
    category: categories[0] || '',
    subCategory: subcategories[0] || '',
    color: '',
    supplier: '',
    weight: '',
    rolls: '',
    unit: 'Roll',
    location: '',
    status: 'Active',
    lotNo: '',
  });
  const isEdit = !!material?.id;
  const [shelves, setShelves] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([store.getShelves(), store.getRooms()])
      .then(([s, r]) => {
        setShelves(s || []);
        setRooms(r || []);
      })
      .catch(console.error);
  }, []);

  const reqRolls = parseInt(form.rolls) || 0;
  const targetRoom = rooms.find(r => r.category === form.category);
  const recommendedShelves = shelves
    .map(s => {
      const currentMatRolls = (isEdit && material?.location === s.id) ? (material.rolls || 0) : 0;
      const freeSpace = s.capacity - s.used + currentMatRolls;
      const roomMatch = targetRoom ? s.room === targetRoom.id : false;
      return { ...s, freeSpace, roomMatch };
    })
    .filter(s => s.freeSpace >= reqRolls)
    .sort((a, b) => {
      if (a.roomMatch !== b.roomMatch) {
        return a.roomMatch ? -1 : 1;
      }
      return a.freeSpace - b.freeSpace;
    });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setError('');
    if (!form.name || !form.category || !form.supplier) {
      setError('Please fill required fields.');
      return;
    }
    const formattedForm = {
      ...form,
      weight: parseFloat(form.weight) || 0,
      rolls: parseInt(form.rolls) || 0,
      stockKg: parseFloat(form.weight) || 0
    };
    try {
      if (isEdit) {
        await store.updateMaterial(material.id, formattedForm);
      } else {
        await store.addMaterial(formattedForm);
      }
      onSave();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title"><Package size={18} /> {isEdit ? 'Edit Material' : 'Add New Material'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
          <div className="form-grid form-grid-3" style={{ gap: 16 }}>
            {isEdit && (
              <div className="form-group">
                <label className="form-label">Material Code</label>
                <input className="form-control" value={form.code || ''} disabled />
              </div>
            )}
            <div className="form-group" style={isEdit ? {} : { gridColumn: 'span 1' }}>
              <label className="form-label">Material Name <span className="required">*</span></label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Cotton Fabric" />
            </div>
            <div className="form-group">
              <label className="form-label">Category <span className="required">*</span></label>
              <input
                list="form-categories"
                className="form-control"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                placeholder="Select or type Category"
              />
              <datalist id="form-categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Sub Category</label>
              <input
                list="form-subcategories"
                className="form-control"
                value={form.subCategory}
                onChange={e => set('subCategory', e.target.value)}
                placeholder="Select or type Sub Category"
              />
              <datalist id="form-subcategories">
                {subcategories.map(sc => <option key={sc} value={sc} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <input className="form-control" value={form.color} onChange={e => set('color', e.target.value)} placeholder="e.g. White, Blue" />
            </div>
            <div className="form-group">
              <label className="form-label">Lot Number</label>
              <input className="form-control" value={form.lotNo} onChange={e => set('lotNo', e.target.value)} placeholder="e.g. LOT-101" />
            </div>
            <div className="form-group">
              <label className="form-label">Supplier <span className="required">*</span></label>
              <select className="form-control" value={form.supplier} onChange={e => set('supplier', parseInt(e.target.value))}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{form.unit === 'MTR' ? 'Meters (Mtr)' : 'Weight (Kg)'}</label>
              <input className="form-control" type="number" value={form.weight} onChange={e => set('weight', parseFloat(e.target.value))} placeholder="e.g. 250" />
            </div>
            <div className="form-group">
              <label className="form-label">Roll Quantity</label>
              <input className="form-control" type="number" value={form.rolls} onChange={e => set('rolls', parseInt(e.target.value))} placeholder="e.g. 10" />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-control" value={form.unit} onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Location</label>
              <LocationPicker
                value={form.location}
                onChange={val => set('location', val)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                <option>Active</option>
                <option>Low Stock</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" id="save-material-btn" onClick={handleSave}>{isEdit ? 'Update Material' : 'Add Material'}</button>
        </div>
      </div>
    </div>
  );
}

export const printDirectly = (type, data) => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8765');

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'auth',
        token: 'fabric-print-secret-key-2024'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.type === 'auth_success') {
          ws.send(JSON.stringify({
            type: type,
            data: data
          }));
        } else if (response.type === 'print_result') {
          ws.close();
          if (response.success) {
            resolve(response.message);
          } else {
            reject(new Error(response.message));
          }
        }
      } catch (e) {
        ws.close();
        reject(e);
      }
    };

    ws.onerror = (err) => {
      reject(new Error('Print service offline'));
    };

    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        reject(new Error('Print request timed out'));
      }
    }, 3000);
  });
};

export function Barcode({ value, width = 1.5, height = 35, displayValue = false }) {
  const svgRef = useRef(null);
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: displayValue,
          margin: 0,
          background: "transparent",
          fontSize: 10,
          textMargin: 2
        });
      } catch (e) {
        console.error("Barcode generation error:", e);
      }
    }
  }, [value, width, height, displayValue]);

  return <svg ref={svgRef}></svg>;
}

export function BarcodeModal({ material, onClose }) {
  const [lotNumber, setLotNumber] = useState(material.lotNo || material.code || '');
  const [billNumber, setBillNumber] = useState(material.billNumber || '');
  const [weight, setWeight] = useState(material.weight || '0.00');
  const [receivedDate, setReceivedDate] = useState(material.receivedDate || new Date().toISOString().split('T')[0]);
  const [receivedPerson, setReceivedPerson] = useState(material.receivedPerson || '');
  const [authorizedPerson, setAuthorizedPerson] = useState(material.authorizedPerson || '');

  const formatDateForDisplay = (dateStr) => {
    try {
      if (!dateStr || dateStr === '—') return '—';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const handlePrint = async () => {
    try {
      await printDirectly('print_material', {
        code: material.code,
        name: material.name,
        category: material.category,
        subCategory: material.subCategory || '',
        color: material.color || '',
        weight: weight,
        unit: material.unit || 'Kg',
        location: material.location,
        receivedDate: receivedDate,
        billNumber: billNumber,
        lotNumber: lotNumber,
        receivedPerson: receivedPerson,
        authorizedPerson: authorizedPerson
      });
      alert('✓ Sticker print request sent to Python print service!');
    } catch (err) {
      console.error('Direct print failed:', err);
      alert(`❌ Print Failed: Print service is offline.\n\nPlease start the Python print service by running:\npython python_service/print-service/print_service.py`);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-md">
        <style>{`
          .barcode-label {
            width: 2.40in;
            height: 1.60in;
            padding: 4px 6px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: white;
            color: black;
            font-family: Arial, sans-serif;
          }
          .sticker-table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            font-size: 5.5pt;
            border: 1px solid black;
          }
          .sticker-table td {
            border: 1px solid black;
            padding: 1px 2px;
            line-height: 1.1;
          }
          .label-cell {
            font-weight: bold;
            width: 30%;
          }
          .val-cell {
            width: 70%;
          }
          .barcode-svg-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 2px;
          }
          .barcode-svg-container svg {
            width: 2.10in !important;
            height: 0.35in !important;
            display: block;
          }
          .barcode-footer {
            text-align: center;
            font-size: 5pt;
            color: #555;
            border-top: 1px solid #000;
            padding-top: 1px;
            margin-top: 1px;
            line-height: 1;
          }
        `}</style>
        <div className="modal-header">
          <div className="modal-title"><QrCode size={18} /> Barcode Label — {material.code}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', gap: '20px', flexDirection: 'row', flexWrap: 'wrap', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Form Inputs (Left Column) */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '280px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Lot Number</label>
              <input className="form-control" style={{ padding: '8px 12px' }} value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="e.g. LOT-4509" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Bill Number</label>
              <input className="form-control" style={{ padding: '8px 12px' }} value={billNumber} onChange={e => setBillNumber(e.target.value)} placeholder="e.g. BILL-9921" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Weight (Kg)</label>
              <input className="form-control" style={{ padding: '8px 12px' }} type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Received Date</label>
              <input className="form-control" style={{ padding: '8px 12px' }} type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Received By</label>
              <input className="form-control" style={{ padding: '8px 12px' }} value={receivedPerson} onChange={e => setReceivedPerson(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Authorized Person</label>
              <input className="form-control" style={{ padding: '8px 12px' }} value={authorizedPerson} onChange={e => setAuthorizedPerson(e.target.value)} placeholder="e.g. Sarah Smith" />
            </div>
          </div>

          {/* Sticker Preview (Right Column) */}
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sticker Live Preview</div>
            <div id="barcode-print-area">
              <div className="barcode-label" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <table className="sticker-table">
                  <tbody>
                    <tr>
                      <td className="label-cell">BARCODE ID</td>
                      <td className="val-cell" style={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#fef3c7' }}>{material.code}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">CMP</td>
                      <td className="val-cell">{material.category || '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">FABRIC</td>
                      <td className="val-cell">{material.name || '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">GROUP</td>
                      <td className="val-cell">{material.subCategory || '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">SHADE</td>
                      <td className="val-cell">
                        <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse', margin: 0, padding: 0 }}>
                          <tbody>
                            <tr style={{ border: 'none' }}>
                              <td style={{ border: 'none', padding: 0, fontWeight: 'bold', width: '45%' }}>{material.color || '—'}</td>
                              <td style={{ border: 'none', borderLeft: '1px solid black', padding: '0 0 0 4px', fontWeight: 'bold', width: '55%' }}>LOCATION: {material.location || '—'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell">WEIGHT</td>
                      <td className="val-cell">
                        <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse', margin: 0, padding: 0 }}>
                          <tbody>
                            <tr style={{ border: 'none' }}>
                              <td style={{ border: 'none', padding: 0, fontWeight: 'bold', width: '45%' }}>{weight} {material.unit || 'Kg'}</td>
                              <td style={{ border: 'none', borderLeft: '1px solid black', padding: '0 0 0 4px', width: '55%' }}>BILL NO: {billNumber || '—'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell">DATE</td>
                      <td className="val-cell">{receivedDate ? formatDateForDisplay(receivedDate) : '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">LOT NO</td>
                      <td className="val-cell" style={{ fontWeight: 'bold' }}>{lotNumber || '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">RECEIVED BY</td>
                      <td className="val-cell">{receivedPerson || '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">AUTHORIZED</td>
                      <td className="val-cell">{authorizedPerson || '—'}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="barcode-svg-container" style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                  <Barcode value={material.code} width={1.8} height={32} displayValue={true} />
                </div>
                <div className="barcode-footer">
                  Scan Barcode for details
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" id="print-label-btn" onClick={handlePrint}>🖨️ Print Sticker</button>
        </div>
      </div>
    </div>
  );
}

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');

  // Selected filter states (arrays for multi-select)
  const [selectedCats, setSelectedCats] = useState([]);
  const [selectedSubCats, setSelectedSubCats] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editMat, setEditMat] = useState(null);
  const [showQR, setShowQR] = useState(null);

  const navigate = useNavigate();

  const load = () => {
    store.getMaterials().then(setMaterials).catch(console.error);
    store.getSuppliers().then(setSuppliers).catch(console.error);
  };
  useEffect(load, []);

  // Reset subcategory when categories selection changes
  useEffect(() => {
    setSelectedSubCats([]);
  }, [selectedCats]);

  // Extract unique filter list options
  const uniqueColors = useMemo(() => {
    return [...new Set(materials.map(m => m.color).filter(Boolean))].sort();
  }, [materials]);

  const uniqueLocations = useMemo(() => {
    return [...new Set(materials.map(m => m.location).filter(Boolean))].sort();
  }, [materials]);

  const uniqueCategories = useMemo(() => {
    const cats = [...new Set(materials.map(m => m.category).filter(Boolean))];
    if (cats.length === 0) return CATEGORIES;
    return cats.sort();
  }, [materials]);

  const uniqueNames = useMemo(() => {
    return [...new Set(materials.map(m => m.name).filter(Boolean))].sort();
  }, [materials]);

  const availableSubCats = useMemo(() => {
    const filteredMats = selectedCats.length === 0
      ? materials
      : materials.filter(m => selectedCats.includes(m.category));
    const subcats = [...new Set(filteredMats.map(m => m.subCategory).filter(Boolean))].sort();
    if (subcats.length === 0) {
      if (selectedCats.length === 1) {
        return SUB_CATS[selectedCats[0]] || [];
      }
      return Object.values(SUB_CATS).flat();
    }
    return subcats.sort();
  }, [materials, selectedCats]);

  const filtered = materials.filter(m => {
    const q = search.toLowerCase();
    const matchQ = !q || m.name?.toLowerCase().includes(q) || m.code?.toLowerCase().includes(q) || m.location?.toLowerCase().includes(q);
    const matchCat = selectedCats.length === 0 || selectedCats.includes(m.category);
    const matchSubCat = selectedSubCats.length === 0 || selectedSubCats.includes(m.subCategory);
    const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(m.status);
    const matchSupplier = selectedSuppliers.length === 0 || selectedSuppliers.includes(getSupplierName(m.supplier));
    const matchColor = selectedColors.length === 0 || selectedColors.includes(m.color);
    const matchLocation = selectedLocations.length === 0 || selectedLocations.includes(m.location);
    const matchName = selectedNames.length === 0 || selectedNames.includes(m.name);
    const matchType = selectedTypes.length === 0 || selectedTypes.includes(m.inventoryType);

    // Date range filter
    let matchDate = true;
    if (m.receivedDate) {
      let itemDateStr = m.receivedDate;
      if (/^\d{2}-\d{2}-\d{4}$/.test(itemDateStr)) {
        const parts = itemDateStr.split('-');
        itemDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      if (itemDateStr.includes('T')) {
        itemDateStr = itemDateStr.split('T')[0];
      }
      if (startDate && itemDateStr < startDate) matchDate = false;
      if (endDate && itemDateStr > endDate) matchDate = false;
    } else {
      if (startDate || endDate) matchDate = false;
    }

    return matchQ && matchCat && matchSubCat && matchStatus && matchSupplier && matchColor && matchLocation && matchName && matchType && matchDate;
  });

  const handleDelete = async (id) => {
    if (!confirm('Delete this material?')) return;
    try {
      await store.deleteMaterial(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const exportToPdf = async () => {
    if (filtered.length === 0) {
      alert('No data to export.');
      return;
    }
    try {
      const jsPDF = (await import('jspdf')).jsPDF;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4"
      });

      const PAGE_W = doc.internal.pageSize.getWidth();
      const PAGE_H = doc.internal.pageSize.getHeight();
      const M = 20; // margins
      let y = 35;

      const setFont = (style, size) => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
      };

      // Draw page border
      const drawPageBorder = () => {
        doc.setDrawColor(30, 86, 219); // Royal Blue border
        doc.setLineWidth(1);
        doc.rect(M - 5, 10, PAGE_W - 2 * (M - 5), PAGE_H - 20);
      };

      drawPageBorder();

      // --- Header Block (Premium Theme) ---
      doc.setTextColor(30, 86, 219); // Royal Blue
      setFont("bold", 14);
      doc.text("MATERIAL MASTER REPORT", M + 10, y + 15);

      doc.setTextColor(100, 100, 100);
      setFont("normal", 9);
      doc.text(`Records: ${filtered.length} of ${materials.length} | Generated: ${new Date().toLocaleString()}`, M + 10, y + 28);

      // Header underline divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(M, y + 36, PAGE_W - M, y + 36);

      y += 48;

      // Table columns
      const headers = [
        { label: "Code", w: 70, align: "left" },
        { label: "Material Name", w: 150, align: "left" },
        { label: "Category", w: 90, align: "left" },
        { label: "Color", w: 70, align: "left" },
        { label: "Lot Number", w: 70, align: "left" },
        { label: "Supplier", w: 100, align: "left" },
        { label: "Qty / Unit", w: 60, align: "right" },
        { label: "Stock (Rolls)", w: 60, align: "right" },
        { label: "Location", w: 80, align: "center" },
        { label: "Status", w: 60, align: "center" }
      ];

      const totalTableWidth = headers.reduce((sum, h) => sum + h.w, 0);
      const scaleFactor = (PAGE_W - 2 * M) / totalTableWidth;
      headers.forEach(h => { h.w = h.w * scaleFactor; });

      // Draw table header row
      const drawTableHeader = (currentY) => {
        // Royal Blue header box
        doc.setFillColor(26, 86, 219);
        doc.rect(M, currentY, PAGE_W - 2 * M, 22, 'F');

        // Draw white vertical dividers for headers
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.7);
        let dividerX = M;
        headers.forEach((h, hIdx) => {
          if (hIdx > 0) {
            doc.line(dividerX, currentY, dividerX, currentY + 22);
          }
          dividerX += h.w;
        });

        doc.setTextColor(255, 255, 255);
        setFont("bold", 8);

        let curX = M;
        headers.forEach(h => {
          let xOffset = 5;
          if (h.align === "right") xOffset = h.w - 5;
          else if (h.align === "center") xOffset = h.w / 2;

          doc.text(h.label, curX + xOffset, currentY + 14, { align: h.align });
          curX += h.w;
        });
      };

      drawTableHeader(y);
      y += 22;

      // Draw data rows (Dynamic Wrap Layout)
      filtered.forEach((item, idx) => {
        const rowVals = [
          item.code || "—",
          item.name || "—",
          item.category || "—",
          item.color || "—",
          item.lotNo || "—",
          getSupplierName(item.supplier),
          `${item.weight} ${(item.inventoryType === 'Dyeing Material' || item.category === 'Dyeing') ? 'KGS' : (item.unit || 'Kg')}`,
          String(item.rolls || "0"),
          item.location || "—",
          item.status || "—"
        ];

        // Split text to fit each column's scaled width (with 10pt horizontal cell padding)
        const cellLines = rowVals.map((val, colIdx) => {
          const colWidth = headers[colIdx].w - 10;
          return doc.splitTextToSize(String(val), colWidth);
        });

        // Determine row height based on maximum line count in any cell of this row
        const maxLines = Math.max(...cellLines.map(lines => lines.length));
        const rowHeight = 12 + (maxLines * 10); // Base padding + lines height

        if (y + rowHeight > PAGE_H - 45) {
          doc.addPage();
          drawPageBorder();
          y = 30;
          drawTableHeader(y);
          y += 22;
        }

        // Zebra stripes
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, y, PAGE_W - 2 * M, rowHeight, 'F');
        }

        // Draw border around the row
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.6);
        doc.rect(M, y, PAGE_W - 2 * M, rowHeight);

        // Draw vertical dividers
        let dividerX = M;
        headers.forEach((h, hIdx) => {
          if (hIdx > 0) {
            doc.line(dividerX, y, dividerX, y + rowHeight);
          }
          dividerX += h.w;
        });

        doc.setTextColor(15, 23, 42);
        setFont("normal", 7.5);

        let rowX = M;
        headers.forEach((h, colIdx) => {
          const lines = cellLines[colIdx];
          let startX = rowX + 5;
          if (h.align === "right") startX = rowX + h.w - 5;
          else if (h.align === "center") startX = rowX + h.w / 2;

          lines.forEach((line, lineIdx) => {
            const lineY = y + 12 + (lineIdx * 10); // line spacing offset
            doc.text(line, startX, lineY, { align: h.align });
          });
          rowX += h.w;
        });

        y += rowHeight;
      });

      doc.save(`Material_Master_Export_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF: ' + e.message);
    }
  };

  const handleExport = () => {
    try {
      const headers = ['Code', 'Material Name', 'Category', 'Color', 'Lot Number', 'Weight (Kg)', 'Stock (Rolls)', 'Location', 'Status'];
      const rows = filtered.map(m => [
        m.code,
        m.name,
        m.category,
        m.color || '—',
        m.lotNo || '—',
        m.weight,
        m.rolls,
        m.location,
        m.status
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `material_master_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            <div className="breadcrumb"><span>Home</span><span>/</span><span>Material Master</span></div>
            <h1 style={{ margin: 0 }}>Material Master</h1>
            <p style={{ margin: '4px 0 0 0' }}>Manage fabric materials, colors, rolls, and warehouse placement.</p>
          </div>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            id="toggle-inventory-btn"
            onClick={() => navigate('/old-inventory')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Package size={14} />
            View Old Inventory
          </button>
          <button className="btn btn-secondary btn-sm" id="export-materials-csv-btn" onClick={handleExport}><Download size={14} /> Export CSV</button>
          <button className="btn btn-secondary btn-sm" id="export-materials-pdf-btn" onClick={exportToPdf}><Download size={14} /> Export PDF</button>
          {/* <button className="btn btn-primary btn-sm" id="add-material-btn" onClick={() => { setEditMat(null); setShowForm(true); }}><Plus size={14} /> Add Material</button> */}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="card" style={{ overflow: 'visible' }}>
        <div className="card-body" style={{ padding: '16px', overflow: 'visible' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, overflow: 'visible' }}>
            <div className="search-bar" style={{ gridColumn: 'span 2', minWidth: '280px' }}>
              <Search size={14} className="icon" />
              <input id="material-search" placeholder="Search by name, code, location..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <MultiSelect
              label="Inventory Type"
              options={['Normal Inventory', 'FabricStock(Mtrs)', 'Dyeing Material']}
              selectedValues={selectedTypes}
              onChange={vals => { setSelectedTypes(vals); }}
              placeholder="All Inventory Types"
            />

            <MultiSelect
              label="Categories"
              options={uniqueCategories}
              selectedValues={selectedCats}
              onChange={vals => { setSelectedCats(vals); }}
              placeholder="All Categories"
            />

            <MultiSelect
              label="Sub Categories"
              options={availableSubCats}
              selectedValues={selectedSubCats}
              onChange={vals => { setSelectedSubCats(vals); }}
              placeholder="All Sub Categories"
            />

            <MultiSelect
              label="Status"
              options={['Active', 'Low Stock', 'Inactive']}
              selectedValues={selectedStatuses}
              onChange={vals => { setSelectedStatuses(vals); }}
              placeholder="All Status"
            />

            <MultiSelect
              label="Suppliers"
              options={suppliers.map(s => s.name)}
              selectedValues={selectedSuppliers}
              onChange={vals => { setSelectedSuppliers(vals); }}
              placeholder="All Suppliers"
            />

            <MultiSelect
              label="Colors"
              options={uniqueColors}
              selectedValues={selectedColors}
              onChange={vals => { setSelectedColors(vals); }}
              placeholder="All Colors"
            />

            <MultiSelect
              label="Locations"
              options={uniqueLocations}
              selectedValues={selectedLocations}
              onChange={vals => { setSelectedLocations(vals); }}
              placeholder="All Locations"
            />

            <MultiSelect
              label="Descriptions"
              options={uniqueNames}
              selectedValues={selectedNames}
              onChange={vals => { setSelectedNames(vals); }}
              placeholder="All Material Names"
            />

            <div className="form-group" style={{ minWidth: '150px' }}>
              <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Start Date" title="Start Date" />
            </div>

            <div className="form-group" style={{ minWidth: '150px' }}>
              <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="End Date" title="End Date" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setSelectedCats([]);
                setSelectedSubCats([]);
                setSelectedStatuses([]);
                setSelectedSuppliers([]);
                setSelectedColors([]);
                setSelectedLocations([]);
                setSelectedNames([]);
                setSelectedTypes([]);
                setStartDate('');
                setEndDate('');
              }}
            >
              Reset Filters
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Found <strong>{filtered.length}</strong> items</span>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      {/* <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 8 }}>
        <div className="card" style={{ padding: '14px 18px', background: 'var(--surface)', borderRadius: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>TOTAL ROLLS RECEIVED</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>
            {filtered.reduce((sum, m) => sum + (parseInt(m.rolls) || 0), 0)} Rolls
          </div>
        </div>
        <div className="card" style={{ padding: '14px 18px', background: 'var(--surface)', borderRadius: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>TOTAL QUANTITY (KG)</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success)', marginTop: '4px' }}>
            {filtered.filter(m => m.unit !== 'MTR').reduce((sum, m) => sum + (parseFloat(m.weight) || 0.0), 0).toFixed(2)} KG
          </div>
        </div>
        <div className="card" style={{ padding: '14px 18px', background: 'var(--surface)', borderRadius: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>TOTAL QUANTITY (MTRS)</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)', marginTop: '4px' }}>
            {filtered.filter(m => m.unit === 'MTR').reduce((sum, m) => sum + (parseFloat(m.weight) || 0.0), 0).toFixed(2)} MTR
          </div>
        </div>
      </div> */}

      {/* Table */}
      <div className="old-inventory-card">
        <div className="old-inventory-table-wrap">
          <table className="old-inventory-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Material Name</th>
                <th>Category</th>
                <th>Color</th>
                <th>Lot Number</th>
                <th>Supplier</th>
                <th>Weight / Meters</th>
                <th>Stock (Rolls)</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Package size={28} /></div>
                    <h3>No Materials Found</h3>
                    <p>Try adjusting your search or add a new material.</p>
                  </div>
                </td></tr>
              ) : filtered.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>{m.code}</td>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td><span className="badge badge-primary" style={{ fontSize: 11 }}>{m.category}</span></td>
                  <td>{m.color || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{m.lotNo || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getSupplierName(m.supplier)}</td>
                  <td>{m.weight} {(m.inventoryType === 'Dyeing Material' || m.category === 'Dyeing') ? 'KGS' : (m.unit || 'Kg')}</td>
                  <td style={{ fontWeight: 700 }}>{m.rolls}</td>
                  <td><span className="tag" style={{ fontSize: 11 }}>{m.location}</span></td>
                  <td>
                    <span className={`badge ${m.status === 'Active' ? 'badge-success' : m.status === 'Low Stock' ? 'badge-warning' : 'badge-secondary'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" title="View QR" id={`qr-btn-${m.id}`} onClick={() => setShowQR(m)}><QrCode size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Edit" id={`edit-mat-${m.id}`} onClick={() => { setEditMat(m); setShowForm(true); }}><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Delete" id={`del-mat-${m.id}`} onClick={() => handleDelete(m.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <MaterialForm
          material={editMat}
          suppliers={suppliers}
          categories={uniqueCategories}
          subcategories={availableSubCats}
          onSave={() => { load(); setShowForm(false); }}
          onClose={() => setShowForm(false)}
        />
      )}
      {showQR && <BarcodeModal material={showQR} onClose={() => setShowQR(null)} />}

      {/* Custom Premium Styles for Table and Animations */}
      <style>{`
        .old-inventory-card {
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-md);
          background: var(--surface);
          overflow: hidden;
          margin-top: 8px;
        }
        
        .old-inventory-table-wrap {
          overflow-x: auto;
        }

        .old-inventory-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          text-align: left;
        }

        /* Royal blue header styling */
        .old-inventory-table thead tr {
          background: linear-gradient(135deg, #1e40af 0%, #1a56db 100%);
          color: #ffffff;
        }

        .old-inventory-table th {
          padding: 14px 16px;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #1d4ed8;
          color: #ffffff !important;
          background: transparent !important;
        }

        .old-inventory-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          border-right: 1px solid var(--border);
          color: var(--text-primary);
          vertical-align: middle;
          transition: all 0.2s ease;
        }

        /* Hide right border for last column */
        .old-inventory-table td:last-child,
        .old-inventory-table th:last-child {
          border-right: none;
        }

        /* Row hover effect */
        .old-inventory-table tbody tr {
          transition: background-color 0.15s ease;
        }

        .old-inventory-table tbody tr:hover {
          background-color: rgba(26, 86, 219, 0.04) !important;
        }

        /* Alternating row colors for premium readability */
        .old-inventory-table tbody tr:nth-child(even) {
          background-color: rgba(248, 250, 252, 0.6);
        }
        
        .dark .old-inventory-table tbody tr:nth-child(even) {
          background-color: rgba(30, 41, 59, 0.4);
        }

        .old-inventory-table tbody tr:nth-child(odd) {
          background-color: var(--surface);
        }
      `}</style>
    </div>
  );
}
