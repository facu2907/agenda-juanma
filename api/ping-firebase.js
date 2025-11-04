import { db } from "./_firebase";

export default async function handler(req, res) {
  try {
    const ref = db.collection("_ping").doc("test");
    await ref.set({ t: Date.now() }, { merge: true });
    const snap = await ref.get();
    res.status(200).json({ ok: true, data: snap.data() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}