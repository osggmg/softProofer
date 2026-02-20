export const readFileFromPublic = async (path: string): Promise<Uint8Array> => {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
