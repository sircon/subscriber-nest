/**
 * Utility functions for email handling
 */

/**
 * Masks the local part (before @) of an email address while keeping the domain visible.
 * Examples:
 * - "john.doe@example.com" -> "j****@example.com"
 * - "a@example.com" -> "a****@example.com"
 * - "ab@example.com" -> "a****@example.com"
 * - "abc@example.com" -> "a****@example.com"
 *
 * @param email - The email address to mask
 * @returns Masked email address with local part masked and domain visible
 * @throws Error if email format is invalid
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== "string") {
    throw new Error("Email must be a non-empty string");
  }

  // Basic email validation: must contain @ and have at least one character before and after @
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  const [localPart, domain] = email.split("@");

  // Handle edge cases for very short local parts
  if (localPart.length === 0) {
    throw new Error("Email local part cannot be empty");
  }

  // For single character or very short emails, show first character and mask the rest
  // Minimum: show first character, mask with 4 asterisks
  const firstChar = localPart[0];
  const maskedLocalPart = `${firstChar}****`;

  return `${maskedLocalPart}@${domain}`;
}
