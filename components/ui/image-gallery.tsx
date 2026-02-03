'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';

export interface GalleryImage {
  url: string;
  alt?: string;
  thumbnail?: string;
}

interface ImageGalleryProps {
  /** Array of images to display */
  images: GalleryImage[];
  /** Initial active image index */
  initialIndex?: number;
  /** Aspect ratio for main image */
  aspectRatio?: 'square' | 'video' | 'wide' | 'auto';
  /** Show thumbnails strip */
  showThumbnails?: boolean;
  /** Thumbnail position */
  thumbnailPosition?: 'bottom' | 'left' | 'right';
  /** Max thumbnails to show before scrolling */
  maxThumbnails?: number;
  /** Enable lightbox on click */
  enableLightbox?: boolean;
  /** Show navigation arrows */
  showArrows?: boolean;
  /** Show image counter */
  showCounter?: boolean;
  /** Additional class names for container */
  className?: string;
  /** Callback when active image changes */
  onImageChange?: (index: number) => void;
}

interface LightboxProps {
  images: GalleryImage[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Lightbox Component
 * Full-screen image viewer with navigation
 */
function Lightbox({ images, activeIndex, onClose, onNavigate }: LightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onNavigate((activeIndex - 1 + images.length) % images.length);
          break;
        case 'ArrowRight':
          onNavigate((activeIndex + 1) % images.length);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, images.length, onClose, onNavigate]);

  // Reset zoom when image changes
  useEffect(() => {
    setZoom(1);
  }, [activeIndex]);

  const currentImage = images[activeIndex];

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 0.5));
  const handleResetZoom = () => setZoom(1);

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Toolbar - with safe area padding */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        {/* Counter */}
        <div className="rounded-full bg-black/50 px-4 py-2 text-sm text-white">
          {activeIndex + 1} / {images.length}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleResetZoom();
            }}
            className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            aria-label="Reset zoom"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            aria-label="Close lightbox"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows - touch-friendly sizes */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((activeIndex - 1 + images.length) % images.length);
            }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 sm:p-4 text-white hover:bg-black/70 active:bg-black/80 transition-colors touch-manipulation"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((activeIndex + 1) % images.length);
            }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 sm:p-4 text-white hover:bg-black/70 active:bg-black/80 transition-colors touch-manipulation"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </>
      )}

      {/* Main Image */}
      <div
        className="relative max-h-[80vh] max-w-[90vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `scale(${zoom})`,
          transition: 'transform 0.2s ease-out',
        }}
      >
        <Image
          src={currentImage.url}
          alt={currentImage.alt || `Image ${activeIndex + 1}`}
          width={1200}
          height={800}
          className="max-h-[80vh] w-auto object-contain"
          priority
        />
      </div>

      {/* Thumbnail Strip - with safe area padding */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex gap-2 overflow-x-auto max-w-full px-4 py-2 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(index);
                }}
                className={cn(
                  'relative h-12 w-16 flex-shrink-0 overflow-hidden rounded transition-all',
                  activeIndex === index
                    ? 'ring-2 ring-white'
                    : 'opacity-50 hover:opacity-100'
                )}
              >
                <Image
                  src={image.thumbnail || image.url}
                  alt={image.alt || `Thumbnail ${index + 1}`}
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (!mounted) return null;

  return createPortal(lightboxContent, document.body);
}

/**
 * Image Gallery Component
 *
 * Displays a gallery of images with thumbnails and optional lightbox.
 * Mobile-first responsive design.
 *
 * Features:
 * - Main image display with aspect ratio options
 * - Thumbnail strip (bottom, left, or right)
 * - Lightbox with zoom and navigation
 * - Keyboard navigation support
 * - Touch-friendly swipe (via arrows)
 */
export function ImageGallery({
  images,
  initialIndex = 0,
  aspectRatio = 'video',
  showThumbnails = true,
  thumbnailPosition = 'bottom',
  maxThumbnails = 6,
  enableLightbox = true,
  showArrows = true,
  showCounter = true,
  className,
  onImageChange,
}: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Handle image change
  const handleImageChange = useCallback(
    (index: number) => {
      setActiveIndex(index);
      onImageChange?.(index);
    },
    [onImageChange]
  );

  // Navigate to previous/next
  const goToPrev = useCallback(() => {
    handleImageChange((activeIndex - 1 + images.length) % images.length);
  }, [activeIndex, images.length, handleImageChange]);

  const goToNext = useCallback(() => {
    handleImageChange((activeIndex + 1) % images.length);
  }, [activeIndex, images.length, handleImageChange]);

  // Handle keyboard navigation when not in lightbox
  useEffect(() => {
    if (lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, goToPrev, goToNext]);

  if (images.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-muted',
          aspectRatio === 'square' && 'aspect-square',
          aspectRatio === 'video' && 'aspect-video',
          aspectRatio === 'wide' && 'aspect-[21/9]',
          className
        )}
      >
        <p className="text-muted-foreground">No images</p>
      </div>
    );
  }

  const currentImage = images[activeIndex];

  // Aspect ratio classes
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
    auto: '',
  };

  // Thumbnail layout classes
  const isVerticalThumbnails =
    thumbnailPosition === 'left' || thumbnailPosition === 'right';

  return (
    <div
      className={cn(
        'flex gap-3',
        isVerticalThumbnails ? 'flex-row' : 'flex-col',
        thumbnailPosition === 'right' && 'flex-row-reverse',
        className
      )}
    >
      {/* Thumbnails (left/right position) */}
      {showThumbnails && isVerticalThumbnails && images.length > 1 && (
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px]">
          {images.slice(0, maxThumbnails).map((image, index) => (
            <button
              key={index}
              onClick={() => handleImageChange(index)}
              className={cn(
                'relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg transition-all',
                activeIndex === index
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'opacity-70 hover:opacity-100'
              )}
            >
              <Image
                src={image.thumbnail || image.url}
                alt={image.alt || `Thumbnail ${index + 1}`}
                fill
                loading="lazy"
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
          {images.length > maxThumbnails && (
            <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              +{images.length - maxThumbnails}
            </div>
          )}
        </div>
      )}

      {/* Main Image Container */}
      <div className="relative flex-1">
        <div
          className={cn(
            'relative overflow-hidden rounded-xl bg-muted',
            aspectClasses[aspectRatio],
            enableLightbox && 'cursor-zoom-in'
          )}
          onClick={() => enableLightbox && setLightboxOpen(true)}
        >
          <Image
            src={currentImage.url}
            alt={currentImage.alt || `Image ${activeIndex + 1}`}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
          />

          {/* Navigation Arrows */}
          {showArrows && images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrev();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {showCounter && images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/80 backdrop-blur-sm px-3 py-1 text-sm">
              {activeIndex + 1} / {images.length}
            </div>
          )}

          {/* Zoom Hint */}
          {enableLightbox && (
            <div className="absolute top-3 right-3 rounded-full bg-background/80 backdrop-blur-sm p-2 opacity-0 hover:opacity-100 transition-opacity">
              <ZoomIn className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails (bottom position) */}
      {showThumbnails && thumbnailPosition === 'bottom' && images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, maxThumbnails).map((image, index) => (
            <button
              key={index}
              onClick={() => handleImageChange(index)}
              className={cn(
                'relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg transition-all',
                activeIndex === index
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'opacity-70 hover:opacity-100'
              )}
            >
              <Image
                src={image.thumbnail || image.url}
                alt={image.alt || `Thumbnail ${index + 1}`}
                fill
                loading="lazy"
                className="object-cover"
                sizes="96px"
              />
            </button>
          ))}
          {images.length > maxThumbnails && (
            <button
              onClick={() => setLightboxOpen(true)}
              className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              +{images.length - maxThumbnails} more
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          activeIndex={activeIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={handleImageChange}
        />
      )}
    </div>
  );
}
