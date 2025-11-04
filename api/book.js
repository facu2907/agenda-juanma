import { db } from "./_firebase.js";
import { randomUUID } from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { date, time, barberId, serviceId, name, phone, notes } = req.body;
    if (!date || !time || !barberId || !name || !phone) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    const docId = `${date}#${barberId}#${time}`; // clave única
    const ref = db.collection("bookings").doc(docId);

    const snap = await ref.get();
    if (snap.exists) {
      return res.status(409).json({ ok: false, error: "Slot already booked" });
    }

    const cancel_token = randomUUID();

    await ref.set({
      date,
      time,
      barberId,
      serviceId: serviceId || null,
      name,
      phone,
      notes: notes || "",
      cancel_token,
      createdAt: Date.now(),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
}
