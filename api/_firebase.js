// api/_firebase.js
import { Firestore } from "@google-cloud/firestore";

// Lee envs (usa "" para evitar undefined)
const projectId = process.env.FIREBASE_PROJECT_ID ?? "";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? "";
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY ?? "";

// Valida antes de tocar nada (así no hay "reading length")
if (!projectId || !clientEmail || !privateKeyRaw) {
  // Mensaje claro para ver en logs de Vercel qué falta
  throw new Error(
    `Missing Firebase envs -> ` +
      `FIREBASE_PROJECT_ID:${Boolean(projectId)} ` +
      `FIREBASE_CLIENT_EMAIL:${Boolean(clientEmail)} ` +
      `FIREBASE_PRIVATE_KEY:${Boolean(privateKeyRaw)}`
  );
}

// Normaliza \n si la clave está cargada en una sola línea
const privateKey = privateKeyRaw.includes("\\n")
  ? privateKeyRaw.replace(/\\n/g, "\n")
  : privateKeyRaw;

// Inicializa Firestore
export const db = new Firestore({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
});
