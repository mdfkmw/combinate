import React, { useEffect, useMemo, useState } from 'react';

const DEFAULTS = {
  blockPastReservations: true,
  publicMinNoticeMinutes: 0,
  publicMaxDaysAhead: 0,
};

function minutesToLabel(value) {
  const minutes = Number(value) || 0;
  if (minutes <= 0) return 'Imediat';
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? 'oră' : 'ore'}`;
  }
  return `${minutes} minute`;
}

export default function AdminOnlineSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initialValues, setInitialValues] = useState(DEFAULTS);
  const [form, setForm] = useState(DEFAULTS);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch('/api/online-settings', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Nu am putut încărca setările.');
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const normalized = {
          blockPastReservations: !!data?.blockPastReservations,
          publicMinNoticeMinutes: Number(data?.publicMinNoticeMinutes) || 0,
          publicMaxDaysAhead: Number(data?.publicMaxDaysAhead) || 0,
        };
        setInitialValues(normalized);
        setForm(normalized);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Nu am putut încărca setările.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isDirty = useMemo(() => {
    return (
      form.blockPastReservations !== initialValues.blockPastReservations ||
      form.publicMinNoticeMinutes !== initialValues.publicMinNoticeMinutes ||
      form.publicMaxDaysAhead !== initialValues.publicMaxDaysAhead
    );
  }, [form, initialValues]);

  const handleToggle = (event) => {
    setForm((prev) => ({
      ...prev,
      blockPastReservations: event.target.checked,
    }));
  };

  const handleNumberChange = (key) => (event) => {
    const value = Number(event.target.value);
    setForm((prev) => ({
      ...prev,
      [key]: Number.isFinite(value) ? Math.max(0, value) : 0,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/online-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Nu am putut salva setările.');
      }
      const data = await res.json().catch(() => null);
      const settings = data?.settings || form;
      const normalized = {
        blockPastReservations: !!settings.blockPastReservations,
        publicMinNoticeMinutes: Number(settings.publicMinNoticeMinutes) || 0,
        publicMaxDaysAhead: Number(settings.publicMaxDaysAhead) || 0,
      };
      setInitialValues(normalized);
      setForm(normalized);
      setSuccess('Setările au fost salvate.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Nu am putut salva setările.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">Setări rezervări online</h2>
      {loading && <div>Se încarcă setările…</div>}
      {!loading && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-start gap-3">
            <input
              id="blockPastReservations"
              type="checkbox"
              className="mt-1"
              checked={form.blockPastReservations}
              onChange={handleToggle}
            />
            <label htmlFor="blockPastReservations" className="flex-1">
              <span className="font-medium">Blochează rezervările pentru curse din trecut</span>
              <p className="text-sm text-gray-600">
                Atunci când este activă, curselor care au plecat deja nu li se mai pot adăuga rezervări noi din aplicația internă sau din site-ul public.
              </p>
            </label>
          </div>

          <div>
            <label htmlFor="publicMinNoticeMinutes" className="block font-medium">
              Închide rezervările online înainte de plecare
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Specifică numărul de minute înainte de plecare după care rezervările online nu mai sunt permise. Valoarea 0 înseamnă că se pot face rezervări până la plecare.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="publicMinNoticeMinutes"
                type="number"
                min={0}
                max={20160}
                value={form.publicMinNoticeMinutes}
                onChange={handleNumberChange('publicMinNoticeMinutes')}
                className="w-32 rounded border border-gray-300 px-2 py-1"
              />
              <span className="text-sm text-gray-500">{minutesToLabel(form.publicMinNoticeMinutes)}</span>
            </div>
          </div>

          <div>
            <label htmlFor="publicMaxDaysAhead" className="block font-medium">
              Permite rezervări online cu cel mult … zile în avans
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Setează 0 pentru a permite rezervări pentru orice dată disponibilă.
            </p>
            <input
              id="publicMaxDaysAhead"
              type="number"
              min={0}
              max={365}
              value={form.publicMaxDaysAhead}
              onChange={handleNumberChange('publicMaxDaysAhead')}
              className="w-32 rounded border border-gray-300 px-2 py-1"
            />
          </div>

          {error && <div className="text-red-600">{error}</div>}
          {success && <div className="text-green-600">{success}</div>}

          <button
            type="submit"
            disabled={saving || !isDirty}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Se salvează…' : 'Salvează setările'}
          </button>
        </form>
      )}
    </div>
  );
}
