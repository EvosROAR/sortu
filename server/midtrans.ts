import midtransClient from 'midtrans-client';

export const MIDTRANS_MIN_AMOUNT = 10_000;

function isProduction(): boolean {
  return process.env.MIDTRANS_PRODUCTION === 'true';
}

export function getSnapClient() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum diset di Vercel.');
  }

  return new midtransClient.Snap({
    isProduction: isProduction(),
    serverKey,
    clientKey: '',
  });
}

export function getCoreClient() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum diset di Vercel.');
  }

  return new midtransClient.CoreApi({
    isProduction: isProduction(),
    serverKey,
    clientKey: '',
  });
}
