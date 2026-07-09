/** Pesan sync yang bisa diperbaiki dengan tombol "Coba lagi". */
export function canRetrySync(message: string | null): boolean {
  if (!message) return false;
  return (
    message.includes('Gagal ambil cloud') ||
    message.includes('belum diunggah') ||
    message.includes('belum sync')
  );
}
