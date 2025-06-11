import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Security utilities for WebSocket authentication
 * 
 * Provides functions for generating and validating ephemeral security tokens
 * used in the WebSocket handshake process.
 */

/**
 * Generate a cryptographically secure random token
 * 
 * @param length - Token length (default: 32 characters)
 * @returns A random alphanumeric token string
 */
export function generateSecurityToken(length: number = 32): string {
  // Generate random bytes and convert to base64, then filter to alphanumeric
  // We generate more bytes than needed to ensure we get enough valid characters
  const buffer = randomBytes(Math.ceil(length * 1.5));
  const base64 = buffer.toString('base64');
  
  // Extract only alphanumeric characters
  const alphanumeric = base64.replace(/[^a-zA-Z0-9]/g, '');
  
  // Take the first 'length' characters
  return alphanumeric.substring(0, length);
}

/**
 * Validate a provided token against the server token using constant-time comparison
 * 
 * This prevents timing attacks where an attacker could determine the correct
 * token by measuring response times.
 * 
 * @param providedToken - The token provided by the client
 * @param serverToken - The expected server token
 * @returns true if tokens match, false otherwise
 */
export function validateToken(providedToken: string, serverToken: string): boolean {
  // Ensure both tokens are strings and have the same length
  if (typeof providedToken !== 'string' || typeof serverToken !== 'string') {
    return false;
  }
  
  if (providedToken.length !== serverToken.length) {
    return false;
  }
  
  try {
    // Convert strings to buffers for constant-time comparison
    const providedBuffer = Buffer.from(providedToken, 'utf8');
    const serverBuffer = Buffer.from(serverToken, 'utf8');
    
    // Use Node.js crypto.timingSafeEqual for constant-time comparison
    return timingSafeEqual(providedBuffer, serverBuffer);
  } catch (error) {
    // If there's any error during comparison, fail safely
    return false;
  }
}

/**
 * Generate a random request ID for tracking purposes
 * 
 * @returns A unique alphanumeric request ID
 */
export function generateRequestId(): string {
  return generateSecurityToken(16);
}