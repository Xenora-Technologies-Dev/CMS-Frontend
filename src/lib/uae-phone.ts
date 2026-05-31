/** Canonical UAE mobile: 05XXXXXXXX (10 digits). */
const UAE_MOBILE_REGEX = /^05\d{8}$/;

export function normalizeUaeMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (UAE_MOBILE_REGEX.test(digits)) return digits;
  if (/^9715\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^5\d{8}$/.test(digits)) return `0${digits}`;
  return null;
}

export function isValidUaeMobile(input: string): boolean {
  return normalizeUaeMobile(input) !== null;
}

export function isEmailLoginIdentifier(identifier: string): boolean {
  return identifier.includes('@');
}
