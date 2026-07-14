import { useState, useEffect, useMemo } from 'react';
import { store } from '../store.js';
import {
  Warehouse, Box, Package, Info,
  Search, ArrowUpDown, RefreshCw, Scale
} from 'lucide-react';

export default function WarehousePage() {
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Search & filter states
  const [locSearch, setLocSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'rolls', 'weight', 'items'

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active/dyeing materials and settings first (fast)
      const [mats, settings] = await Promise.all([
        store.getMaterials(),
        store.getSettingsData()
      ]);

      const activeList = (mats || []).map(m => ({
        ...m,
        inventoryType: m.category === 'Dyeing' ? 'Dyeing Material' : 'Active Inventory'
      }));

      setMaterials(activeList);
      setShelves(settings.shelves || []);
      setSuppliers(settings.suppliers || []);
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
          console.error("Error loading background legacy inventory:", oldErr);
        }
      }, 50);

    } catch (err) {
      console.error("Error loading warehouse data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  // Helper to resolve stable HSL colors for each custom location name
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

  // Filter materials based on selected type & category
  const filteredMaterialsForLocs = useMemo(() => {
    return materials.filter(m => {
      const matchesType = selectedType === 'All' || m.inventoryType === selectedType;
      const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
      return matchesType && matchesCategory;
    });
  }, [materials, selectedType, selectedCategory]);

  // Group materials by location dynamically
  const locationsData = useMemo(() => {
    const map = {};
    filteredMaterialsForLocs.forEach(m => {
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
        hasCapacity: capacity > 0
      };
    });
  }, [filteredMaterialsForLocs, shelves]);

  // Unique categories for filtering
  const uniqueCategories = useMemo(() => {
    const cats = new Set();
    materials.forEach(m => {
      if (m.category) cats.add(m.category);
    });
    return ['All', ...Array.from(cats)].sort();
  }, [materials]);

  // Overall warehouse summary stats
  const overallStats = useMemo(() => {
    let totalRolls = 0;
    let totalWeight = 0;
    filteredMaterialsForLocs.forEach(m => {
      totalRolls += (parseInt(m.rolls) || 0);
      totalWeight += (parseFloat(m.weight) || 0);
    });
    return {
      totalLocations: locationsData.length,
      totalRolls,
      totalWeight: totalWeight.toFixed(2),
      totalItems: filteredMaterialsForLocs.length
    };
  }, [filteredMaterialsForLocs, locationsData]);

  // Filtered & sorted locations list
  const filteredLocations = useMemo(() => {
    return locationsData
      .filter(loc => loc.name.toLowerCase().includes(locSearch.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        } else if (sortBy === 'rolls') {
          return b.rolls - a.rolls;
        } else if (sortBy === 'weight') {
          return b.weight - a.weight;
        } else if (sortBy === 'items') {
          return b.itemsCount - a.itemsCount;
        }
        return 0;
      });
  }, [locationsData, locSearch, sortBy]);

  // Selected location details
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

  const getSupplierName = (sup) => {
    if (!sup) return '—';
    if (!isNaN(sup)) {
      return suppliers.find(s => s.id === Number(sup))?.name || sup;
    }
    return suppliers.find(s => s.id === sup || s.name === sup)?.name || sup;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* CSS styles block */}
      <style>{`
        .loc-card {
          position: relative;
          background: var(--surface);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          padding: 16px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .loc-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-lg);
        }
        .loc-card.selected-loc {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-light), var(--shadow-md);
          background: var(--primary-light);
        }
        .dark .loc-card.selected-loc {
          background: rgba(26, 86, 219, 0.1);
          box-shadow: 0 0 0 2px rgba(26, 86, 219, 0.3), var(--shadow-md);
        }
        .stat-icon-wrapper {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .category-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 9999px;
          background: var(--border);
          color: var(--text-secondary);
        }
        .stats-badge-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed var(--border);
        }
        .stat-badge-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .stat-badge-value {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .stat-badge-label {
          font-size: 9px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pulse-light {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1.8s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div className="page-title-block">
          <div className="breadcrumb">
            <span>Home</span>
            <span>/</span>
            <span>Warehouse</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
            <h1>Warehouse Management</h1>
            <button className="btn btn-ghost" onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading warehouse inventory data...</div>
        </div>
      ) : (
        <>
          {/* Summary Cards Dashboard */}
          <div className="grid grid-4" style={{ gap: 16 }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
              <div className="stat-icon-wrapper" style={{ background: '#e8f0fe', color: '#1a56db' }}>
                <Warehouse size={20} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Storage Areas</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{overallStats.totalLocations}</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
              <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#10b981' }}>
                <Package size={20} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Rolls</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{overallStats.totalRolls.toLocaleString()}</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
              <div className="stat-icon-wrapper" style={{ background: '#fef9c3', color: '#d97706' }}>
                <Scale size={20} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Weight</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{overallStats.totalWeight} Kg</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
              <div className="stat-icon-wrapper" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                <Box size={20} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Unique Batches</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{overallStats.totalItems}</div>
              </div>
            </div>
          </div>

          {/* Filtering and Search Section */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: 36 }}
                    placeholder="Search locations by name..."
                    value={locSearch}
                    onChange={e => setLocSearch(e.target.value)}
                  />
                </div>

                <div style={{ width: '160px' }}>
                  <select
                    className="form-control"
                    value={selectedType}
                    onChange={e => {
                      setSelectedType(e.target.value);
                      setSelectedLocation(null);
                    }}
                  >
                    <option value="All">All Stock Types</option>
                    <option value="Active Inventory">Active Stock</option>
                    <option value="Dyeing Material">Dyeing Stock</option>
                    <option value="Old Inventory">Old Inventory</option>
                  </select>
                </div>

                <div style={{ width: '160px' }}>
                  <select
                    className="form-control"
                    value={selectedCategory}
                    onChange={e => {
                      setSelectedCategory(e.target.value);
                      setSelectedLocation(null);
                    }}
                  >
                    <option value="All">All Categories</option>
                    {uniqueCategories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ArrowUpDown size={14} />
                  Sort By:
                </span>
                <select
                  className="form-control"
                  style={{ width: '140px', padding: '6px 12px' }}
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="name">Location Name</option>
                  <option value="rolls">Stock (Rolls)</option>
                  <option value="weight">Weight (Kg)</option>
                  <option value="items">Unique Items</option>
                </select>
              </div>
            </div>
          </div>

          {/* Locations Grid Layout */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Storage Locations ({filteredLocations.length})
              </h2>
              {selectedLocation && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSelectedLocation(null); setItemSearch(''); }}
                  style={{ fontSize: 12 }}
                >
                  Clear Selection
                </button>
              )}
            </div>

            {filteredLocations.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}><Info size={32} style={{ margin: '0 auto' }} /></div>
                <h3>No Locations Found</h3>
                <p>No storage locations match your current search parameters.</p>
              </div>
            ) : (
              <div className="grid grid-3" style={{ gap: 16 }}>
                {filteredLocations.map(loc => {
                  const colors = getLocColors(loc.name);
                  const isSelected = selectedLocation === loc.id;
                  return (
                    <div
                      key={loc.id}
                      className={`loc-card ${isSelected ? 'selected-loc' : ''}`}
                      style={{
                        cursor: 'pointer',
                        borderLeft: `4px solid ${colors.primary}`,
                      }}
                      onClick={() => {
                        setSelectedLocation(isSelected ? null : loc.id);
                        setItemSearch('');
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {loc.name}
                            {isSelected && <span className="pulse-light" style={{ background: colors.primary }} />}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            {loc.categories.map(cat => (
                              <span key={cat} className="category-pill">{cat}</span>
                            ))}
                          </div>
                        </div>
                        <span style={{ width: 32, height: 32, borderRadius: 6, background: `${colors.primary}15`, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                          <Warehouse size={16} style={{ color: colors.primary }} />
                        </span>
                      </div>

                      {/* Capacity progress bar if applicable */}
                      {loc.hasCapacity && (
                        <div style={{ marginTop: 12, marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                            <span>Cap: {loc.rolls} / {loc.capacity} Rolls</span>
                            <span style={{ fontWeight: 700, color: loc.pct >= 90 ? 'var(--danger)' : loc.pct >= 50 ? '#d97706' : 'var(--success)' }}>
                              {loc.pct}%
                            </span>
                          </div>
                          <div className="progress-bar" style={{ height: 5, background: 'var(--border)' }}>
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.min(loc.pct, 100)}%`,
                                background: loc.pct >= 90 ? 'var(--danger)' : loc.pct >= 50 ? 'var(--warning)' : 'var(--success)'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="stats-badge-grid">
                        <div className="stat-badge-item">
                          <span className="stat-badge-value">{loc.itemsCount}</span>
                          <span className="stat-badge-label">Items</span>
                        </div>
                        <div className="stat-badge-item">
                          <span className="stat-badge-value">{loc.rolls.toLocaleString()}</span>
                          <span className="stat-badge-label">Rolls</span>
                        </div>
                        <div className="stat-badge-item">
                          <span className="stat-badge-value">{loc.weight.toFixed(1)}</span>
                          <span className="stat-badge-label">Kg</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details Table Section */}
          {selectedLocation && selectedLocDetails && (
            <div className="card" style={{ marginTop: 10 }}>
              <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">
                  <Package size={15} />
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
                        {filteredItems.map(m => (
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
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getSupplierName(m.supplier)}</td>
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
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
