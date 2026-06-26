function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Kunde inte läsa bilden'));
    };
    image.src = objectUrl;
  });
}

export async function compressImageBlob(blob: Blob, maxSide = 1280, quality = 0.8): Promise<string> {
  const image = await loadImage(blob);
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kunde inte bearbeta bilden');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export function compressImageFile(file: File, maxSide = 1280, quality = 0.8) {
  return compressImageBlob(file, maxSide, quality);
}

export async function imageUrlToDataUrl(url: string, maxSide = 1280, quality = 0.8) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Kunde inte hämta bilden');
  return compressImageBlob(await response.blob(), maxSide, quality);
}

export function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(value);
}

export function approximateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(',', 2)[1] || '';
  return Math.floor(base64.length * 0.75);
}
