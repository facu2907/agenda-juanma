import React, { useMemo, useState } from "react";
import "./index.css";

// Config
const TIMEZONE = "America/Montevideo";
const SLOT_MINUTES = 30;

// Horarios por día
// sunday = 0 ... saturday = 6 (según Date.getDay() en zona local)
const SCHEDULE = {
  1: { start: "09:30", end: "19:00" }, // lunes
  2: { start: "09:30", end: "19:00" }, // martes
  3: { start: "09:30", end: "19:00" }, // miércoles
  4: { start: "09:30", end: "19:00" }, // jueves
  5: { start: "09:30", end: "19:00" }, // viernes
  6: { start: "09:00", end: "14:00" }, // sábado
  0: null,                              // domingo cerrado
};

const SERVICES = [
  { id: "corte", label: "Corte de cabello", minutes: 30 },
  { id: "barba", label: "Arreglo de barba", minutes: 20 },
  { id: "combo", label: "Corte + Barba", minutes: 50 },
];

// Solo un barbero
const BARBER_ID = "juanma";
const BARBER_LABEL = "Juanma";

// Utils
function toLocalISODate(d = new Date()) {
  const tzDate = new Date(d.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const y = tzDate.getFullYear();
  const m = String(tzDate.getMonth() + 1).padStart(2, "0");
  const day = String(tzDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtTime(dateUTC) {
  return dateUTC.toLocaleTimeString([], {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function localMidnight(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  // construimos una fecha a medianoche local de TIMEZONE en UTC
  const local = new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T00:00:00`);
  // compensamos usando toLocaleString para la zona objetivo
  const tz = new Date(local.toLocaleString("en-US", { timeZone: TIMEZONE }));
  return tz;
}

function* slotIteratorBySchedule(dateStr) {
  const baseLocal = localMidnight(dateStr);
  const dow = baseLocal.getDay(); // 0=domingo ... 6=sábado en zona local
  const rule = SCHEDULE[dow];
  if (!rule) return; // cerrado

  const [sh, sm] = rule.start.split(":").map(Number);
  const [eh, em] = rule.end.split(":").map(Number);

  // Creamos fechas en local TZ y luego usamos su valor en UTC para iterar
  const startLocal = new Date(baseLocal);
  startLocal.setHours(sh, sm, 0, 0);
  const endLocal = new Date(baseLocal);
  endLocal.setHours(eh, em, 0, 0);

  for (let t = new Date(startLocal); t < endLocal; t = new Date(t.getTime() + SLOT_MINUTES * 60000)) {
    // t está en hora local; para formatear correctamente usamos fmtTime (con TZ)
    yield t;
  }
}

// mock reservas existentes (si luego guardás en una DB, reemplazás esto)
const mockExisting = {};
function getKey(dateStr, barberId) {
  return `${dateStr}:${barberId}`;
}
function isSlotTaken(dateStr, barberId, slotUTC) {
  const key = getKey(dateStr, barberId);
  const arr = mockExisting[key] || [];
  const timeStr = fmtTime(slotUTC);
  return arr.includes(timeStr);
}

export default function App() {
  const [date, setDate] = useState(toLocalISODate());
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const slots = useMemo(() => Array.from(slotIteratorBySchedule(date)), [date]);
  const availableSlots = useMemo(
    () => slots.filter((s) => !isSlotTaken(date, BARBER_ID, s)),
    [slots, date]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSlot) return;
    if (!name || !phone) {
      setResult({ ok: false, message: "Completá nombre y teléfono." });
      return;
    }

    setSending(true);
    setResult(null);

    const payload = {
      date,
      time: fmtTime(selectedSlot),
      barberId: BARBER_ID,
      serviceId,
      name,
      phone,
      notes,
      tz: TIMEZONE,
    };

    // Simular reserva OK (acá iría tu fetch a /api/book)
    await new Promise((r) => setTimeout(r, 600));
    setResult({
      ok: true,
      message: `✅ Reservado ${payload.date} ${payload.time} con ${BARBER_LABEL} — ${payload.name}`,
    });
    setSelectedSlot(null);
    setNotes("");
    setSending(false);
  }

  // detectamos si el día es cerrado
  const isClosed = (() => {
    const d = localMidnight(date).getDay();
    return !SCHEDULE[d];
  })();

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>💈 Agenda Online — {BARBER_LABEL}</h1>
      <p style={{ marginBottom: 16 }}>Lun–Vie 09:30–19:00 · Sáb 09:30–14:00 · Dom cerrado</p>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <label>📅 Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", marginBottom: 10, padding: 8 }}
          />

          <label>✂️ Servicio</label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            style={{ width: "100%", marginBottom: 10, padding: 8 }}
          >
            {SERVICES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <form onSubmit={handleSubmit}>
            <label>🧑 Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", marginBottom: 10, padding: 8 }}
            />

            <label>📞 Teléfono</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: "100%", marginBottom: 10, padding: 8 }}
            />

            <label>📝 Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", marginBottom: 10, padding: 8 }}
            />

            <button
              type="submit"
              disabled={!selectedSlot || sending || isClosed}
              style={{
                width: "100%",
                padding: 10,
                background: isClosed ? "#888" : "#222",
                color: "#fff",
                cursor: isClosed ? "not-allowed" : "pointer",
              }}
            >
              {isClosed ? "Cerrado" : sending ? "Reservando..." : selectedSlot ? "Confirmar turno" : "Elegí un horario"}
            </button>

            {result && (
              <p style={{ marginTop: 10, color: result.ok ? "green" : "red" }}>
                {result.message}
              </p>
            )}
          </form>
        </div>

        <div style={{ flex: 1 }}>
          <h3>⏰ Horarios disponibles</h3>
          {isClosed ? (
            <p style={{ color: "#b00" }}>Este día está cerrado.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {availableSlots.length === 0 && <p>No hay turnos disponibles.</p>}
              {availableSlots.map((slot) => {
                const time = fmtTime(slot);
                const active = selectedSlot && fmtTime(selectedSlot) === time;
                return (
                  <button
                    key={slot.toISOString()}
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      padding: 10,
                      background: active ? "#444" : "#ddd",
                      color: active ? "#fff" : "#000",
                    }}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
