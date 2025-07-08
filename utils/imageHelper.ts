/**
 * Converts a File object to a base64 string.
 * @param file The file to convert.
 * @returns A promise that resolves with the base64 encoded string.
 */
export const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // result is a data URL (e.g., "data:image/png;base64,iVBORw0KGgo...")
      // We only need the base64 part.
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};
