import { decodeImage } from "../profile_transformations/imageMagick";

export const readDefaultImages = async () => {
  const defaultImageUrls = ["/samplePictures/CMYK/roman16_01_highkey.tif"];

  try {
    const readAndDecodedDefaultImages = await Promise.all(
      defaultImageUrls.map(async (url) => {
        try {
          const u8 = new Uint8Array(
            await (await fetch(url)).arrayBuffer(),
          );
          const decoded = await decodeImage(u8);
          return {
            id: crypto.randomUUID(),
            label: url,
            ...decoded,
          };
        } catch (err) {
          console.warn(`Failed to decode image ${url}:`, err);
          return null;
        }
      }),
    );

    return readAndDecodedDefaultImages.filter(
      (img) => img !== null,
    );
  } catch (err) {
    console.error("Failed to load default images:", err);
    return [];
  }
};