/**
 * Floorplan Service - Manages floorplan images with preloading and fallback
 */

import { logger } from '../utils/logger';

// Fallback image when floorplan is not available
export const FALLBACK_FLOORPLAN = import.meta.env.BASE_URL + 'floorplans/no-floorplan-available.svg';

// Cache for preloaded images with LRU eviction
const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();
const cacheAccessOrder = new Set<string>();

// Memory management: Limit cache to prevent 400+ images in GPU memory
const MAX_CACHED_IMAGES = 10; // Only keep 10 floorplans in memory at once

function evictLRUImages() {
  if (imageCache.size <= MAX_CACHED_IMAGES) return;
  
  // Remove oldest images until we're under the limit
  const accessOrderArray = Array.from(cacheAccessOrder);
  const toEvict = accessOrderArray.slice(0, imageCache.size - MAX_CACHED_IMAGES);
  
  toEvict.forEach(url => {
    const img = imageCache.get(url);
    if (img) {
      // Clean up image resources
      img.src = '';
      imageCache.delete(url);
      cacheAccessOrder.delete(url);
      console.log(`🗑️ Evicted floorplan from cache: ${url.split('/').pop()}`);
    }
  });
}

/**
 * Generate a stable key for floorplan based on building, floor, and unit IDs
 */
export function generateFloorplanKey(
  building: string,
  floor: string,
  unitId: string
): string {
  // Create a stable key using the three identifiers
  return `${building}_${floor}_${unitId}`.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Preload an image and cache it
 */
export async function preloadImage(url: string): Promise<HTMLImageElement> {
  // Update access order for LRU if already cached
  if (imageCache.has(url)) {
    cacheAccessOrder.delete(url);
    cacheAccessOrder.add(url);
    return imageCache.get(url)!;
  }

  // Return existing loading promise if image is being loaded
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  // Create loading promise
  const loadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Add to cache and update access order
      imageCache.set(url, img);
      cacheAccessOrder.delete(url);
      cacheAccessOrder.add(url);
      
      // Evict old images to stay under memory limit
      evictLRUImages();
      
      loadingPromises.delete(url);
      
      console.log(`✅ Cached floorplan (${imageCache.size}/${MAX_CACHED_IMAGES}): ${url.split('/').pop()}`);
      resolve(img);
    };
    
    img.onerror = () => {
      loadingPromises.delete(url);
      // Don't cache failed loads
      reject(new Error(`Failed to load image: ${url}`));
    };
    
    img.src = url;
  });

  loadingPromises.set(url, loadingPromise);
  return loadingPromise;
}

/**
 * Preload all floorplans for a specific floor
 */
export async function preloadFloorFloorplans(
  units: Array<{ floorplan_url?: string }>
): Promise<void> {
  const urls = units
    .map(unit => unit.floorplan_url)
    .filter((url): url is string => !!url);

  // Preload all images in parallel
  const promises = urls.map(url => 
    preloadImage(url).catch(() => {
      logger.warn('FLOORPLAN', '⚠️', `Failed to preload floorplan: ${url}`);
    })
  );

  await Promise.all(promises);
}

/**
 * Get floorplan URL with fallback and proper base URL handling
 */
export function getFloorplanUrl(
  floorplanUrl: string | null | undefined,
  fallbackUrl: string = FALLBACK_FLOORPLAN
): string {
  if (!floorplanUrl) {
    return fallbackUrl;
  }
  
  // If it's already a full URL, return as-is
  if (floorplanUrl.startsWith('http://') || floorplanUrl.startsWith('https://')) {
    return floorplanUrl;
  }
  
  // Handle relative paths with proper base URL
  let normalizedPath = floorplanUrl;
  
  // Remove leading slash if present since BASE_URL includes trailing slash
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.substring(1);
  }
  
  // Combine with base URL - Vite handles URL encoding automatically
  const finalUrl = import.meta.env.BASE_URL + normalizedPath;
  return finalUrl;
}

/**
 * Check if an image is already cached
 */
export function isImageCached(url: string): boolean {
  return imageCache.has(url);
}

/**
 * Clear the image cache (useful for memory management)
 */
export function clearImageCache(): void {
  imageCache.clear();
  loadingPromises.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    cachedImages: imageCache.size,
    loadingImages: loadingPromises.size,
    totalMemoryEstimate: Array.from(imageCache.values()).reduce((total, img) => {
      // Rough estimate: width * height * 4 bytes per pixel
      return total + (img.width * img.height * 4);
    }, 0)
  };
}