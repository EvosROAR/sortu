import type { VercelRequest, VercelResponse } from '@vercel/node';

import { getCoreClient } from '../server/midtrans';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const core = getCoreClient();
    const status = await core.transaction.notification(req.body);

    const orderId = String(status.order_id ?? '');
    const transactionStatus = String(status.transaction_status ?? '');
    const uid = String(status.custom_field1 ?? '');

    console.info('midtrans-webhook', { orderId, transactionStatus, uid });

    res.status(200).send('OK');
  } catch (err) {
    console.error('midtrans-webhook error', err);
    res.status(500).send('Error');
  }
}
