const LOG_PREFIX = "[channelMapping]";
const ICC_TAG_TABLE_OFFSET = 128;
const ICC_TAG_ENTRY_SIZE = 12;
const ICC_COLORANT_TABLE_SIG_CLRT = 0x636c7274; // 'clrt'
const ICC_COLORANT_TABLE_BASE_SIZE = 12;
const ICC_COLORANT_NAME_LENGTH = 32;
const ICC_COLORANT_TABLE_PCS_COORDS_SIZE = 6;
const ICC_COLORANT_TABLE_RECORD_SIZE =
  ICC_COLORANT_NAME_LENGTH + ICC_COLORANT_TABLE_PCS_COORDS_SIZE;

type CMYKChannel = "C" | "M" | "Y" | "K";
const ICC_DATA_COLOR_SPACE_OFFSET = 16;
const ICC_DATA_COLOR_SPACE_SIZE = 4;

const readUint32BE = (bytes: Uint8Array, offset: number): number => {
  if (offset < 0 || offset + 4 > bytes.length) {
    throw new Error(`readUint32BE out of bounds at offset ${offset}`);
  }

  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
};

const readUint16BE = (bytes: Uint8Array, offset: number): number => {
  if (offset < 0 || offset + 2 > bytes.length) {
    throw new Error(`readUint16BE out of bounds at offset ${offset}`);
  }

  return (bytes[offset] << 8) | bytes[offset + 1];
};

const decodeAsciiTrimmed = (bytes: Uint8Array): string => {
  let end = bytes.length;

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      end = i;
      break;
    }
  }

  let text = "";
  for (let i = 0; i < end; i++) {
    text += String.fromCharCode(bytes[i]);
  }

  return text.trim();
};

const getChannelCountFromSignature = (signature: string): number | null => {
  if (signature === "CMYK") return 4;

  const genericColorSpaceMatch = signature.match(/^([1-9A-F])CLR$/);
  if (genericColorSpaceMatch) {
    return parseInt(genericColorSpaceMatch[1], 16);
  }

  const multiChannelMatch = signature.match(/^MCH([1-9A-F])$/);
  if (multiChannelMatch) {
    return parseInt(multiChannelMatch[1], 16);
  }

  return null;
};

export const getIccInputChannelCount = (iccBytes: Uint8Array): number | null => {
  if (iccBytes.length < ICC_DATA_COLOR_SPACE_OFFSET + ICC_DATA_COLOR_SPACE_SIZE) {
    return null;
  }

  const signature = decodeAsciiTrimmed(
    iccBytes.subarray(
      ICC_DATA_COLOR_SPACE_OFFSET,
      ICC_DATA_COLOR_SPACE_OFFSET + ICC_DATA_COLOR_SPACE_SIZE,
    ),
  ).toUpperCase();

  return getChannelCountFromSignature(signature);
};

const normalizeColorantName = (name: string): CMYKChannel | null => {
  const normalized = name.toUpperCase().replace(/[^A-Z]/g, "");

  if (normalized === "C" || normalized.includes("CYAN")) return "C";
  if (normalized === "M" || normalized.includes("MAGENTA")) return "M";
  if (normalized === "Y" || normalized.includes("YELLOW")) return "Y";
  if (
    normalized === "K" ||
    normalized.includes("BLACK") ||
    normalized.includes("KEY")
  ) {
    return "K";
  }

  return null;
};

const findClrtTag = (iccBytes: Uint8Array): { offset: number; size: number } | null => {
  if (iccBytes.length < ICC_TAG_TABLE_OFFSET + 4) {
    console.log(`${LOG_PREFIX} profile too short to contain ICC tag table`);
    return null;
  }

  const tagCount = readUint32BE(iccBytes, ICC_TAG_TABLE_OFFSET);
  let cursor = ICC_TAG_TABLE_OFFSET + 4;

  for (let i = 0; i < tagCount; i++) {
    if (cursor + ICC_TAG_ENTRY_SIZE > iccBytes.length) {
      console.log(`${LOG_PREFIX} tag table ended unexpectedly at entry ${i}`);
      return null;
    }

    const signature = readUint32BE(iccBytes, cursor);
    const offset = readUint32BE(iccBytes, cursor + 4);
    const size = readUint32BE(iccBytes, cursor + 8);

    if (signature === ICC_COLORANT_TABLE_SIG_CLRT) {
      console.log(`${LOG_PREFIX} found clrt tag at offset=${offset} size=${size}`);
      return { offset, size };
    }

    cursor += ICC_TAG_ENTRY_SIZE;
  }

  console.log(`${LOG_PREFIX} clrt tag not found`);
  return null;
};

export const logClrtTag = (iccBytes: Uint8Array) => {
  try {
    const clrtTag = findClrtTag(iccBytes);
    if (!clrtTag) {
      return;
    }

    const { offset, size } = clrtTag;
    if (offset + size > iccBytes.length) {
      console.log(`${LOG_PREFIX} clrt tag points outside ICC byte buffer`);
      return;
    }

    if (size < ICC_COLORANT_TABLE_BASE_SIZE) {
      console.log(`${LOG_PREFIX} clrt tag is too small to contain a header`);
      return;
    }

    const colorantCount = readUint32BE(iccBytes, offset + 8);
    const recordsStart = offset + ICC_COLORANT_TABLE_BASE_SIZE;
    const expectedSize =
      ICC_COLORANT_TABLE_BASE_SIZE +
      colorantCount * ICC_COLORANT_TABLE_RECORD_SIZE;

    console.log(`${LOG_PREFIX} clrt colorant count=${colorantCount}`);
    console.log(
      `${LOG_PREFIX} clrt expected size=${expectedSize} actual size=${size}`,
    );

    for (let i = 0; i < colorantCount; i++) {
      const recordOffset = recordsStart + i * ICC_COLORANT_TABLE_RECORD_SIZE;
      const recordEnd = recordOffset + ICC_COLORANT_TABLE_RECORD_SIZE;

      if (recordEnd > offset + size || recordEnd > iccBytes.length) {
        console.log(`${LOG_PREFIX} clrt record ${i} exceeds tag bounds`);
        return;
      }

      const nameBytes = iccBytes.subarray(
        recordOffset,
        recordOffset + ICC_COLORANT_NAME_LENGTH,
      );
      const name = decodeAsciiTrimmed(nameBytes);
      const pcsOffset = recordOffset + ICC_COLORANT_NAME_LENGTH;
      const pcs1 = readUint16BE(iccBytes, pcsOffset);
      const pcs2 = readUint16BE(iccBytes, pcsOffset + 2);
      const pcs3 = readUint16BE(iccBytes, pcsOffset + 4);

      console.log(
        `${LOG_PREFIX} clrt[${i}] = '${name}' pcs=[${pcs1}, ${pcs2}, ${pcs3}]`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`${LOG_PREFIX} failed to read clrt tag: ${message}`);
  }
};

export const getClrtColorantOrder = (
  iccBytes: Uint8Array,
): CMYKChannel[] | null => {
  const clrtTag = findClrtTag(iccBytes);
  if (!clrtTag) {
    return null;
  }

  const { offset, size } = clrtTag;
  if (offset + size > iccBytes.length || size < ICC_COLORANT_TABLE_BASE_SIZE) {
    return null;
  }

  const colorantCount = readUint32BE(iccBytes, offset + 8);
  if (colorantCount !== 4) {
    console.log(
      `${LOG_PREFIX} clrt mapping supports only 4-color profiles, got ${colorantCount}`,
    );
    return null;
  }

  const recordsStart = offset + ICC_COLORANT_TABLE_BASE_SIZE;
  const order: CMYKChannel[] = [];

  for (let i = 0; i < colorantCount; i++) {
    const recordOffset = recordsStart + i * ICC_COLORANT_TABLE_RECORD_SIZE;
    const recordEnd = recordOffset + ICC_COLORANT_TABLE_RECORD_SIZE;

    if (recordEnd > offset + size || recordEnd > iccBytes.length) {
      console.log(`${LOG_PREFIX} clrt mapping record ${i} exceeds tag bounds`);
      return null;
    }

    const nameBytes = iccBytes.subarray(
      recordOffset,
      recordOffset + ICC_COLORANT_NAME_LENGTH,
    );
    const name = decodeAsciiTrimmed(nameBytes);
    const channel = normalizeColorantName(name);

    console.log(
      `${LOG_PREFIX} order candidate clrt[${i}] name='${name}' normalized='${channel ?? "null"}'`,
    );

    if (!channel || order.includes(channel)) {
      console.log(`${LOG_PREFIX} could not derive a unique CMYK order from clrt`);
      return null;
    }

    order.push(channel);
  }

  console.log(`${LOG_PREFIX} clrt-derived order: ${order.join(" -> ")}`);
  return order;
};

export const getCmykSlotMapFromClrt = (
  iccBytes: Uint8Array,
): [number, number, number, number] | null => {
  const clrtTag = findClrtTag(iccBytes);
  if (!clrtTag) {
    return null;
  }

  const { offset, size } = clrtTag;
  if (offset + size > iccBytes.length || size < ICC_COLORANT_TABLE_BASE_SIZE) {
    return null;
  }

  const colorantCount = readUint32BE(iccBytes, offset + 8);
  if (colorantCount < 4) {
    return null;
  }

  const recordsStart = offset + ICC_COLORANT_TABLE_BASE_SIZE;
  const slots: Partial<Record<CMYKChannel, number>> = {};

  for (let i = 0; i < colorantCount; i++) {
    const recordOffset = recordsStart + i * ICC_COLORANT_TABLE_RECORD_SIZE;
    const recordEnd = recordOffset + ICC_COLORANT_TABLE_RECORD_SIZE;

    if (recordEnd > offset + size || recordEnd > iccBytes.length) {
      return null;
    }

    const nameBytes = iccBytes.subarray(
      recordOffset,
      recordOffset + ICC_COLORANT_NAME_LENGTH,
    );
    const name = decodeAsciiTrimmed(nameBytes);
    const channel = normalizeColorantName(name);

    if (!channel) {
      continue;
    }

    if (slots[channel] !== undefined) {
      console.log(`${LOG_PREFIX} duplicate '${channel}' colorant in clrt; cannot build slot map`);
      return null;
    }

    slots[channel] = i;
  }

  if (
    slots.C === undefined ||
    slots.M === undefined ||
    slots.Y === undefined ||
    slots.K === undefined
  ) {
    console.log(`${LOG_PREFIX} clrt does not contain complete C/M/Y/K set`);
    return null;
  }

  console.log(
    `${LOG_PREFIX} clrt slot map: C->${slots.C}, M->${slots.M}, Y->${slots.Y}, K->${slots.K}`,
  );
  return [slots.C, slots.M, slots.Y, slots.K];
};

export const mapCmykToProfileColorantOrder = (
  input: Uint16Array,
  iccBytes: Uint8Array,
): { mappedInput: Uint16Array; profileChannelsPerPixel: number } => {
  if (input.length % 4 !== 0) {
    throw new Error(
      `Invalid CMYK input length ${input.length}. Expected 4 channels per pixel.`,
    );
  }

  const profileChannelsPerPixel = getIccInputChannelCount(iccBytes);
  if (!profileChannelsPerPixel) {
    throw new Error("Could not determine profile channel count from ICC signature.");
  }

  if (profileChannelsPerPixel < 4 || profileChannelsPerPixel > 7) {
    throw new Error(
      `Unsupported profile channel count ${profileChannelsPerPixel}. Supported range is 4 to 7 channels.`,
    );
  }

  const pixelCount = input.length / 4;
  const cmykSlots = getCmykSlotMapFromClrt(iccBytes);

  if (!cmykSlots) {
    if (profileChannelsPerPixel === 4) {
      console.log(`${LOG_PREFIX} no clrt slot map; assuming CMYK input order`);
      return { mappedInput: input, profileChannelsPerPixel };
    }

    throw new Error(
      `Profile has ${profileChannelsPerPixel} channels but clrt does not provide a full C/M/Y/K mapping.`,
    );
  }

  console.log(
    `${LOG_PREFIX} applying CMYK slots C->${cmykSlots[0]}, M->${cmykSlots[1]}, Y->${cmykSlots[2]}, K->${cmykSlots[3]} into ${profileChannelsPerPixel} channels`,
  );

  if (
    profileChannelsPerPixel === 4 &&
    cmykSlots[0] === 0 &&
    cmykSlots[1] === 1 &&
    cmykSlots[2] === 2 &&
    cmykSlots[3] === 3
  ) {
    console.log(`${LOG_PREFIX} profile already uses CMYK order`);
    return { mappedInput: input, profileChannelsPerPixel };
  }

  const mapped = new Uint16Array(pixelCount * profileChannelsPerPixel);

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    const sourceBase = pixelIndex * 4;
    const targetBase = pixelIndex * profileChannelsPerPixel;
    mapped[targetBase + cmykSlots[0]] = input[sourceBase];
    mapped[targetBase + cmykSlots[1]] = input[sourceBase + 1];
    mapped[targetBase + cmykSlots[2]] = input[sourceBase + 2];
    mapped[targetBase + cmykSlots[3]] = input[sourceBase + 3];
  }

  console.log(`${LOG_PREFIX} applied clrt-based CMYK slot mapping`);
  return { mappedInput: mapped, profileChannelsPerPixel };
};
