import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { LedgerSnapshot } from '@/infrastructure/storage/ledgerStorage';

export type SortuBackup = {
  app: 'sortu';
  version: 1;
  exportedAt: string;
  scopeId: string;
  ledger: LedgerSnapshot;
};

function formatBackupDate(d: Date): string {
  return d.toISOString();
}

function backupFilename(exportedAt: string): string {
  const datePart = exportedAt.slice(0, 10);
  return `sortu-backup-${datePart}.json`;
}

export function createBackup(scopeId: string, ledger: LedgerSnapshot): SortuBackup {
  return {
    app: 'sortu',
    version: 1,
    exportedAt: formatBackupDate(new Date()),
    scopeId,
    ledger: {
      ...ledger,
      events: [...ledger.events],
      pockets: [...ledger.pockets],
    },
  };
}

function backupJson(data: SortuBackup): string {
  return JSON.stringify(data, null, 2);
}

async function downloadOnWeb(data: SortuBackup): Promise<void> {
  const blob = new Blob([backupJson(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = backupFilename(data.exportedAt);
  anchor.click();
  URL.revokeObjectURL(url);
}

async function shareOnNative(data: SortuBackup): Promise<void> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('Storage perangkat tidak tersedia');
  }

  const filename = backupFilename(data.exportedAt);
  const uri = `${cacheDir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, backupJson(data), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing tidak tersedia di perangkat ini');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Simpan backup Sortu',
    UTI: 'public.json',
  });
}

export async function exportBackupFile(scopeId: string, ledger: LedgerSnapshot): Promise<void> {
  const data = createBackup(scopeId, ledger);

  if (Platform.OS === 'web') {
    await downloadOnWeb(data);
    return;
  }

  await shareOnNative(data);
}
