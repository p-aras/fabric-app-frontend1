import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store.js';
import {
  ShieldCheck, Zap, Layers, BarChart3, ArrowRight,
  Printer, Droplets, Ruler, Warehouse, PackageMinus,
  Sparkles, CheckCircle2
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [counts, setCounts] = useState({
    materials: 0,
    rooms: 0,
    racks: 0,
    shelves: 0
  });

  useEffect(() => {
    const user = localStorage.getItem('twms_user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }

    // Load dynamic counts for the metrics section
    Promise.all([
      store.getMaterials(),
      store.getRooms(),
      store.getRacks(),
      store.getShelves()
    ]).then(([mats, rms, rks, shvs]) => {
      setCounts({
        materials: mats?.length || 0,
        rooms: rms?.length || 0,
        racks: rks?.length || 0,
        shelves: shvs?.length || 0
      });
    }).catch(console.error);
  }, []);

  return (
    <div className="homepage-wrapper">
      {/* 1. Hero banner section */}
      <div className="home-hero">
        <div className="hero-overlay-graphic"></div>
        <div className="hero-content-block">
          <div className="welcome-tag">
            <Sparkles size={14} className="sparkle-icon" />
            <span>Smart Warehouse Hub</span>
          </div>
          <h1>
            Well-Maintained <br />
            <span className="gradient-text">Fabric Inventory System</span>
          </h1>
          <p>
            Welcome back, <strong>{currentUser?.name || 'Administrator'}</strong>.
            Keep your warehouse layout organized, monitor rolls, print barcode stickers, and track fabric allocation in real time.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/materials')}>
              Explore Inventory <ArrowRight size={16} />
            </button>
            <button className="btn btn-ghost btn-lg" style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => navigate('/warehouse')}>
              Warehouse Layout
            </button>
          </div>
        </div>
      </div>

      {/* 2. Visual Metric summary grid */}
      {/* <div className="stats-showcase">
        <div className="stat-pill-card">
          <div className="pill-icon blue"><Layers size={20} /></div>
          <div className="pill-info">
            <div className="label">Total Stock Items</div>
            <div className="val">{counts.materials} Rolls / Mtrs</div>
          </div>
        </div>
        <div className="stat-pill-card">
          <div className="pill-icon green"><Warehouse size={20} /></div>
          <div className="pill-info">
            <div className="label">Managed Rooms</div>
            <div className="val">{counts.rooms} Active Rooms</div>
          </div>
        </div>
        <div className="stat-pill-card">
          <div className="pill-icon purple"><Zap size={20} /></div>
          <div className="pill-info">
            <div className="label">Storage Locations</div>
            <div className="val">{counts.shelves} Shelves / Areas</div>
          </div>
        </div>
      </div> */}

      <div className="home-grid">
        {/* Left Column: Benefits & Features list */}
        <div className="benefits-section">
          <h2>Key Benefits of Managing Fabric Inventory</h2>
          <p className="section-desc">
            Organizing your textile rolls systematically reduces layout confusion, minimizes fabric wastage, and optimizes cutting operations.
          </p>

          <div className="benefit-card-list">
            <div className="benefit-card">
              <div className="benefit-icon"><ShieldCheck size={22} /></div>
              <div className="benefit-details">
                <h3>Eliminate Duplicate Issuance & Losses</h3>
                <p>
                  Every fabric roll receives a unique barcode. Scanning validates status instantly, preventing double-booking and tracking exact balances in real time.
                </p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon"><Warehouse size={22} /></div>
              <div className="benefit-details">
                <h3>Structured Warehouse Mapping</h3>
                <p>
                  Model your physical layout with rooms, racks, and shelves. Assign locations programmatically to maintain structured shelf organization.
                </p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon"><Layers size={22} /></div>
              <div className="benefit-details">
                <h3>Stock Bifurcation & Categorization</h3>
                <p>
                  Classify materials seamlessly by Normal Inventory (rolls), Fabric Stock (meters), or Dyeing Materials to export accurate filtered reports.
                </p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon"><BarChart3 size={22} /></div>
              <div className="benefit-details">
                <h3>Live Cutting & Production Status</h3>
                <p>
                  Keep production teams informed about lot progress, shades, and cutting status parameters, matching inventory directly with challans.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Showcase of Well-Maintained Fabric Layout */}
        <div className="visual-showcase-section">
          <div className="showcase-card">
            <div className="showcase-header">
              <h3>Well-Maintained Layout Simulator</h3>
              <span className="badge badge-success">Optimized</span>
            </div>

            <div className="warehouse-layout-preview">
              <div className="preview-shelf-row">
                <div className="shelf-label">Rack A - Shelf 01</div>
                <div className="rolls-row">
                  <div className="fabric-roll-pill color-navy" title="Navy - 23.4 Kg"><span>Navy</span></div>
                  <div className="fabric-roll-pill color-rust" title="Rust - 24.1 Kg"><span>Rust</span></div>
                  <div className="fabric-roll-pill color-black" title="Black - 21.0 Kg"><span>Black</span></div>
                </div>
              </div>

              <div className="preview-shelf-row">
                <div className="shelf-label">Rack A - Shelf 02</div>
                <div className="rolls-row">
                  <div className="fabric-roll-pill color-mustard" title="Mustard - 25.6 Kg"><span>Mustard</span></div>
                  <div className="fabric-roll-pill color-empty"><span>Empty Spot</span></div>
                  <div className="fabric-roll-pill color-empty"><span>Empty Spot</span></div>
                </div>
              </div>

              <div className="preview-shelf-row">
                <div className="shelf-label">Rack B - Shelf 01</div>
                <div className="rolls-row">
                  <div className="fabric-roll-pill color-mint" title="Mint - 22.8 Kg"><span>Mint</span></div>
                  <div className="fabric-roll-pill color-mint" title="Mint - 23.0 Kg"><span>Mint</span></div>
                  <div className="fabric-roll-pill color-navy" title="Navy - 21.5 Kg"><span>Navy</span></div>
                </div>
              </div>
            </div>

            <div className="showcase-footer">
              <div className="footer-legend">
                <div className="legend-item"><CheckCircle2 size={12} className="check-icon" /> Space Capacity Calculated</div>
                <div className="legend-item"><CheckCircle2 size={12} className="check-icon" /> Zero Location Conflicts</div>
              </div>
              <p>
                Colors are grouped, shelf capacity checks are performed programmatically, and location logs are automatically updated.
              </p>
            </div>
          </div>

          {/* Quick links block */}
          <div className="quick-links-card">
            <h3>Quick Access Actions</h3>
            <div className="quick-links-grid">
              <button onClick={() => navigate('/fabric-sticker')} className="quick-link-btn">
                <Printer size={16} /> Print Barcode
              </button>
              <button onClick={() => navigate('/dyeing-material')} className="quick-link-btn">
                <Droplets size={16} /> Dyeing Entry
              </button>
              <button onClick={() => navigate('/fabric-stock')} className="quick-link-btn">
                <Ruler size={16} /> Fabric Stock
              </button>
              <button onClick={() => navigate('/issue')} className="quick-link-btn">
                <PackageMinus size={16} /> Issue Material
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Styling for Premium Aesthetics */}
      <style>{`
        .homepage-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: pageFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* 1. Hero styles */
        .home-hero {
          position: relative;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #5f3dc4 100%);
          border-radius: 16px;
          padding: 48px 40px;
          color: white;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .hero-overlay-graphic {
          position: absolute;
          top: -20%;
          right: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .hero-content-block {
          position: relative;
          z-index: 2;
          max-width: 650px;
        }

        .welcome-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 18px;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }

        .sparkle-icon {
          color: #f59e0b;
        }

        .home-hero h1 {
          font-size: 38px;
          line-height: 1.2;
          font-weight: 800;
          margin: 0 0 16px 0;
          letter-spacing: -0.8px;
        }

        .gradient-text {
          background: linear-gradient(to right, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .home-hero p {
          font-size: 15px;
          line-height: 1.6;
          opacity: 0.88;
          margin: 0 0 28px 0;
        }

        .hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* 2. Stats Showcase pills */
        .stats-showcase {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 18px;
        }

        .stat-pill-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-pill-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .pill-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pill-icon.blue { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
        .pill-icon.green { background: rgba(16, 185, 129, 0.1); color: #059669; }
        .pill-icon.purple { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }

        .pill-info {
          display: flex;
          flex-direction: column;
        }

        .pill-info .label {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pill-info .val {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 2px;
        }

        /* 3. Main grid Layout */
        .home-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
        }

        @media (max-width: 968px) {
          .home-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Left Column: Benefits */
        .benefits-section h2 {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }

        .section-desc {
          font-size: 14px;
          color: var(--text-secondary);
          margin-0 0 24px 0;
          line-height: 1.5;
        }

        .benefit-card-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        }

        .benefit-card {
          display: flex;
          gap: 18px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 18px;
          transition: border-color 0.2s ease;
        }

        .benefit-card:hover {
          border-color: rgba(95, 61, 196, 0.35);
        }

        .benefit-icon {
          color: #7c3aed;
          background: rgba(139, 92, 246, 0.08);
          width: 42px;
          height: 42px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .benefit-details h3 {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 6px 0;
        }

        .benefit-details p {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-secondary);
          margin: 0;
        }

        /* Right Column: Visual Layout Simulator */
        .showcase-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          box-shadow: var(--shadow-sm);
        }

        .showcase-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .showcase-header h3 {
          font-size: 15px;
          font-weight: 750;
          color: var(--text-primary);
          margin: 0;
        }

        .warehouse-layout-preview {
          background: var(--bg-hover);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border: 1.5px dashed var(--border);
        }

        .preview-shelf-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .shelf-label {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-secondary);
          letter-spacing: 0.3px;
        }

        .rolls-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .fabric-roll-pill {
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.06);
          min-width: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .color-navy { background: #1e3a8a; color: white; }
        .color-rust { background: #c2410c; color: white; }
        .color-black { background: #0f172a; color: white; }
        .color-mustard { background: #ca8a04; color: white; }
        .color-mint { background: #059669; color: white; }
        .color-empty { 
          background: transparent; 
          color: var(--text-muted); 
          border: 1.5px dashed var(--border);
          box-shadow: none;
        }

        .showcase-footer {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }

        .footer-legend {
          display: flex;
          gap: 16px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .check-icon {
          color: #10b981;
        }

        .showcase-footer p {
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-muted);
          margin: 0;
        }

        /* Quick Access links */
        .quick-links-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          margin-top: 20px;
          box-shadow: var(--shadow-sm);
        }

        .quick-links-card h3 {
          font-size: 14.5px;
          font-weight: 750;
          color: var(--text-primary);
          margin: 0 0 14px 0;
        }

        .quick-links-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .quick-link-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--bg-hover);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .quick-link-btn:hover {
          background: rgba(95, 61, 196, 0.05);
          border-color: rgba(95, 61, 196, 0.3);
          color: #7c3aed;
        }
      `}</style>
    </div>
  );
}
