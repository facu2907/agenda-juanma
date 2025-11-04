import { db } from "./_firebase";

async function sendTelegram({ date, time, name, phone, serviceId, notes }) {
  try {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    const text =
      `💈 <b>Nueva reserva</b>\n` +
      `📅 <b>${date}</b> — <b>${time}</b>\n` +
      `👤 ${name}\n` +
      `📞 ${phone}\n` +
      `✂️ ${serviceId}\n` +
      `📝 ${notes || "-"}`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {}
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { date, time, barberId, serviceId, name, phone, notes } = body || {};
    if (!date || !time || !barberId || !serviceId || !name || !phone) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const safeTime = time.replace(/[^\w]/g, "_");
    const docId = `${barberId}_${date}_${safeTime}`;
    const ref = db.collection("bookings").doc(docId);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return null;
      const cancelToken = crypto.randomUUID();
      tx.set(ref, {
        date, time, barber_id: barberId, service_id: serviceId, name, phone, notes,
        cancel_token: cancelToken, created_at: new Date().toISOString()
      });
      return { id: ref.id, cancel_token: cancelToken };
    });

    if (!result) return res.status(409).json({ error: "Slot already taken" });

    sendTelegram({ date, time, name, phone, serviceId, notes });

    res.status(200).json({ ok: true, booking: result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
