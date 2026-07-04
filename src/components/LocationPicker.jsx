/**
 * LocationPicker – reusable step-by-step and manual location input component.
 *
 * Props:
 *   value     – current location string (e.g. "FLOOR 4 HALL 2 RACK 6 BLOCK A ZONE WEST" or "SHELF-3A")
 *   onChange  – (newValue: string) => void
 *   disabled  – boolean, locks the fields
 */
import React, { useState, useEffect } from 'react';

const STEP_CONFIG = [
  { key: 'floor', label: 'Floor No.', placeholder: 'e.g. 4', icon: '🏢', hint: 'Enter floor number (or skip)' },
  { key: 'hall',  label: 'Hall No.',  placeholder: 'e.g. 2', icon: '🚪', hint: 'Enter hall number (or skip)'  },
  { key: 'rack',  label: 'Rack No.',  placeholder: 'e.g. 6', icon: '📦', hint: 'Enter rack number (or skip)'  },
  { key: 'block', label: 'Block No.', placeholder: 'e.g. A', icon: '🧱', hint: 'Enter block number (or skip)' },
  { key: 'zone',  label: 'Zone',      placeholder: 'e.g. West', icon: '🌐', hint: 'Enter zone name (or skip)' },
];

function parseLocation(str) {
  if (!str) return { floor: '', hall: '', rack: '', block: '', zone: '' };
  const f = str.match(/FLOOR\s+(\S+)/i);
  const h = str.match(/HALL\s+(\S+)/i);
  const r = str.match(/RACK\s+(\S+)/i);
  const b = str.match(/BLOCK\s+(\S+)/i);
  const z = str.match(/ZONE\s+(\S+)/i);
  return {
    floor: f ? f[1] : '',
    hall:  h ? h[1] : '',
    rack:  r ? r[1] : '',
    block: b ? b[1] : '',
    zone:  z ? z[1] : '',
  };
}

function buildLocation({ floor, hall, rack, block, zone }) {
  if (!floor && !hall && !rack && !block && !zone) return '';
  const parts = [];
  if (floor) parts.push(`FLOOR ${floor.toString().trim().toUpperCase()}`);
  if (hall)  parts.push(`HALL ${hall.toString().trim().toUpperCase()}`);
  if (rack)  parts.push(`RACK ${rack.toString().trim().toUpperCase()}`);
  if (block) parts.push(`BLOCK ${block.toString().trim().toUpperCase()}`);
  if (zone)  parts.push(`ZONE ${zone.toString().trim().toUpperCase()}`);
  return parts.join(' ');
}

export default function LocationPicker({ value, onChange, disabled = false }) {
  const parsed = parseLocation(value);
  const [parts, setParts] = useState(parsed);
  
  // Auto-detect if value was typed manually (doesn't conform to floor/hall/rack/block/zone pattern)
  const [isManual, setIsManual] = useState(() => {
    if (!value) return false;
    const rebuilt = buildLocation(parsed);
    return rebuilt.replace(/\s+/g, '') !== value.trim().toUpperCase().replace(/\s+/g, '');
  });

  const [activeStep, setActiveStep] = useState(() => {
    if (!parsed.floor) return 0;
    if (!parsed.hall)  return 1;
    if (!parsed.rack)  return 2;
    if (!parsed.block) return 3;
    if (!parsed.zone)  return 4;
    return 5; // all filled
  });
  const [open, setOpen] = useState(!value); // open by default if no value yet

  // Keep internal state in sync when parent value changes
  useEffect(() => {
    const p = parseLocation(value);
    setParts(p);
    
    // Auto-switch mode on load based on value structure
    if (value) {
      const rebuilt = buildLocation(p);
      const manual = rebuilt.replace(/\s+/g, '') !== value.trim().toUpperCase().replace(/\s+/g, '');
      setIsManual(manual);
    }

    if (!p.floor) setActiveStep(0);
    else if (!p.hall) setActiveStep(1);
    else if (!p.rack) setActiveStep(2);
    else if (!p.block) setActiveStep(3);
    else if (!p.zone) setActiveStep(4);
    else setActiveStep(5);
  }, [value]);

  const handleChange = (key, val) => {
    const updated = { ...parts, [key]: val };
    setParts(updated);
    onChange(buildLocation(updated));
  };

  const handleNext = (currentKey) => {
    const idx = STEP_CONFIG.findIndex(s => s.key === currentKey);
    if (idx < STEP_CONFIG.length - 1) {
      setActiveStep(idx + 1);
    } else {
      setActiveStep(5); // all done
      setOpen(false); // automatically collapse when all steps complete
    }
  };

  const handleKeyDown = (e, key) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext(key);
    }
  };

  const handleClear = () => {
    const reset = { floor: '', hall: '', rack: '', block: '', zone: '' };
    setParts(reset);
    onChange('');
    setActiveStep(0);
    setOpen(true);
  };

  const generated = isManual ? value : buildLocation(parts);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Collapsed view – shows generated value + Edit/Clear buttons */}
      {generated && !open && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 14px',
          background: 'linear-gradient(135deg, var(--primary-light) 0%, rgba(99,102,241,0.08) 100%)',
          border: '1.5px solid var(--primary)',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--primary)',
          letterSpacing: 0.5,
        }}>
          <span style={{ fontSize: 16 }}>📍</span>
          <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{generated}</span>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 7,
                  border: '1px solid var(--primary)',
                  background: 'var(--surface)',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                ✏️ Edit
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: '4px 10px',
                  borderRadius: 7,
                  border: '1px solid #fca5a5',
                  background: 'var(--surface)',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                ✕ Clear
              </button>
            </>
          )}
        </div>
      )}

      {/* Step-by-step / Manual inputs container */}
      {(open || !generated) && (
        <div style={{
          border: '1.5px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>📍</span> SELECT LOCATION
            {generated && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  marginLeft: 'auto',
                  padding: '3px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                ✓ Done
              </button>
            )}
          </div>

          {/* Mode Selector Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)'
          }}>
            <button
              type="button"
              onClick={() => setIsManual(false)}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: !isManual ? 'var(--surface)' : 'transparent',
                color: !isManual ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                borderBottom: !isManual ? '2px solid var(--primary)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              🎯 Step-by-Step Wizard
            </button>
            <button
              type="button"
              onClick={() => setIsManual(true)}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: isManual ? 'var(--surface)' : 'transparent',
                color: isManual ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                borderBottom: isManual ? '2px solid var(--primary)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              ✍️ Write Manually
            </button>
          </div>

          {/* Manual Input Mode */}
          {isManual ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Enter Location Manually <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. SHELF-3A, ZONE-C, BLOCK-Z"
                  value={value || ''}
                  onChange={e => onChange(e.target.value.toUpperCase())}
                  disabled={disabled}
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: 600,
                    border: '1.5px solid var(--primary)',
                    boxShadow: '0 0 0 3px rgba(99,102,241,0.01)',
                    background: 'var(--bg)',
                    color: 'var(--text-primary)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={!value || disabled}
                  style={{
                    padding: '0 16px',
                    borderRadius: 8,
                    background: value ? 'var(--primary)' : 'var(--border)',
                    color: value ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: value && !disabled ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                  }}
                >
                  ✓ Done
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Type the warehouse location code directly and click Done.
              </div>
            </div>
          ) : (
            /* Wizard Mode Steps */
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Progress indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                {STEP_CONFIG.map((step, idx) => (
                  <React.Fragment key={step.key}>
                    <div
                      onClick={() => !disabled && setActiveStep(idx)}
                      style={{
                        width: 26, height: 26, borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800,
                        background: parts[step.key]
                          ? 'var(--primary)'
                          : activeStep === idx
                            ? 'var(--primary-light)'
                            : 'var(--bg)',
                        color: parts[step.key]
                          ? '#fff'
                          : activeStep === idx
                            ? 'var(--primary)'
                            : 'var(--text-muted)',
                        border: activeStep === idx ? '2px solid var(--primary)' : '2px solid transparent',
                        cursor: disabled ? 'default' : 'pointer',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                      }}
                    >
                      {parts[step.key] ? '✓' : idx + 1}
                    </div>
                    {idx < STEP_CONFIG.length - 1 && (
                      <div style={{
                        flex: 1, height: 2,
                        background: parts[STEP_CONFIG[idx].key] ? 'var(--primary)' : 'var(--border)',
                        borderRadius: 1, transition: 'background 0.3s ease',
                      }} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Active step input */}
              {STEP_CONFIG.map((step, idx) => (
                <div
                  key={step.key}
                  style={{
                    display: activeStep === idx ? 'block' : 'none',
                    animation: activeStep === idx ? 'fadeIn 0.2s ease' : 'none',
                  }}
                >
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                  }}>
                    <span>{step.icon}</span>
                    {step.label}
                    {parts[step.key] && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        color: 'var(--primary)',
                        fontWeight: 600,
                        background: 'var(--primary-light)',
                        padding: '1px 7px',
                        borderRadius: 6,
                      }}>
                        {step.label.split(' ')[0]} {parts[step.key]}
                      </span>
                    )}
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      id={`location-${step.key}`}
                      autoFocus={activeStep === idx}
                      type="text"
                      className="form-control"
                      placeholder={step.placeholder}
                      value={parts[step.key] || ''}
                      onChange={e => handleChange(step.key, e.target.value)}
                      onKeyDown={e => handleKeyDown(e, step.key)}
                      disabled={disabled}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: 600,
                        border: '1.5px solid var(--primary)',
                        boxShadow: '0 0 0 3px rgba(99,102,241,0.01)',
                        background: 'var(--bg)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleNext(step.key);
                      }}
                      disabled={disabled}
                      style={{
                        padding: '0 16px',
                        borderRadius: 8,
                        background: parts[step.key] ? 'var(--primary)' : 'var(--border)',
                        color: parts[step.key] ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {parts[step.key]
                        ? (idx < STEP_CONFIG.length - 1 ? 'Next →' : '✓ Done')
                        : (idx < STEP_CONFIG.length - 1 ? 'Skip →' : '✓ Done')}
                    </button>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {step.hint} — press <kbd style={{ fontSize: 10, padding: '1px 4px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg)' }}>Enter</kbd> to continue
                  </div>
                </div>
              ))}

              {/* Summary row when all steps done */}
              {activeStep === STEP_CONFIG.length && generated && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, var(--primary-light) 0%, rgba(99,102,241,0.08) 100%)',
                  border: '1.5px solid var(--primary)',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--primary)',
                }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>Location Set</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{generated}</div>
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => setActiveStep(0)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 7,
                        border: '1px solid var(--primary)',
                        background: 'var(--surface)',
                        color: 'var(--primary)',
                        fontWeight: 700,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
