export const XRP_DROPS_PER_XRP = BigInt("1000000");
export const MAX_XRP_DROPS = BigInt("100000000000000000");

const MAX_XRP = 100_000_000_000;
const DECIMAL_NUMBER_PATTERN = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i;

function powerOfTen(exponent: number): bigint {
  return BigInt(`1${"0".repeat(exponent)}`);
}

/**
 * Converts a nonnegative XRP amount to drops without floating-point
 * multiplication. The number's round-trippable decimal representation is
 * parsed directly so that amounts such as 1.000001 XRP remain exact.
 */
export function xrpToDrops(value: unknown): bigint | null {
  try {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > MAX_XRP
    ) {
      return null;
    }

    const match = DECIMAL_NUMBER_PATTERN.exec(value.toString());
    if (!match) {
      return null;
    }

    const [, whole, fraction = "", exponentText = "0"] = match;
    const exponent = Number.parseInt(exponentText, 10);
    if (!Number.isSafeInteger(exponent)) {
      return null;
    }

    const coefficient = BigInt(`${whole}${fraction}`);
    const decimalPlaces = fraction.length - exponent;
    const dropsExponent = 6 - decimalPlaces;
    let drops: bigint;

    if (dropsExponent >= 0) {
      drops = coefficient * powerOfTen(dropsExponent);
    } else {
      const divisor = powerOfTen(-dropsExponent);
      if (coefficient % divisor !== BigInt(0)) {
        return null;
      }
      drops = coefficient / divisor;
    }

    return drops <= MAX_XRP_DROPS ? drops : null;
  } catch {
    return null;
  }
}
