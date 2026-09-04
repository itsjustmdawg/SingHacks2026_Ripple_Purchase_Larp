import { createHash, timingSafeEqual } from "node:crypto";

const RIPPLE_BASE58_ALPHABET =
  "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
const CLASSIC_ADDRESS_MIN_LENGTH = 25;
const CLASSIC_ADDRESS_MAX_LENGTH = 35;
const CLASSIC_ADDRESS_DECODED_LENGTH = 25;
const ACCOUNT_ID_VERSION = 0;
const CHECKSUM_LENGTH = 4;

const BASE58_VALUES = new Map(
  [...RIPPLE_BASE58_ALPHABET].map((character, index) => [character, index]),
);

function decodeRippleBase58(value: string): Uint8Array | null {
  // Store the result little-endian so each base-58 digit can be incorporated
  // without relying on unbounded integer conversions.
  const bytes = [0];

  for (const character of value) {
    const digit = BASE58_VALUES.get(character);
    if (digit === undefined) {
      return null;
    }

    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leadingZeroCount = 0;
  while (
    leadingZeroCount < value.length &&
    value[leadingZeroCount] === RIPPLE_BASE58_ALPHABET[0]
  ) {
    leadingZeroCount += 1;
  }

  // The accumulator already contains one zero byte for an all-zero value.
  const significantByteCount =
    bytes.length === 1 && bytes[0] === 0 ? 0 : bytes.length;
  const decoded = new Uint8Array(leadingZeroCount + significantByteCount);

  for (let index = 0; index < significantByteCount; index += 1) {
    decoded[decoded.length - 1 - index] = bytes[index];
  }

  return decoded;
}

function checksum(payload: Uint8Array): Uint8Array {
  const firstHash = createHash("sha256").update(payload).digest();
  return createHash("sha256")
    .update(firstHash)
    .digest()
    .subarray(0, CHECKSUM_LENGTH);
}

/**
 * Returns whether a value is a canonical XRPL Classic account address.
 *
 * Classic addresses use Ripple Base58Check and encode a zero version byte,
 * a 20-byte AccountID, and a four-byte double-SHA-256 checksum.
 */
export function isValidClassicAddress(value: unknown): boolean {
  if (
    typeof value !== "string" ||
    value.length < CLASSIC_ADDRESS_MIN_LENGTH ||
    value.length > CLASSIC_ADDRESS_MAX_LENGTH ||
    value[0] !== RIPPLE_BASE58_ALPHABET[0]
  ) {
    return false;
  }

  try {
    const decoded = decodeRippleBase58(value);
    if (
      decoded === null ||
      decoded.length !== CLASSIC_ADDRESS_DECODED_LENGTH ||
      decoded[0] !== ACCOUNT_ID_VERSION
    ) {
      return false;
    }

    const payload = decoded.subarray(0, -CHECKSUM_LENGTH);
    const actualChecksum = decoded.subarray(-CHECKSUM_LENGTH);
    const expectedChecksum = checksum(payload);

    return timingSafeEqual(actualChecksum, expectedChecksum);
  } catch {
    return false;
  }
}
