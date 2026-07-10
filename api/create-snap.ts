import type { VercelRequest, VercelResponse } from '@vercel/node';

import { verifyFirebaseIdToken } from '../server/firebaseAdmin';
import { applyCors, readBearerToken } from '../server/http';
import { getSnapClient, MIDTRANS_MIN_AMOUNT } from '../server/midtrans';

type Body = {
  pocketId?: string;
  pocketName?: string;
  amount?: number;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const idToken = readBearerToken(req);
    if (!idToken) {
      res.status(401).json({ error: 'Login dulu untuk bayar via Midtrans.' });
      return;
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Body;

    const pocketId = String(body.pocketId ?? '').trim();
    const pocketName = String(body.pocketName ?? 'Kantong Sortu').trim().slice(0, 50);
    const amount = Number(body.amount);

    if (!pocketId) {
      res.status(400).json({ error: 'pocketId wajib diisi.' });
      return;
    }
    if (!Number.isFinite(amount) || amount < MIDTRANS_MIN_AMOUNT) {
      res.status(400).json({
        error: `Nominal minimal Rp${MIDTRANS_MIN_AMOUNT.toLocaleString('id-ID')}.`,
      });
      return;
    }

    const uid = decoded.uid;
    const orderId = `sortu-${uid.slice(0, 8)}-${Date.now()}`;

    const snap = getSnapClient();
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: [
        {
          id: pocketId,
          price: amount,
          quantity: 1,
          name: pocketName,
        },
      ],
      customer_details: {
        email: decoded.email ?? undefined,
      },
      custom_field1: uid,
      custom_field2: pocketId,
    });

    res.status(200).json({
      snapToken: transaction.token,
      orderId,
    });
  } catch (err) {
    console.error('create-snap error', err);
    const message = err instanceof Error ? err.message : 'Gagal membuat transaksi.';
    res.status(500).json({ error: message });
  }
}
