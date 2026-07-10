import * as admin from 'firebase-admin';
import midtransClient from 'midtrans-client';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'asia-southeast2' });

admin.initializeApp();

const midtransServerKey = defineSecret('MIDTRANS_SERVER_KEY');

type CreateSnapPayload = {
  pocketId: string;
  pocketName: string;
  amount: number;
};

const MIN_AMOUNT = 10_000;

function snapClient(serverKey: string) {
  return new midtransClient.Snap({
    isProduction: false,
    serverKey,
    clientKey: '',
  });
}

function coreClient(serverKey: string) {
  return new midtransClient.CoreApi({
    isProduction: false,
    serverKey,
    clientKey: '',
  });
}

export const createSnapTransaction = onCall(
  { secrets: [midtransServerKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Login dulu untuk bayar via Midtrans.');
    }

    const data = request.data as Partial<CreateSnapPayload>;
    const pocketId = String(data.pocketId ?? '').trim();
    const pocketName = String(data.pocketName ?? 'Kantong Sortu').trim().slice(0, 50);
    const amount = Number(data.amount);

    if (!pocketId) {
      throw new HttpsError('invalid-argument', 'pocketId wajib diisi.');
    }
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
      throw new HttpsError(
        'invalid-argument',
        `Nominal minimal Rp${MIN_AMOUNT.toLocaleString('id-ID')}.`,
      );
    }

    const uid = request.auth.uid;
    const orderId = `sortu-${uid.slice(0, 8)}-${Date.now()}`;
    const serverKey = midtransServerKey.value();

    const parameter = {
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
        email: request.auth.token.email ?? undefined,
      },
      custom_field1: uid,
      custom_field2: pocketId,
    };

    const snap = snapClient(serverKey);
    const transaction = await snap.createTransaction(parameter);

    await admin
      .firestore()
      .collection('users')
      .doc(uid)
      .collection('payments')
      .doc(orderId)
      .set({
        orderId,
        pocketId,
        pocketName,
        amount,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      snapToken: transaction.token,
      orderId,
    };
  },
);

export const midtransWebhook = onRequest(
  { secrets: [midtransServerKey] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const serverKey = midtransServerKey.value();
      const core = coreClient(serverKey);
      const status = await core.transaction.notification(req.body);

      const orderId = String(status.order_id ?? '');
      const transactionStatus = String(status.transaction_status ?? '');
      const uid = String(status.custom_field1 ?? '');

      if (!orderId || !uid) {
        res.status(400).send('Invalid notification');
        return;
      }

      const paymentRef = admin
        .firestore()
        .collection('users')
        .doc(uid)
        .collection('payments')
        .doc(orderId);

      const mappedStatus =
        transactionStatus === 'settlement' || transactionStatus === 'capture'
          ? 'settlement'
          : transactionStatus === 'pending'
            ? 'pending'
            : transactionStatus === 'expire'
              ? 'expire'
              : transactionStatus === 'cancel'
                ? 'cancel'
                : transactionStatus || 'unknown';

      await paymentRef.set(
        {
          status: mappedStatus,
          transactionStatus,
          paymentType: status.payment_type ?? null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      res.status(200).send('OK');
    } catch (err) {
      console.error('midtransWebhook error', err);
      res.status(500).send('Error');
    }
  },
);
