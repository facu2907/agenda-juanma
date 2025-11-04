import * as admin from "firebase-admin";

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || "";
  // Soporta tanto el formato con \n como multilínea real
  if (raw.includes("\\n")) return raw.replace(/\\n/g, "\n");
  return raw;
}

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase env vars missing (PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  // Evita errores con undefineds
  admin.firestore().settings({ ignoreUndefinedProperties: true });
}

export const db = admin.firestore();