export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return res.status(500).json({ error: "Missing env vars" });

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const data = await r.json();
    if (!data.ok) return res.status(500).json({ error: "Telegram error", details: data });

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error", details: String(e) });
  }
}
