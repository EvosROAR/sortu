import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { MoneyEvent, Pocket } from '@/domain/entities/Pocket';
import { LedgerSnapshot } from '@/infrastructure/storage/ledgerStorage';

export class BackupParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupParseError';
  }
}

export class BackupExportCancelledError extends Error {
  constructor() {
    super('Export dibatalkan');
    this.name = 'BackupExportCancelledError';
  }
}

export type ExportBackupMode = 'device' | 'share';

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
    dialogTitle: 'Bagikan backup Sortu',
    UTI: 'public.json',
  });
}

/** Android: pilih folder (default Download) lalu simpan file JSON ke penyimpanan HP. */
async function saveToDeviceAndroid(data: SortuBackup): Promise<void> {
  const { StorageAccessFramework } = FileSystem;
  const downloadsUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsUri);

  if (!permissions.granted) {
    throw new BackupExportCancelledError();
  }

  const baseName = backupFilename(data.exportedAt).replace(/\.json$/i, '');
  const fileUri = await StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    baseName,
    'application/json',
  );

  await StorageAccessFramework.writeAsStringAsync(fileUri, backupJson(data), {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function exportBackupFile(
  scopeId: string,
  ledger: LedgerSnapshot,
  mode: ExportBackupMode = 'device',
): Promise<void> {
  const data = createBackup(scopeId, ledger);

  if (Platform.OS === 'web') {
    await downloadOnWeb(data);
    return;
  }

  if (mode === 'share') {
    await shareOnNative(data);
    return;
  }

  if (Platform.OS === 'android') {
    await saveToDeviceAndroid(data);
    return;
  }

  // iOS: sheet "Save to Files" ada di menu bagikan
  await shareOnNative(data);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isValidPocket(value: unknown): value is Pocket {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.emoji === 'string' &&
    Number.isFinite(value.currentAmount) &&
    Number.isFinite(value.targetAmount) &&
    (value.dueDay === null || (Number.isInteger(value.dueDay) && value.dueDay >= 1 && value.dueDay <= 28)) &&
    (value.paidThroughDue === undefined ||
      value.paidThroughDue === null ||
      typeof value.paidThroughDue === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isValidEvent(value: unknown): value is MoneyEvent {
  if (!isRecord(value)) return false;
  const typeOk =
    value.type === 'income' ||
    value.type === 'allocation' ||
    value.type === 'transfer' ||
    value.type === 'payment';
  return (
    typeOk &&
    typeof value.id === 'string' &&
    Number.isFinite(value.amount) &&
    (value.pocketId === null || typeof value.pocketId === 'string') &&
    typeof value.createdAt === 'string'
  );
}

export function parseBackupJson(raw: string): SortuBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupParseError('File bukan JSON yang valid.');
  }

  if (!isRecord(parsed)) {
    throw new BackupParseError('Format backup tidak dikenali.');
  }

  if (parsed.app !== 'sortu') {
    throw new BackupParseError('File ini bukan backup Sortu.');
  }

  if (parsed.version !== 1) {
    throw new BackupParseError('Versi backup tidak didukung. Perbarui app Sortu.');
  }

  if (!isRecord(parsed.ledger)) {
    throw new BackupParseError('Data ledger di backup tidak lengkap.');
  }

  const ledger = parsed.ledger;
  if (!Array.isArray(ledger.pockets) || !ledger.pockets.every(isValidPocket)) {
    throw new BackupParseError('Data kantong di backup tidak valid.');
  }

  if (!Array.isArray(ledger.events) || !ledger.events.every(isValidEvent)) {
    throw new BackupParseError('Data riwayat di backup tidak valid.');
  }

  if (!Number.isFinite(ledger.unallocated)) {
    throw new BackupParseError('Saldo belum dialokasi di backup tidak valid.');
  }

  return {
    app: 'sortu',
    version: 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    scopeId: typeof parsed.scopeId === 'string' ? parsed.scopeId : 'unknown',
    ledger: {
      unallocated: Number(ledger.unallocated) || 0,
      pockets: ledger.pockets as Pocket[],
      events: ledger.events as MoneyEvent[],
      remindersEnabled: ledger.remindersEnabled !== false,
      updatedAt:
        typeof ledger.updatedAt === 'string' ? ledger.updatedAt : new Date().toISOString(),
    },
  };
}

export function ledgerFromBackup(backup: SortuBackup): LedgerSnapshot {
  return {
    unallocated: backup.ledger.unallocated,
    pockets: backup.ledger.pockets.map((p) => ({ ...p })),
    events: backup.ledger.events.map((e) => ({ ...e })),
    remindersEnabled: backup.ledger.remindersEnabled,
    updatedAt: new Date().toISOString(),
  };
}

function pickBackupOnWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve(await file.text());
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

async function pickBackupOnNative(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'text/plain'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function pickAndParseBackup(): Promise<SortuBackup | null> {
  const raw =
    Platform.OS === 'web' ? await pickBackupOnWeb() : await pickBackupOnNative();

  if (!raw) return null;
  return parseBackupJson(raw);
}

export function summarizeBackup(backup: SortuBackup): string {
  const { pockets, events, unallocated } = backup.ledger;
  return `${pockets.length} kantong · ${events.length} riwayat · belum dialokasi Rp ${Math.round(unallocated).toLocaleString('id-ID')}`;
}
