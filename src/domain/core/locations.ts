/**
 * Page number utilities for formatting and estimation.
 *
 * Kindle locations roughly map to pages at a rate of ~16 locations per page.
 * This module provides utilities for:
 * - Formatting page numbers with consistent zero-padding for proper sorting
 * - Estimating page numbers from Kindle locations when page is not available
 *
 * @packageDocumentation
 */
import { LOCATION_CONSTANTS } from "../../constants/defaults.js";
/**
 * Number of Kindle locations that approximately correspond to one page.
 * This is a generally accepted heuristic based on:
 * - Average font size settings
 * - Standard ebook formatting
 * - Kindle's internal location algorithm
 *
 * Note: This is an approximation; actual ratios vary by book formatting.
 */
export const LOCATIONS_PER_PAGE = LOCATION_CONSTANTS.LOCATIONS_PER_PAGE;

/**
 * Default number of digits for zero-padding page numbers.
 * Using 4 digits allows for books up to 9999 pages.
 */
export const PAGE_PADDING_LENGTH = LOCATION_CONSTANTS.PAGE_PADDING_LENGTH;

/**
 * Format a page number with zero-padding for consistent sorting.
 *
 * @example
 * formatPage(5) // "[0005]"
 * formatPage(42) // "[0042]"
 * formatPage(1234) // "[1234]"
 * formatPage(null) // null
 *
 * @param page - Page number to format (null if not available)
 * @param length - Padding length (default: 4)
 * @returns Formatted page string like "[0042]" or null if page is null
 */
export function formatPage(
  page: number | null,
  length: number = PAGE_PADDING_LENGTH,
): string | null {
  if (page === null) {
    return null;
  }
  return `[${String(page).padStart(length, "0")}]`;
}

/**
 * Format a page number with zero-padding, with fallback for null pages.
 *
 * @example
 * formatPageOrPlaceholder(42) // "[0042]"
 * formatPageOrPlaceholder(null) // "[????]"
 * formatPageOrPlaceholder(null, "N/A") // "N/A"
 *
 * @param page - Page number to format
 * @param placeholder - String to return if page is null (default: "[????]")
 * @param length - Padding length (default: 4)
 * @returns Formatted page string or placeholder
 */
export function formatPageOrPlaceholder(
  page: number | null,
  placeholder: string = "[????]",
  length: number = PAGE_PADDING_LENGTH,
): string {
  if (page === null) {
    return placeholder;
  }
  return `[${String(page).padStart(length, "0")}]`;
}

/**
 * Estimate a page number from a Kindle location.
 *
 * Kindle uses "locations" as units of position in ebooks. These roughly
 * correspond to 128 bytes of text content. The typical mapping is about
 * 16 locations per printed page, though this varies by:
 * - Font size settings
 * - Book formatting
 * - Presence of images or special content
 *
 * @example
 * estimatePageFromLocation(160) // 10 (160/16 = 10)
 * estimatePageFromLocation(100) // 7 (Math.ceil(100/16) = 7)
 * estimatePageFromLocation(1) // 1 (minimum page)
 *
 * @param locationStart - The start location number
 * @returns Estimated page number (always >= 1)
 */
export function estimatePageFromLocation(locationStart: number): number {
  if (locationStart <= 0) {
    return 1;
  }
  return Math.ceil(locationStart / LOCATIONS_PER_PAGE);
}

/**
 * Get the effective page number, using estimation if actual page is not available.
 *
 * This function returns the actual page if available, otherwise estimates
 * it from the Kindle location. This is useful when you need a page number
 * for display or sorting but the original clipping doesn't have one.
 *
 * @example
 * getEffectivePage(42, { start: 100, end: null, raw: "100" }) // 42 (uses actual)
 * getEffectivePage(null, { start: 160, end: null, raw: "160" }) // 10 (estimates)
 *
 * @param actualPage - The actual page number (may be null)
 * @param location - The clipping location object
 * @returns Page number (actual or estimated)
 */
export function getEffectivePage(actualPage: number | null, location: { start: number }): number {
  if (actualPage !== null) {
    return actualPage;
  }
  return estimatePageFromLocation(location.start);
}

/**
 * Information about a page number including whether it was estimated.
 */
export interface PageInfo {
  /** The page number (actual or estimated) */
  page: number;

  /** Whether this page was estimated from location */
  isEstimated: boolean;

  /** Formatted string with padding, e.g., "[0042]" or "~[0042]" for estimated */
  formatted: string;

  /** Formatted string without brackets, e.g., "0042" or "~0042" */
  paddedNumber: string;
}

/**
 * Get comprehensive page information including estimation status.
 *
 * @example
 * getPageInfo(42, { start: 100 })
 * // { page: 42, isEstimated: false, formatted: "[0042]", paddedNumber: "0042" }
 *
 * getPageInfo(null, { start: 160 })
 * // { page: 10, isEstimated: true, formatted: "~[0010]", paddedNumber: "~0010" }
 *
 * @param actualPage - The actual page number (may be null)
 * @param location - The clipping location object
 * @param showEstimatePrefix - Whether to prefix estimated pages with "~" (default: true)
 * @returns Complete page information
 */
export function getPageInfo(
  actualPage: number | null,
  location: { start: number },
  showEstimatePrefix: boolean = true,
): PageInfo {
  const isEstimated = actualPage === null;
  const page = getEffectivePage(actualPage, location);
  const paddedNumber = String(page).padStart(PAGE_PADDING_LENGTH, "0");

  const prefix = isEstimated && showEstimatePrefix ? "~" : "";

  return {
    page,
    isEstimated,
    formatted: `${prefix}[${paddedNumber}]`,
    paddedNumber: `${prefix}${paddedNumber}`,
  };
}
