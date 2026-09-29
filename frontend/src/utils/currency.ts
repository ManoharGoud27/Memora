/**
 * Utilities for formatting currency values in Indian Rupees (INR ₹).
 */

export function formatINR(
  amount: number | string | null | undefined,
  options?: { compact?: boolean; maximumFractionDigits?: number }
): string {
  if (amount === null || amount === undefined || amount === '') {
    return '₹0'
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) {
    return '₹0'
  }

  const { compact = false, maximumFractionDigits = 0 } = options || {}

  if (compact) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(num)
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits,
  }).format(num)
}

/**
 * Returns formatted Rupee text or shorthand without symbol if needed.
 */
export function formatINRPlain(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num)
}
