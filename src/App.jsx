import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

/* ===================== Config ===================== */
const TIMEZONE = "America/Montevideo";
const SLOT_MINUTES = 30;

// 0=domingo ... 6=sábado
const SCHEDULE = {
  1: { start: "09:30", end: "19:00" }, // lunes
  2: { start: "09:30", end: "19:00" }, // martes
  3: { start: "09:30", end: "19:00" }, // miércoles
  4: { start: "09:30", end: "19:00" }, // jueves
  5: { start: "09:30", end: "19:00" }, // viernes
  6: { start: "09:00", end: "14:00" }, // sábado (si querés 09:30 cambiá a "09:30")
  0: null, // domingo cerrado
};

const SERVICES = [
  { id: "corte", label: "Corte de cabello", minutes: 30 },
  { id: "barba", label: "Arreglo de barba", minutes: 20 },
  { id: "combo", label: "Corte + Barba", minutes: 50 },
];

const BARBER_ID = "juanma";
const BARBER_LABEL = "Juanma";

/* ===================== Utils ===================== */
function toLocalISODate(d = new Date()) {
  const tzDate = new Date(d.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const y = tzDate.getFullYear();
  const m = String(tzDate.getMonth() + 1).padStart(2, "0");
  const day = String(tzDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtTime(dateObj) {
  return dateObj.toLocaleTimeString([], {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "HH:MM" en 24h
function toHHMM(dateObj) {
  const tz = new Date(dateObj.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const hh = String(tz.getHours()).padStart(2, "0");
  const mm = String(tz.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function localMidnight(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00`
  );
  // “local” en TZ objetivo
  return new Date(local.toLocaleString("en-US", { timeZone: TIMEZONE }));
}

function* slotIteratorBySchedule(dateStr) {
  const baseLocal = localMidnight(dateStr);
  const dow = baseLocal.getDay(); // 0=dom ... 6=sáb
  const rule = SCHEDULE[dow];
  if (!rule) return; // cerrado

  const [sh, sm] = rule.start.split(":").map(Number);
  const [eh, em] = rule.end.split(":").map(Number);

  const startLocal = new Date(baseLocal);
  startLocal.setHours(sh, sm, 0, 0);
  const endLocal = new Date(baseLocal);
  endLocal.setHours(eh, em, 0, 0);

  for (
    let t = new Date(startLocal);
    t < endLocal;
    t = new Date(t.getTime() + SLOT_MINUTES * 60000)
  ) {
    yield t;
  }
}

/* ===================== App ===================== */
export default function App() {
  const [date, setDate] = useState(toLocalISODate());
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null); // Date
  const [selectedTime24, setSelectedTime24] = useState(""); // "HH:MM"
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // turnos ocupados del día (por backend)
  const [takenTimes, setTakenTimes] = useState([]); // ["09:30", "10:00", ...]

  // slots teóricos del día
  const slots = useMemo(() => Array.from(slotIteratorBySchedule(date)), [date]);

  // slots disponibles filtrando los ocupados
  const availableSlots = useMemo(() => {
    return slots.filter((s) => !takenTimes.includes(toHHMM(s)));
  }, [slots, takenTimes]);

  // cargar horarios ocupados cuando cambia la fecha
  useEffect(() => {
    async function fetchTaken(dateStr) {
      try {
        const r = await fetch(
          `/api/bookings?date=${encodeURIComponent(dateStr)}&barberId=${encodeURIComponent(
            BARBER_ID
          )}`
        );
        const j = await r.json();
        setTakenTimes(j.ok ? j.taken : []);
      } catch (e) {
        setTakenTimes([]);
      }
    }
    fetchTaken(date);
  }, [date]);

  // ====== handleSubmit corregido ======
  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedSlot || !selectedTime24) {
      setResult({ ok: false, message: "Elegí un horario." });
      return;
    }
    if (!name || !phone) {
      setResult({ ok: false, message: "Completá nombre y teléfono." });
      return;
    }

    setSending(true);
    setResult(null);

    const payload = {
      date,                 // "YYYY-MM-DD"
      time: selectedTime24, // "HH:MM" exacto (24h)
      barberId: BARBER_ID,  // "juanma"
      serviceId,
      name,
      phone,
      notes,
    };

    try {
      const r = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // si el server responde 409, ya está ocupado
      if (r.status === 409) {
        setResult({ ok: false, message: "Ese horario se ocupó recién. Elegí otro." });
      } else {
        const j = await r.json();
        if (j.ok) {
          setResult({
            ok: true,
            message: `✅ Reservado ${date} ${fmtTime(selectedSlot)} con ${BARBER_LABEL} — ${name}`,
          });
          // limpiar selección
          setSelectedSlot(null);
          setSelectedTime24("");
          setNotes("");

          // refrescar ocupados para que desaparezca el turno tomado
          const rr = await fetch(
            `/api/bookings?date=${encodeURIComponent(date)}&barberId=${encodeURIComponent(
              BARBER_ID
            )}`
          );
          const jj = await rr.json();
          setTakenTimes(jj.ok ? jj.taken : []);
        } else {
          setResult({ ok: false, message: j.error || "Error al reservar." });
        }
      }
    } catch (err) {
      setResult({ ok: false, message: "Error de red al reservar." });
    } finally {
      setSending(false);
    }
  }

  const isClosed = (() => {
    const d = localMidnight(date).getDay();
    return !SCHEDULE[d];
  })();

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>💈 Agenda Online — {BARBER_LABEL}</h1>
      <p style={{ marginBottom: 16 }}>Lun–Vie 09:30–19:00 · Sáb 09:30–14:00 · Dom cerrado</p>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Columna izquierda: formulario */}
        <div style={{ flex: 1 }}>
          <form onSubmit={handleSubmit}>
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
              {isClosed
                ? "Cerrado"
                : sending
                ? "Reservando..."
                : selectedSlot
                ? "Confirmar turno"
                : "Elegí un horario"}
            </button>

            {result && (
              <p style={{ marginTop: 10, color: result.ok ? "green" : "red" }}>
                {result.message}
              </p>
            )}
          </form>
        </div>

        {/* Columna derecha: horarios */}
        <div style={{ flex: 1 }}>
          <h3>⏰ Horarios disponibles</h3>
          {isClosed ? (
            <p style={{ color: "#b00" }}>Este día está cerrado.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {slots.length === 0 && <p>No hay turnos configurados.</p>}
              {slots.map((slot) => {
                const label = fmtTime(slot);     // "01:30 p. m."
                const hhmm = toHHMM(slot);       // "13:30"
                const active =
                  selectedSlot && toHHMM(selectedSlot) === hhmm;
                const isTaken = takenTimes.includes(hhmm);

                return (
                  <button
                    key={slot.toISOString()}
                    disabled={isTaken}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setSelectedTime24(hhmm);
                    }}
                    style={{
                      padding: 10,
                      background: isTaken ? "#ddd" : active ? "#444" : "#eee",
                      color: isTaken ? "#999" : active ? "#fff" : "#000",
                      border: "1px solid #ccc",
                      borderRadius: 6,
                      cursor: isTaken ? "not-allowed" : "pointer",
                      opacity: isTaken ? 0.5 : 1,
                    }}
                  >
                    {label}
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
