import TextRecognition from '@react-native-ml-kit/text-recognition';

/**
 * Runs on-device OCR on an image file and returns the recognized text.
 * Wraps ML Kit so the rest of the app never imports it directly. Returns an
 * empty string on failure — callers degrade gracefully to manual entry.
 */
export async function recognizeText(imageUri: string): Promise<string> {
  try {
    const result = await TextRecognition.recognize(imageUri);
    return result.text ?? '';
  } catch (error) {
    console.warn('[ExpFlow] OCR failed', error);
    return '';
  }
}
