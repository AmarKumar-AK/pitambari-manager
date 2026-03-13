import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ClothEntry } from '../types';
import { format } from 'date-fns';

const BACKUP_DIR = FileSystem.documentDirectory + 'backups/';

async function ensureBackupDir() {
  const info = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
}

export async function exportBackup(entries: ClothEntry[]): Promise<void> {
  await ensureBackupDir();
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const filename = `kapda_backup_${timestamp}.json`;
  const filePath = BACKUP_DIR + filename;

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    count: entries.length,
    entries,
  };

  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Export Kapda Backup',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

export async function readBackupFile(uri: string): Promise<ClothEntry[]> {
  const content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const parsed = JSON.parse(content);

  // Support both wrapped format and plain array
  const entries: ClothEntry[] = Array.isArray(parsed) ? parsed : parsed.entries ?? [];
  if (!Array.isArray(entries)) {
    throw new Error('Invalid backup file format');
  }
  return entries;
}
