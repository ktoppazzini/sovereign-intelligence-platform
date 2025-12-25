'use client';
import { useState, useEffect } from 'react';
import { getUiTranslations } from '../lib/i18nClient';

/**
 * ScheduledReports Component
 * Allows users to schedule recurring report generation and delivery
 * Supports 207 languages via dynamic translation
 */

const BASE_UI = {
  scheduledReports: 'Scheduled Reports',
  createSchedule: 'Create Schedule',
  scheduleName: 'Schedule Name',
  frequency: 'Frequency',
  dayOfWeek: 'Day of Week',
  dayOfMonth: 'Day of Month',
  time: 'Time',
  recipients: 'Recipients',
  autoGenerate: 'Auto-generate report',
  enabled: 'Enabled',
  disabled: 'Disabled',
  nextRun: 'Next Run',
  lastRun: 'Last Run',
  never: 'Never',
  delete: 'Delete',
  create: 'Create',
  cancel: 'Cancel',
  noSchedules: 'No scheduled reports yet',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Pashto', 'Sindhi'];

export default function ScheduledReports({ verticalId, currentConfig, color = '#3b82f6', lang = 'English' }) {
  const [ui, setUi] = useState(BASE_UI);
  const [isOpen, setIsOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const isRTL = RTL_LANGUAGES.includes(lang);

  // Load translations
  useEffect(() => {
    (async () => {
      try {
        const { t } = await getUiTranslations({
          base: BASE_UI,
          lang,
          cachePrefix: 'SI_ScheduledReports',
          setDir: false,
        });
        setUi(t || BASE_UI);
      } catch (err) {
        console.warn('ScheduledReports translation failed:', err);
      }
    })();
  }, [lang]);

  // New schedule form
  const [scheduleName, setScheduleName] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('monday');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [time, setTime] = useState('09:00');
  const [recipients, setRecipients] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadSchedules();
    }
  }, [isOpen]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/schedules?verticalId=${verticalId}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!scheduleName.trim()) return;

    const schedule = {
      id: `sched_${Date.now()}`,
      name: scheduleName,
      verticalId,
      frequency,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
      time,
      recipients: recipients.split(',').map(e => e.trim()).filter(Boolean),
      autoGenerate,
      config: currentConfig,
      enabled: true,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: calculateNextRun(frequency, dayOfWeek, dayOfMonth, time),
    };

    try {
      const res = await fetch('/api/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });

      if (res.ok) {
        setSchedules(prev => [...prev, schedule]);
        setShowCreate(false);
        resetForm();
      }
    } catch (err) {
      console.error('Failed to create schedule:', err);
    }
  };

  const handleDelete = async (scheduleId) => {
    try {
      await fetch(`/api/reports/schedules?id=${scheduleId}`, { method: 'DELETE' });
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

  const handleToggle = async (scheduleId) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const updated = { ...schedule, enabled: !schedule.enabled };
    try {
      await fetch('/api/reports/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setSchedules(prev => prev.map(s => s.id === scheduleId ? updated : s));
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  };

  const resetForm = () => {
    setScheduleName('');
    setFrequency('weekly');
    setDayOfWeek('monday');
    setDayOfMonth('1');
    setTime('09:00');
    setRecipients('');
    setAutoGenerate(true);
  };

  const frequencyOptions = [
    { value: 'daily', label: ui.daily },
    { value: 'weekly', label: ui.weekly },
    { value: 'biweekly', label: ui.biweekly },
    { value: 'monthly', label: ui.monthly },
    { value: 'quarterly', label: ui.quarterly },
  ];

  const daysOfWeek = [
    { value: 'monday', label: ui.monday },
    { value: 'tuesday', label: ui.tuesday },
    { value: 'wednesday', label: ui.wednesday },
    { value: 'thursday', label: ui.thursday },
    { value: 'friday', label: ui.friday },
    { value: 'saturday', label: ui.saturday },
    { value: 'sunday', label: ui.sunday },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 500,
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
        ⏰ {ui.scheduledReports}
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 20,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a2942 0%, #0d1a2d 100%)',
        borderRadius: 16,
        padding: 32,
        maxWidth: 600,
        width: '100%',
        border: `1px solid ${color}30`,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            ⏰ Scheduled Reports
          </h2>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        {showCreate ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
                Schedule Name *
              </label>
              <input
                type="text"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="e.g., Weekly Executive Report"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14 }}
                >
                  {frequencyOptions.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e' }}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {frequency === 'weekly' && (
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Day of Week
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14 }}
                  >
                    {daysOfWeek.map(day => (
                      <option key={day.value} value={day.value} style={{ background: '#1a1a2e' }}>{day.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {frequency === 'monthly' && (
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Day of Month
                  </label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14 }}
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d} style={{ background: '#1a1a2e' }}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
                Email Recipients (comma-separated)
              </label>
              <input
                type="text"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="email@example.com, another@example.com"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14 }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.8)', fontSize: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: color }}
              />
              Auto-generate fresh report each time
            </label>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{ flex: 1, padding: '12px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!scheduleName.trim()}
                style={{ flex: 1, padding: '12px 20px', borderRadius: 8, background: scheduleName.trim() ? color : 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: scheduleName.trim() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600 }}
              >
                Create Schedule
              </button>
            </div>
          </div>
        ) : (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.6)' }}>
                Loading schedules...
              </div>
            ) : schedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>No scheduled reports yet</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                {schedules.map(schedule => (
                  <div
                    key={schedule.id}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: 12,
                      padding: 16,
                      border: `1px solid ${schedule.enabled ? color + '30' : 'rgba(255,255,255,0.1)'}`,
                      opacity: schedule.enabled ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{schedule.name}</div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
                          {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} at {schedule.time}
                          {schedule.dayOfWeek && ` on ${schedule.dayOfWeek}`}
                          {schedule.dayOfMonth && ` on day ${schedule.dayOfMonth}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleToggle(schedule.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            background: schedule.enabled ? `${color}20` : 'rgba(255,255,255,0.1)',
                            border: `1px solid ${schedule.enabled ? color + '40' : 'rgba(255,255,255,0.2)'}`,
                            color: schedule.enabled ? color : 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          {schedule.enabled ? '✓ Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {schedule.recipients?.length > 0 && (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>
                        📧 {schedule.recipients.join(', ')}
                      </div>
                    )}
                    {schedule.nextRun && (
                      <div style={{ color: color, fontSize: 12, marginTop: 8 }}>
                        Next: {new Date(schedule.nextRun).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowCreate(true)}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 10,
                background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              ➕ Create New Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateNextRun(frequency, dayOfWeek, dayOfMonth, time) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  let next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  if (frequency === 'weekly') {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayOfWeek);
    while (next.getDay() !== targetDay) {
      next.setDate(next.getDate() + 1);
    }
  }

  if (frequency === 'monthly') {
    next.setDate(parseInt(dayOfMonth));
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next.toISOString();
}
