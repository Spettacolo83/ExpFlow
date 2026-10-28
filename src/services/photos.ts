import * as FileSystem from 'expo-file-system/legacy';

/**
 * Copies a freshly-captured photo from the cache into the app's document
 * directory so it survives cache eviction. Returns the persistent URI, or the
 * original URI if copying fails (never blocks a save).
 */
export async function persistReceiptPhoto(cacheUri: string): Promise<string> {
  try {
    const dir = `${FileSystem.documentDirectory}receipts/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
    const ext = cacheUri.split('.').pop()?.split('?')[0] || 'jpg';
    const dest = `${dir}${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: cacheUri, to: dest });
    return dest;
  } catch (error) {
    console.warn('[ExpFlow] Could not persist receipt photo', error);
    return cacheUri;
  }
}
