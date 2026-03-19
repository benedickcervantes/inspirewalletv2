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

