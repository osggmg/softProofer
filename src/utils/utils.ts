export const readFileFromPublic = async (path: string): Promise<Uint8Array> => {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

export const flatRgbToStrings = (buf: ArrayLike<number>) => {
  const colorPatchesCount = 21;
  const out: string[] = [];
  for (let i = 0; i < colorPatchesCount; i++) {
    const r = buf[i * 3 + 0];
    const g = buf[i * 3 + 1];
    const b = buf[i * 3 + 2];
    out.push(`rgb(${r}, ${g}, ${b})`);
  }
  return out;
}