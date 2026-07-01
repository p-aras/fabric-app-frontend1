import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Package, QrCode, Download, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { store } from '../store.js';
import { BarcodeModal } from './Materials.jsx';

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

export default function OldInventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showQR, setShowQR] = useState(null);

  // Dynamic filter options lists loaded from database
  const [parties, setParties] = useState([]);
  const [shades, setShades] = useState([]);
  const [stores, setStores] = useState([]);
  const [descriptions, setDescriptions] = useState([]);

  // Selected filter states (arrays for multi-select)
  const [selectedParties, setSelectedParties] = useState([]);
  const [selectedShades, setSelectedShades] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectedDescriptions, setSelectedDescriptions] = useState([]);
  const [stockStatus, setStockStatus] = useState('All');
  const [balPkgs, setBalPkgs] = useState('');

  // Fetch unique filter options once on component mount
  useEffect(() => {
    store.getInventoryFilterValues().then(res => {
      if (res.success) {
        setParties(res.parties || []);
        setShades(res.shades || []);
        setStores(res.stores || []);
        setDescriptions(res.descriptions || []);
      }
    }).catch(console.error);
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await store.getInventory(
        page,
        limit,
        search,
        selectedParties.join(','),
        selectedShades.join(','),
        selectedStores.join(','),
        stockStatus,
        balPkgs,
        selectedDescriptions.join(',')
      );
      if (res.success) {
        setItems(res.data || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.totalCount || 0);
      } else {
        alert(res.error || 'Failed to fetch inventory.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load inventory data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when page or any filter changes
  useEffect(() => {
    fetchInventory();
  }, [page, selectedParties, selectedShades, selectedStores, selectedDescriptions, stockStatus, balPkgs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInventory();
  };

  const handleExport = () => {
    if (items.length === 0) {
      alert('No data to export.');
      return;
    }
    try {
      const headers = [
        'Barcode', 'Item Description', 'Unit', 'Shade', 'Lot No',
        'Rect No', 'Rect Date', 'Party', 'Store', 'Issue No',
        'Issue Date', 'MRN Pkgs', 'Issue Pkgs', 'ADJ Pkgs', 'Bal Pkgs',
        'MRN WT', 'Issue WT', 'Adj WT', 'Bal WT'
      ];
      const rows = items.map(m => [
        m.barcode, m.item_description, m.unit, m.shade, m.lot_no,
        m.rect_no, m.rect_date, m.party, m.store, m.issue_no,
        m.issue_date, m.mrn_pkgs, m.issue_pkgs, m.adj_pkgs, m.bal_pkgs,
        m.mrn_wt, m.issue_wt, m.adj_wt, m.bal_wt
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `legacy_mysql_inventory_page_${page}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const exportToPdf = async () => {
    if (items.length === 0) {
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
      doc.text("OLD LOT INVENTORY REPORT", M + 10, y + 15);

      doc.setTextColor(100, 100, 100);
      setFont("normal", 9);
      doc.text(`Page: ${page} | Records: ${items.length} of ${totalCount} | Generated: ${new Date().toLocaleString()}`, M + 10, y + 28);

      // Header underline divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(M, y + 36, PAGE_W - M, y + 36);

      y += 48;

      // Table columns (excluding the removed Adj Pkgs, Adj WT, and MRN/Issue columns)
      const headers = [
        { label: "Barcode", w: 80, align: "left" },
        { label: "Item Description", w: 160, align: "left" },
        { label: "Unit", w: 35, align: "center" },
        { label: "Shade", w: 80, align: "left" },
        { label: "Lot No", w: 65, align: "left" },
        { label: "Rect No", w: 65, align: "left" },
        { label: "Rect Date", w: 70, align: "center" },
        { label: "Party", w: 110, align: "left" },
        { label: "Store", w: 60, align: "center" },
        { label: "Bal Pk", w: 50, align: "right" },
        { label: "Bal WT", w: 55, align: "right" }
      ];

      const totalTableWidth = headers.reduce((sum, h) => sum + h.w, 0);
      const scaleFactor = (PAGE_W - 2 * M) / totalTableWidth;
      headers.forEach(h => { h.w = h.w * scaleFactor; });

      // Draw table header row
      const drawTableHeader = (currentY) => {
        // Royal Blue header box
        doc.setFillColor(26, 86, 219);
        doc.rect(M, currentY, PAGE_W - 2 * M, 20, 'F');

        doc.setTextColor(255, 255, 255);
        setFont("bold", 7.5);

        let curX = M;
        headers.forEach(h => {
          let xOffset = 4;
          if (h.align === "right") xOffset = h.w - 4;
          else if (h.align === "center") xOffset = h.w / 2;

          doc.text(h.label, curX + xOffset, currentY + 13, { align: h.align });
          curX += h.w;
        });
      };

      drawTableHeader(y);
      y += 20;

      // Draw data rows
      items.forEach((item, idx) => {
        if (y > PAGE_H - 35) {
          doc.addPage();
          drawPageBorder();
          y = 30;
          drawTableHeader(y);
          y += 20;
        }

        // Draw row bottom line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(M, y + 16, PAGE_W - M, y + 16);

        // Zebra stripes
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, y, PAGE_W - 2 * M, 16, 'F');
        }

        doc.setTextColor(15, 23, 42);
        setFont("normal", 7);

        let rowX = M;
        const rowVals = [
          item.barcode || "—",
          String(item.item_description || "—").length > 35 ? String(item.item_description).substring(0, 32) + "..." : (item.item_description || "—"),
          item.unit || "—",
          item.shade || "—",
          item.lot_no || "—",
          item.rect_no || "—",
          item.rect_date || "—",
          String(item.party || "—").length > 25 ? String(item.party).substring(0, 22) + "..." : (item.party || "—"),
          item.store || "—",
          String(item.bal_pkgs || "0"),
          String(item.bal_wt || "0")
        ];

        headers.forEach((h, cIdx) => {
          let val = rowVals[cIdx];
          let xOffset = 4;
          if (h.align === "right") xOffset = h.w - 4;
          else if (h.align === "center") xOffset = h.w / 2;

          doc.text(val, rowX + xOffset, y + 11, { align: h.align });
          rowX += h.w;
        });

        y += 16;
      });

      doc.save(`Legacy_Inventory_Page_${page}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF: ' + e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-block" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <button
            onClick={() => navigate('/materials')}
            className="btn btn-secondary btn-icon btn-sm"
            style={{ borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
            title="Back to Materials"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="breadcrumb"><span>Home</span><span>/</span><span>Legacy Inventory (MySQL)</span></div>
            <h1 style={{ margin: 0 }}>OLD LOT Inventory</h1>
            <p style={{ margin: '4px 0 0 0' }}>Browse and search complete historical fabric rolls dataset with all parameters.</p>
          </div>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Export CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={exportToPdf}><Download size={14} /> Export PDF</button>
          <button className="btn btn-secondary btn-sm" onClick={fetchInventory} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-animation' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="card" style={{ overflow: 'visible' }}>
        <div className="card-body" style={{ padding: '16px', overflow: 'visible' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, overflow: 'visible' }}>
            <form onSubmit={handleSearchSubmit} style={{ gridColumn: 'span 2', minWidth: '280px', display: 'flex', gap: 8 }}>
              <div className="search-bar" style={{ flex: 1 }}>
                <Search size={14} className="icon" />
                <input
                  id="inventory-search"
                  placeholder="Search by description, barcode, lot..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
            </form>

            <MultiSelect
              label="Suppliers"
              options={parties}
              selectedValues={selectedParties}
              onChange={vals => { setPage(1); setSelectedParties(vals); }}
              placeholder="All Suppliers (Party)"
            />

            <MultiSelect
              label="Shades"
              options={shades}
              selectedValues={selectedShades}
              onChange={vals => { setPage(1); setSelectedShades(vals); }}
              placeholder="All Shades (Color)"
            />

            <MultiSelect
              label="Store Locations"
              options={stores}
              selectedValues={selectedStores}
              onChange={vals => { setPage(1); setSelectedStores(vals); }}
              placeholder="All Store Locations"
            />

            <MultiSelect
              label="Descriptions"
              options={descriptions}
              selectedValues={selectedDescriptions}
              onChange={vals => { setPage(1); setSelectedDescriptions(vals); }}
              placeholder="All Item Descriptions"
            />

            <select className="form-control" value={stockStatus} onChange={e => { setPage(1); setStockStatus(e.target.value); }}>
              <option value="All">All Stock Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>

            <select className="form-control" value={balPkgs} onChange={e => { setPage(1); setBalPkgs(e.target.value); }}>
              <option value="">All Bal Pkgs</option>
              <option value="0">0</option>
              <option value="1">1</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setSelectedParties([]);
                setSelectedShades([]);
                setSelectedStores([]);
                setSelectedDescriptions([]);
                setStockStatus('All');
                setBalPkgs('');
                setPage(1);
              }}
            >
              Reset Filters
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {items.length} of <strong>{totalCount}</strong> records
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="old-inventory-card">
        <div className="old-inventory-table-wrap">
          <table className="old-inventory-table">
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                <th>Barcode</th>
                <th>Item Description</th>
                <th>Unit</th>
                <th>Shade</th>
                <th>Lot No</th>
                <th>Rect No</th>
                <th>Rect Date</th>
                <th>Party</th>
                <th>Store (Location)</th>
                <th>Issue No</th>
                <th>Issue Date</th>
                <th>MRN Pkgs</th>
                <th>Issue Pkgs</th>
                <th>Bal Pkgs</th>
                <th>MRN WT</th>
                <th>Issue WT</th>
                <th>Bal WT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={20} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <RefreshCw size={20} className="spin-animation" style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading inventory data...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={20}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Package size={28} /></div>
                      <h3>No Legacy Records Found</h3>
                      <p>Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      title="View QR"
                      onClick={() => setShowQR({
                        code: item.barcode || '',
                        name: item.item_description || '',
                        category: 'Old Inventory',
                        subCategory: '',
                        color: item.shade || '',
                        lotNo: item.lot_no || '',
                        weight: item.bal_wt || '0.00',
                        rolls: item.bal_pkgs || '0',
                        location: item.store || '',
                        receivedDate: item.rect_date || '',
                        party: item.party || ''
                      })}
                    >
                      <QrCode size={14} />
                    </button>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.barcode || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{item.item_description || '—'}</td>
                  <td>{item.unit || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{item.shade || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{item.lot_no || '—'}</td>
                  <td>{item.rect_no || '—'}</td>
                  <td>{item.rect_date || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.party || '—'}</td>
                  <td><span className="tag" style={{ fontSize: 11 }}>{item.store || '—'}</span></td>
                  <td>{item.issue_no || '—'}</td>
                  <td>{item.issue_date || '—'}</td>
                  <td>{item.mrn_pkgs || '—'}</td>
                  <td>{item.issue_pkgs || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{item.bal_pkgs || '0'}</td>
                  <td>{item.mrn_wt || '—'} Kg</td>
                  <td>{item.issue_wt || '—'} Kg</td>
                  <td style={{ fontWeight: 700, color: parseFloat(item.bal_wt) > 0 ? 'var(--success)' : 'inherit' }}>
                    {item.bal_wt || '0'} Kg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> (Total: {totalCount} records)
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

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
          min-width: 1800px;
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

        .spin-animation {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {showQR && (
        <BarcodeModal
          material={showQR}
          onClose={() => setShowQR(null)}
        />
      )}
    </div>
  );
}
