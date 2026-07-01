/**
 * LocationPicker – reusable step-by-step component
 *
 * Props:
 *   value     – current location string (e.g. "FLOOR 4 HALL 2 RACK 6")
 *   onChange  – (newValue: string) => void
 *   disabled  – boolean, locks the fields
 */
import React, { useState, useEffect } from 'react';

const STEP_CONFIG = [
  { key: 'floor', label: 'Floor No.', placeholder: 'e.g. 4', icon: '🏢', hint: 'Enter the floor number' },
  { key: 'hall',  label: 'Hall No.',  placeholder: 'e.g. 2', icon: '🚪', hint: 'Enter the hall number'  },
  { key: 'rack',  label: 'Rack No.',  placeholder: 'e.g. 6', icon: '📦', hint: 'Enter the rack number'  },
];

function parseLocation(str) {
  if (!str) return { floor: '', hall: '', rack: '' };
  const f = str.match(/FLOOR\s+(\S+)/i);
  const h = str.match(/HALL\s+(\S+)/i);
  const r = str.match(/RACK\s+(\S+)/i);
  return {
    floor: f ? f[1] : '',
    hall:  h ? h[1] : '',
    rack:  r ? r[1] : '',
  };
}

function buildLocation({ floor, hall, rack }) {
  if (!floor && !hall && !rack) return '';
  const parts = [];
  if (floor) parts.push(`FLOOR ${floor.toString().trim().toUpperCase()}`);
  if (hall)  parts.push(`HALL ${hall.toString().trim().toUpperCase()}`);
  if (rack)  parts.push(`RACK ${rack.toString().trim().toUpperCase()}`);
  return parts.join(' ');
}

export default function LocationPicker({ value, onChange, disabled = false }) {
  const parsed = parseLocation(value);
  const [parts, setParts] = useState(parsed);
  const [activeStep, setActiveStep] = useState(() => {
    if (!parsed.floor) return 0;
    if (!parsed.hall)  return 1;
    if (!parsed.rack)  return 2;
    return 3; // all filled
  });
  const [open, setOpen] = useState(!value); // open by default if no value yet

  // Keep internal state in sync when parent value changes
  useEffect(() => {
    const p = parseLocation(value);
    setParts(p);
    if (!p.floor) setActiveStep(0);
    else if (!p.hall) setActiveStep(1);
    else if (!p.rack) setActiveStep(2);
    else setActiveStep(3);
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
      setActiveStep(3); // all done
    }
  };

  const handleKeyDown = (e, key) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext(key);
    }
  };

  const handleClear = () => {
    const reset = { floor: '', hall: '', rack: '' };
    setParts(reset);
    onChange('');
    setActiveStep(0);
    setOpen(true);
  };

  const generated = buildLocation(parts);
  const isComplete = parts.floor && parts.hall && parts.rack;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Collapsed pill – shows generated value + Edit/Clear buttons */}
      {generated && !open && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px',
          background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
          border: '1.5px solid #6366f1',
          borderRadius: 10,
          fontSize: 13, fontWeight: 700,
          color: '#3730a3',
          letterSpacing: 0.5,
        }}>
          <span style={{ fontSize: 16 }}>📍</span>
          <span style={{ flex: 1 }}>{generated}</span>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                  padding: '4px 10px', borderRadius: 7, border: '1px solid #6366f1',
                  background: '#fff', color: '#4f46e5', fontWeight: 700,
                  fontSize: 11, cursor: 'pointer',
                }}
              >✏️ Edit</button>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: '4px 10px', borderRadius: 7, border: '1px solid #fca5a5',
                  background: '#fff', color: '#dc2626', fontWeight: 700,
                  fontSize: 11, cursor: 'pointer',
                }}
              >✕ Clear</button>
            </>
          )}
        </div>
      )}

      {/* Step-by-step inputs */}
      {(open || !generated) && (
        <div style={{
          border: '1.5px solid #c7d2fe',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#f8faff',
          boxShadow: '0 2px 12px rgba(99,102,241,0.08)',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#fff',
            fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>📍</span> SELECT LOCATION
            {generated && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  marginLeft: 'auto', padding: '2px 10px', borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)',
                  color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer',
                }}
              >✓ Done</button>
            )}
          </div>

          {/* Steps */}
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
                        ? '#4f46e5'
                        : activeStep === idx
                          ? '#e0e7ff'
                          : '#f1f5f9',
                      color: parts[step.key]
                        ? '#fff'
                        : activeStep === idx
                          ? '#4f46e5'
                          : '#94a3b8',
                      border: activeStep === idx ? '2px solid #4f46e5' : '2px solid transparent',
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
                      background: parts[STEP_CONFIG[idx].key] ? '#4f46e5' : '#e2e8f0',
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
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6,
                }}>
                  <span>{step.icon}</span>
                  {step.label} <span style={{ color: '#ef4444' }}>*</span>
                  {parts[step.key] && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, color: '#4f46e5',
                      fontWeight: 600, background: '#eef2ff',
                      padding: '1px 7px', borderRadius: 6,
                    }}>{step.label.split(' ')[0]} {parts[step.key]}</span>
                  )}
                </label>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id={`location-${step.key}`}
                    autoFocus
                    type="text"
                    className="form-control"
                    placeholder={step.placeholder}
                    value={parts[step.key]}
                    onChange={e => handleChange(step.key, e.target.value)}
                    onKeyDown={e => handleKeyDown(e, step.key)}
                    disabled={disabled}
                    style={{
                      flex: 1, fontSize: 15, fontWeight: 600,
                      border: '1.5px solid #6366f1',
                      boxShadow: '0 0 0 3px rgba(99,102,241,0.1)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (parts[step.key]) handleNext(step.key);
                    }}
                    disabled={!parts[step.key] || disabled}
                    style={{
                      padding: '0 16px', borderRadius: 8,
                      background: parts[step.key] ? '#4f46e5' : '#e2e8f0',
                      color: parts[step.key] ? '#fff' : '#94a3b8',
                      border: 'none', fontWeight: 700, fontSize: 13,
                      cursor: parts[step.key] && !disabled ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {idx < STEP_CONFIG.length - 1 ? 'Next →' : isComplete ? '✓ Done' : 'Set'}
                  </button>
                </div>

                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  {step.hint} — press <kbd style={{ fontSize: 10, padding: '1px 4px', border: '1px solid #d1d5db', borderRadius: 3, background: '#f9fafb' }}>Enter</kbd> to continue
                </div>
              </div>
            ))}

            {/* Summary row when all steps done */}
            {activeStep === 3 && generated && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid #86efac',
                borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#166534',
              }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <div style={{ flex: 1 }}>
                  <div>Location Set</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#14532d' }}>{generated}</div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(0)}
                    style={{
                      padding: '5px 12px', borderRadius: 7, border: '1px solid #86efac',
                      background: '#fff', color: '#166534', fontWeight: 700,
                      fontSize: 11, cursor: 'pointer',
                    }}
                  >✏️ Edit</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
