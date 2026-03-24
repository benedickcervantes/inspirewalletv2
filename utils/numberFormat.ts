export function unformatNumberString(value: string): string {
  return (value || "").replace(/,/g, "");
}

function filterToNumericWithSingleDot(value: string): string {
  const cleaned = (value || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
  const firstDotIndex = cleaned.indexOf(".");
  if (firstDotIndex === -1) return cleaned;
  const intPart = cleaned.slice(0, firstDotIndex);
  const rest = cleaned.slice(firstDotIndex + 1).replace(/\./g, "");
  return `${intPart}.${rest}`;
}

export function formatAmountWithCommas(input: string): string {
  const normalized = filterToNumericWithSingleDot(input);
  if (!normalized) return "";

  const hasDot = normalized.includes(".");
  const [rawInt, rawDec = ""] = normalized.split(".");

  const intPart = rawInt.replace(/^0+(?=\d)/, "");
  const formattedInt = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (!hasDot) return formattedInt === "0" && rawInt === "" ? "" : formattedInt;

  // Preserve user's in-progress decimal typing (e.g. "1.", "1.0", "1.00")
  return `${formattedInt}.${rawDec}`;
}

/**
 * Format input to only allow positive whole numbers with comma separators.
 * Removes any negative signs, decimals, and non-numeric characters.
 * Accepts numbers like 1000, 50000, 1000000 and formats them with commas.
 * @param input - The input string to format
 * @returns Formatted string with only positive whole numbers and commas (e.g., "1,000,000")
 */
export function formatWholeNumbersOnly(input: string): string {
  // Remove all non-numeric characters (including decimals, negative signs, etc.)
  const cleaned = (input || "").replace(/[^0-9]/g, "");
  
  if (!cleaned) return "";
  
  // Remove leading zeros but keep at least one digit
  const withoutLeadingZeros = cleaned.replace(/^0+(?=\d)/, "");
  const finalNumber = withoutLeadingZeros || "0";
  
  // Add comma separators for thousands (e.g., 1000000 -> 1,000,000)
  return finalNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

