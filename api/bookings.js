import { db } from "./_firebase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { date, barberId = "juanma" } = req.query || {};
    if (!date) return res.status(400).json({ error: "Missing date" });

    const snap = await db
      .collection("bookings")
      .where("date", "==", date)
      .where("barber_id", "==", barberId)
      .select("time")
      .get();

    const taken = snap.docs.map(d => d.get("time"));
    res.status(200).json({ taken });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
