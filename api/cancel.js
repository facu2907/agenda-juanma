import { db } from "./_firebase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { cancel_token } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!cancel_token) return res.status(400).json({ error: "Missing cancel_token" });

    const snap = await db.collection("bookings").where("cancel_token", "==", cancel_token).get();
    if (snap.empty) return res.status(404).json({ error: "Not found" });

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
