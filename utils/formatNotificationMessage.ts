/**
 * Format amounts in notification messages to include comma separators
 */

/**
 * Format a number with comma separators every 3 digits
 * @param amount - The amount to format (string or number)
 * @returns Formatted string with commas (e.g., "1,234.56")
 */
export function formatAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (!Number.isFinite(num)) {
    return amount.toString();
  }
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  });
}

/**
 * Format notification messages to add comma separators to amounts
 * Looks for patterns like "5454.00" or "54554.00" and formats them with commas
 * @param message - The notification message text
 * @returns Message with formatted amounts
 */
export function formatNotificationMessage(message: string): string {
  if (!message) return message;
  
  // Pattern to match amounts in notification messages
  // Matches numbers with 2 decimal places (e.g., "5454.00", "54554.00")
  const amountPattern = /\b(\d{4,})\.(\d{2})\b/g;
  
  return message.replace(amountPattern, (match, wholePart, decimalPart) => {
    const amount = parseFloat(match);
    return formatAmount(amount);
  });
}