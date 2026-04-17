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

  console.log(`${LOG_PREFIX} scanning tag table (${tagCount} tags)`);

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

const buildCmykToProfileChannelMap = (
  profileOrder: CMYKChannel[],
): [number, number, number, number] | null => {
  const channelToInputIndex: Record<CMYKChannel, number> = {
    C: 0,
    M: 1,
    Y: 2,
    K: 3,
  };

  if (profileOrder.length !== 4) {
    return null;
  }

  return [
    channelToInputIndex[profileOrder[0]],
    channelToInputIndex[profileOrder[1]],
    channelToInputIndex[profileOrder[2]],
    channelToInputIndex[profileOrder[3]],
  ];
};

export const mapCmykToProfileColorantOrder = (
  input: Uint16Array,
  iccBytes: Uint8Array,
): Uint16Array => {
  if (input.length % 4 !== 0) {
    throw new Error(
      `Invalid CMYK input length ${input.length}. Expected 4 channels per pixel.`,
    );
  }

  const sourceOrder = getClrtColorantOrder(iccBytes);
  if (!sourceOrder) {
    console.log(`${LOG_PREFIX} leaving input unchanged (no valid clrt order)`);
    return input;
  }

  const channelMap = buildCmykToProfileChannelMap(sourceOrder);
  if (!channelMap) {
    console.log(`${LOG_PREFIX} leaving input unchanged (invalid channel map)`);
    return input;
  }

  console.log(
    `${LOG_PREFIX} CMYK->profile map: slot0<=${channelMap[0]}, slot1<=${channelMap[1]}, slot2<=${channelMap[2]}, slot3<=${channelMap[3]}`,
  );

  if (
    channelMap[0] === 0 &&
    channelMap[1] === 1 &&
    channelMap[2] === 2 &&
    channelMap[3] === 3
  ) {
    console.log(`${LOG_PREFIX} profile already uses CMYK order`);
    return input;
  }

  const mapped = new Uint16Array(input.length);

  for (let i = 0; i < input.length; i += 4) {
    mapped[i] = input[i + channelMap[0]];
    mapped[i + 1] = input[i + channelMap[1]];
    mapped[i + 2] = input[i + channelMap[2]];
    mapped[i + 3] = input[i + channelMap[3]];
  }

  console.log(`${LOG_PREFIX} applied clrt-based remap to profile order`);
  return mapped;
};
