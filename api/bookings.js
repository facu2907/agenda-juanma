import { db } from "./_firebase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false });
  }

  try {
    const { date, barberId } = req.query;
    if (!date || !barberId) {
      return res.status(400).json({ ok: false, error: "Missing params" });
    }

    const snap = await db
      .collection("bookings")
      .where("date", "==", date)
      .where("barberId", "==", barberId)
      .get();

    const taken = snap.docs.map((d) => d.data().time);

    return res.status(200).json({ ok: true, taken });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
