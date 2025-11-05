// api/book.js
import { db } from "./_firebase.js";
import { randomUUID } from "crypto";

async function sendTelegramFromBook(req, text) {
  const token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // 1) Intento directo a Telegram (preferido)
  if (token && chatId) {
    try {
      const tgURL = `https://api.telegram.org/bot${token}/sendMessage`;
      const r = await fetch(tgURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
      if (!r.ok) {
        const body = await r.text();
        throw new Error(`TG HTTP ${r.status} - ${body}`);
      }
      return true;
    } catch (e) {
      console.log("⚠️ Telegram directo falló:", e?.message || e);
      // seguimos con el fallback
    }
  }

  // 2) Fallback: llamar a tu endpoint interno /api/send-telegram
  try {
    const baseUrl =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

    const r2 = await fetch(`${baseUrl}/api/send-telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r2.ok) {
      const body = await r2.text();
      throw new Error(`send-telegram HTTP ${r2.status} - ${body}`);
    }
    return true;
  } catch (e) {
    console.log("⚠️ Fallback /api/send-telegram falló:", e?.message || e);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Asegura body parseado (por si llega como string)
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { date, time, barberId, serviceId, name, phone, notes } = body;

    if (!date || !time || !barberId || !name || !phone) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    // Clave única por día/barbero/hora ("HH:MM" 24h)
    const docId = `${date}#${barberId}#${time}`;
    const ref = db.collection("bookings").doc(docId);

    // Evitar doble-booking
    const snap = await ref.get();
    if (snap.exists) {
      return res.status(409).json({ ok: false, error: "Slot already booked" });
    }

    const cancel_token = randomUUID();

    await ref.set({
      date,
      time,                 // "HH:MM"
      barberId,
      serviceId: serviceId || null,
      name,
      phone,
      notes: notes || "",
      cancel_token,
      createdAt: Date.now(),
    });

    // ----- Aviso por Telegram (no interrumpe la reserva si falla) -----
    const text =
      `💈 <b>Nueva reserva</b>\n` +
      `📅 ${date} ${time}\n` +
      `👤 ${name}\n` +
      `📞 ${phone}\n` +
      `💇‍♂️ Barber: ${barberId}\n` +
      `✂️ Servicio: ${serviceId || "-"}\n` +
      `📝 ${notes || "-"}`;

    try {
      const ok = await sendTelegramFromBook(req, text);
      if (!ok) console.log("⚠️ No se pudo notificar por Telegram (directo ni fallback).");
    } catch (tgErr) {
      console.log("⚠️ Telegram notify error:", tgErr?.message || tgErr);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[book] ERROR:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
