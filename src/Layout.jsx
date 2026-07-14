import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { store } from './store.js';
import {
  Home, Package, Warehouse, PackagePlus, PackageMinus,
  ArrowLeftRight, BarChart3, Settings, ChevronDown,
  Search, Bell, Sun, Moon, Menu, LogOut, ChevronRight,
  Printer, Sparkles, Droplets, Grid, History, AlertCircle,
  Layers, Ruler, Scissors, FileText, Database
} from 'lucide-react';

const NAV = [
  { path: '/', icon: Home, label: 'Dashboard Home' },
  { path: '/materials', icon: Package, label: 'Material Master' },
  { path: '/old-inventory', icon: History, label: ' Old Inventory' },
  {
    label: 'Stock Add',
    icon: PackagePlus,
    children: [
      { path: '/fabric-sticker', icon: Printer, label: 'Material Add' },
      { path: '/dyeing-material', icon: Droplets, label: 'Dyeing Material' },
      { path: '/fabric-stock', icon: Ruler, label: 'Fabric Stock (Mtrs)' },
      { path: '/material-against-po', icon: FileText, label: 'Material Against PO' },
      { path: '/fabric-po-audit', icon: Database, label: 'Fabric PO Audit' },
      { path: '/re-add-material', icon: Printer, label: 'Re Add Material In Stock' }
    ]
  },
  { path: '/recommendation', icon: Sparkles, label: 'Storage Recommendation' },
  { path: '/warehouse', icon: Warehouse, label: 'Warehouse' },
  { path: '/grn', icon: PackagePlus, label: 'Material Receive (GRN)' },
  { path: '/issue', icon: PackageMinus, label: 'Material Issue' },
  { path: '/transfer', icon: ArrowLeftRight, label: 'Material Transfer' },
  { path: '/parta', icon: Grid, label: 'Job Order Matrix (Parta)' },
  { path: '/job-orders', icon: Layers, label: 'Job Orders' },
  { path: '/fabric-receiving-history', icon: History, label: 'Fabric Returns Log' },
  { path: '/reports/daily-fabric-issue', icon: FileText, label: 'Daily Fabric Issue' },
  { path: '/parta-pending', icon: AlertCircle, label: 'Pending info in Parta' },
  {
    label: 'Reports',
    icon: BarChart3,
    children: [
      { path: '/reports/dyeing-shortage', icon: Droplets, label: 'Dyeing Shortage Report' },
      {
        label: 'Daily Inventory Report',
        icon: FileText,
        children: [
          { path: '/reports/daily-inventory/quantity-wise', label: 'Quantity Wise Report' },
          { path: '/reports/daily-inventory/item-wise', label: 'Item Wise Report' }
        ]
      },
      {
        label: 'Daily Report Cutting',
        icon: Scissors,
        children: [
          { path: '/reports/daily-cutting/cutter-master', label: 'Cutter Master Wise' },
          { path: '/reports/daily-cutting/supervisor', label: 'Supervisor Wise' },
          { path: '/reports/daily-cutting/hall', label: 'Hall Wise' },
          { path: '/reports/daily-cutting/location', label: 'Location Wise' }
        ]
      }
    ]
  },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ children, darkMode, toggleDark, currentUser, handleLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [search, setSearch] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [stats, setStats] = useState({ rooms: 0, racks: 0, capacity: 0 });
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [materials, setMaterials] = useState([]);

  const loadPendingData = async () => {
    try {
      const [transfersData, matsData] = await Promise.all([
        store.getTransfers(),
        store.getMaterials()
      ]);
      setPendingTransfers((transfersData || []).filter(t => t.status === 'Pending'));
      setMaterials(matsData || []);
    } catch (e) {
      console.error('Error loading pending data:', e);
    }
  };

  useEffect(() => {
    loadPendingData();
    const interval = setInterval(loadPendingData, 10000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleApprove = async (id) => {
    try {
      await store.approveTransfer(id);
      loadPendingData();
    } catch (e) {
      alert(e.message || 'Error approving transfer');
    }
  };

  const handleReject = async (id) => {
    try {
      await store.rejectTransfer(id);
      loadPendingData();
    } catch (e) {
      alert(e.message || 'Error rejecting transfer');
    }
  };

  const getMaterialName = (id) => {
    return materials.find(m => m.id === id)?.name || '—';
  };

  const filteredNav = NAV.filter(item => {
    if (item.path === '/parta-pending') {
      return currentUser?.role !== 'Admin';
    }
    if (item.path === '/settings') {
      return currentUser?.role === 'Admin';
    }
    return true;
  });

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      try {
        const [loadedRooms, loadedRacks, shelves] = await Promise.all([
          store.getRooms(),
          store.getRacks(),
          store.getShelves()
        ]);
        if (!active) return;
        const capacity = (shelves || []).reduce((sum, s) => sum + (s.capacity || 0), 0);
        setStats({
          rooms: (loadedRooms || []).length,
          racks: (loadedRacks || []).length,
          capacity
        });
      } catch (e) {
        console.error(e);
      }
    };
    loadStats();
    return () => { active = false; };
  }, [location.pathname]);

  const toggleMenu = (label) => setOpenMenus(o => ({ ...o, [label]: !o[label] }));

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`app-layout ${darkMode ? 'dark' : ''}`}>
      {/* SIDEBAR */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">TW</div>
          {!collapsed && (
            <div className="logo-text">
              <div className="logo-title">Textile Warehouse</div>
              <div className="logo-sub">Management System</div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {!collapsed && <div className="nav-section-label">Main Menu</div>}
          {filteredNav.map(item => {
            if (item.children) {
              const open = openMenus[item.label];
              const active = item.children.some(c => {
                if (c.children) {
                  return c.children.some(gc => location.pathname === gc.path) || (c.path && location.pathname.startsWith(c.path));
                }
                return c.path && location.pathname.startsWith(c.path);
              }) || (item.path && location.pathname.startsWith(item.path));

              return (
                <div key={item.label}>
                  <div
                    className={`nav-item ${active ? 'active' : ''} ${open ? 'open' : ''}`}
                    onClick={() => toggleMenu(item.label)}
                    title={collapsed ? item.label : ''}
                  >
                    <span className="nav-icon"><item.icon size={17} /></span>
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && <ChevronDown size={14} className="nav-chevron" />}
                  </div>
                  {open && !collapsed && (
                    <div className="nav-submenu">
                      {item.children.map(child => {
                        if (child.children) {
                          const childOpen = openMenus[child.label];
                          const childActive = child.children.some(gc => location.pathname === gc.path);
                          return (
                            <div key={child.label}>
                              <div
                                className={`nav-item ${childActive ? 'active' : ''} ${childOpen ? 'open' : ''}`}
                                onClick={() => toggleMenu(child.label)}
                                style={{ fontSize: 13 }}
                              >
                                <span className="nav-icon">{child.icon && <child.icon size={13} />}</span>
                                <span>{child.label}</span>
                                <ChevronDown size={12} className="nav-chevron" />
                              </div>
                              {childOpen && (
                                <div className="nav-sub-submenu" style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 3, borderLeft: '1px dashed rgba(255, 255, 255, 0.1)', marginLeft: 12, marginTop: 2 }}>
                                  {child.children.map(grandchild => (
                                    <div
                                      key={grandchild.path}
                                      className={`nav-item ${location.pathname === grandchild.path ? 'active' : ''}`}
                                      onClick={() => navigate(grandchild.path)}
                                      style={{ fontSize: 12, padding: '6px 12px' }}
                                    >
                                      <span>{grandchild.label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div
                            key={child.path}
                            className={`nav-item ${location.pathname === child.path ? 'active' : ''}`}
                            onClick={() => navigate(child.path)}
                            style={{ fontSize: 13 }}
                          >
                            <span className="nav-icon"><child.icon size={13} /></span>
                            <span>{child.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div
                key={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : ''}
              >
                <span className="nav-icon"><item.icon size={17} /></span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.04)', fontSize: 12 }}>
              <div style={{ color: '#94a3b8', marginBottom: 4 }}>Warehouse Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', fontSize: 12, marginBottom: 3 }}>
                <span>Total Rooms</span><span style={{ fontWeight: 700 }}>{stats.rooms}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', fontSize: 12, marginBottom: 3 }}>
                <span>Total Racks</span><span style={{ fontWeight: 700 }}>{stats.racks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', fontSize: 12, marginBottom: 3 }}>
                <span>Capacity</span><span style={{ fontWeight: 700, color: '#10b981' }}>{stats.capacity.toLocaleString()} Rolls</span>
              </div>
            </div>
          )}
          <div
            className="nav-item"
            style={{ marginTop: 8 }}
            onClick={handleLogout}
            title="Logout"
          >
            <span className="nav-icon"><LogOut size={17} /></span>
            {!collapsed && <span>Logout</span>}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        {/* TOPBAR */}
        <header className="topbar">
          <button className="topbar-toggle" onClick={() => setCollapsed(c => !c)} id="sidebar-toggle-btn">
            <Menu size={18} />
          </button>

          <div className="topbar-search">
            <Search size={15} className="search-icon" />
            <input
              id="global-search-input"
              placeholder="Search materials, codes, locations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="topbar-actions">
            <button className="topbar-btn" onClick={toggleDark} id="dark-mode-toggle" title="Toggle Dark Mode">
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div style={{ position: 'relative' }}>
              <button className="topbar-btn" id="notifications-btn" title="Notifications" onClick={() => setShowNotifs(s => !s)}>
                <Bell size={17} />
                {pendingTransfers.length > 0 && <span className="notification-badge" />}
              </button>

              {showNotifs && (
                <div
                  className="notifications-dropdown card"
                  style={{
                    position: 'absolute',
                    top: '44px',
                    right: '0px',
                    width: '320px',
                    zIndex: 1000,
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)'
                  }}
                >
                  <div className="card-header" style={{ padding: '10px 14px', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Pending Approvals</div>
                    <span className="badge badge-primary" style={{ fontSize: 10, fontWeight: 700 }}>
                      {pendingTransfers.length}
                    </span>
                  </div>
                  <div className="card-body" style={{ padding: 0, maxHeight: '280px', overflowY: 'auto' }}>
                    {pendingTransfers.length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                        No pending transfer requests.
                      </div>
                    ) : (
                      pendingTransfers.map(t => (
                        <div key={t.id} style={{ padding: 12, borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t.transferredBy} requested:
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            Material: <strong>{getMaterialName(t.materialId)}</strong>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            Qty: <strong>{t.rolls} Rolls</strong>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            Route: <span className="badge badge-secondary" style={{ padding: '2px 4px', fontSize: 10 }}>{t.fromLocation}</span> → <span className="badge badge-primary" style={{ padding: '2px 4px', fontSize: 10 }}>{t.toLocation}</span>
                          </div>
                          {currentUser?.role === 'Admin' ? (
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                              <button
                                className="btn btn-success btn-sm"
                                style={{ flex: 1, padding: '4px 8px', fontSize: 11 }}
                                onClick={() => handleApprove(t.id)}
                              >
                                Yes (Approve)
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ flex: 1, padding: '4px 8px', fontSize: 11 }}
                                onClick={() => handleReject(t.id)}
                              >
                                No (Reject)
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 650 }}>
                              Waiting for Admin Approval
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="user-avatar" id="user-profile-btn">
              <div className="avatar-circle">{currentUser?.avatar || 'AU'}</div>
              <div className="user-info">
                <div className="user-name">{currentUser?.name || 'Admin User'}</div>
                <div className="user-role">{currentUser?.role || 'Administrator'}</div>
              </div>
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="page-content">
          {children}
        </main>
      </div>

      <style>{`
        /* Sidebar Premium Layout styling */
        .sidebar {
          background: #111827 !important; /* Dark Slate Theme */
          border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
          display: flex !important;
          flex-direction: column !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .sidebar-logo {
          padding: 24px 20px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          background: rgba(255, 255, 255, 0.02) !important;
        }

        .logo-icon {
          width: 38px !important;
          height: 38px !important;
          background: linear-gradient(135deg, #5f3dc4 0%, #0b7285 100%) !important;
          color: white !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 800 !important;
          font-size: 16px !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 10px rgba(95, 61, 196, 0.3) !important;
        }

        .logo-title {
          color: #f3f4f6 !important;
          font-size: 14.5px !important;
          font-weight: 750 !important;
          letter-spacing: 0.3px !important;
        }

        .logo-sub {
          color: #9ca3af !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          letter-spacing: 0.5px !important;
        }

        .sidebar-nav {
          padding: 16px 12px !important;
          gap: 6px !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .nav-section-label {
          padding: 6px 12px !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          color: #4b5563 !important;
          font-weight: 700 !important;
          margin-bottom: 4px !important;
        }

        .nav-item {
          display: flex !important;
          align-items: center !important;
          padding: 10px 14px !important;
          color: #9ca3af !important;
          border-radius: 10px !important;
          font-size: 13.5px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          text-decoration: none !important;
          position: relative !important;
          margin-bottom: 2px !important;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          color: #f3f4f6 !important;
          padding-left: 18px !important; /* Premium slide-in animation */
        }

        .nav-item.active {
          background: linear-gradient(135deg, #5f3dc4 0%, #7048e8 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 14px rgba(95, 61, 196, 0.3) !important;
        }

        .nav-item.active .nav-icon {
          color: #ffffff !important;
        }

        .nav-icon {
          margin-right: 12px !important;
          display: flex !important;
          align-items: center !important;
          color: inherit !important;
          opacity: 0.85 !important;
        }

        .nav-chevron {
          margin-left: auto !important;
          transition: transform 0.2s ease !important;
          opacity: 0.6 !important;
        }

        .nav-item.open .nav-chevron {
          transform: rotate(180deg) !important;
        }

        .nav-submenu {
          margin-top: 2px !important;
          margin-bottom: 6px !important;
          padding-left: 20px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 3px !important;
          border-left: 1px dashed rgba(255, 255, 255, 0.12) !important;
          margin-left: 20px !important;
        }

        .nav-submenu .nav-item {
          padding: 8px 12px !important;
          font-size: 12.5px !important;
          background: transparent !important;
          margin-bottom: 0 !important;
        }

        .nav-submenu .nav-item:hover {
          background: rgba(255, 255, 255, 0.03) !important;
          color: #f3f4f6 !important;
          padding-left: 16px !important;
        }

        .nav-submenu .nav-item.active {
          background: rgba(95, 61, 196, 0.15) !important;
          color: #c084fc !important;
          box-shadow: none !important;
          border: 1px solid rgba(95, 61, 196, 0.3) !important;
        }

        .sidebar-footer {
          margin-top: auto !important;
          padding: 16px 12px !important;
          border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
          background: rgba(255, 255, 255, 0.01) !important;
        }

        .nav-sub-submenu {
          margin-top: 2px !important;
          margin-bottom: 6px !important;
          padding-left: 14px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
          border-left: 1px dashed rgba(255, 255, 255, 0.08) !important;
          margin-left: 14px !important;
        }

        .nav-sub-submenu .nav-item {
          padding: 6px 10px !important;
          font-size: 12px !important;
          background: transparent !important;
          color: #9ca3af !important;
          margin-bottom: 0 !important;
        }

        .nav-sub-submenu .nav-item:hover {
          background: rgba(255, 255, 255, 0.02) !important;
          color: #f3f4f6 !important;
          padding-left: 14px !important;
        }

        .nav-sub-submenu .nav-item.active {
          color: #c084fc !important;
          font-weight: 700 !important;
        }
      `}</style>
    </div>
  );
}