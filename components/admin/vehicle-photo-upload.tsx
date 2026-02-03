'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils/cn';
import type { VehiclePhoto } from '@/lib/supabase/types';
import {
  Upload,
  Star,
  GripVertical,
  Loader2,
  ImageIcon,
  Trash2,
} from 'lucide-react';

interface VehiclePhotoUploadProps {
  photos: VehiclePhoto[];
  onChange: (photos: VehiclePhoto[]) => void;
  tenantId?: string;
  vehicleId?: string;
  maxPhotos?: number;
  disabled?: boolean;
}

/**
 * Vehicle Photo Upload Component
 *
 * Features:
 * - Drag and drop file upload
 * - Multiple file selection
 * - Thumbnail preview with loading states
 * - Drag-and-drop reordering (desktop)
 * - Touch-based reordering (mobile)
 * - Set primary photo (displayed first in listings)
 * - Delete photos (with storage cleanup)
 * - Visual order numbers
 * - Mobile-friendly touch targets (min 44px)
 */
export function VehiclePhotoUpload({
  photos,
  onChange,
  tenantId,
  vehicleId,
  maxPhotos = 10,
  disabled = false,
}: VehiclePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Drag-and-drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Handle file selection
  const handleFiles = useCallback(
    async (files: FileList) => {
      if (!files.length) return;

      const remainingSlots = maxPhotos - photos.length;
      if (remainingSlots <= 0) {
        setError(`Maximum ${maxPhotos} photos allowed`);
        return;
      }

      // Filter to only images
      const imageFiles = Array.from(files)
        .filter((file) => file.type.startsWith('image/'))
        .slice(0, remainingSlots);

      if (imageFiles.length === 0) {
        setError('Please select image files only');
        return;
      }

      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      try {
        const newPhotos: VehiclePhoto[] = [];
        const totalFiles = imageFiles.length;

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];

          // Validate file size (5MB max per photo)
          if (file.size > 5 * 1024 * 1024) {
            throw new Error(`${file.name} is too large (max 5MB per photo)`);
          }

          // Generate unique filename
          const timestamp = Date.now();
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const folder = vehicleId || 'temp';
          const storagePath = `vehicles/${tenantId || 'unknown'}/${folder}/${timestamp}-${sanitizedName}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(storagePath);

          // Add to new photos array
          newPhotos.push({
            url: publicUrl,
            isPrimary: photos.length === 0 && i === 0, // First photo is primary
            order: photos.length + i,
          });

          // Update progress
          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
        }

        // Update photos state
        const updatedPhotos = [...photos, ...newPhotos];

        // Ensure there's exactly one primary photo
        const hasPrimary = updatedPhotos.some((p) => p.isPrimary);
        if (!hasPrimary && updatedPhotos.length > 0) {
          updatedPhotos[0].isPrimary = true;
        }

        onChange(updatedPhotos);
      } catch (err) {
        console.error('Upload error:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [photos, onChange, maxPhotos, tenantId, vehicleId, supabase]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = ''; // Reset input
      }
    },
    [handleFiles]
  );

  // Photo management functions
  const setPrimaryPhoto = useCallback(
    (index: number) => {
      const updatedPhotos = photos.map((photo, i) => ({
        ...photo,
        isPrimary: i === index,
      }));
      onChange(updatedPhotos);
    },
    [photos, onChange]
  );

  const reorderPhotos = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      if (toIndex < 0 || toIndex >= photos.length) return;

      const updatedPhotos = [...photos];
      const [movedPhoto] = updatedPhotos.splice(fromIndex, 1);
      updatedPhotos.splice(toIndex, 0, movedPhoto);

      // Update order values
      updatedPhotos.forEach((photo, i) => {
        photo.order = i;
      });

      onChange(updatedPhotos);
    },
    [photos, onChange]
  );

  // Drag-and-drop handlers for reordering
  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (disabled) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
      setDraggedIndex(index);
      // Add a slight delay to allow the drag image to be set
      setTimeout(() => {
        const el = e.target as HTMLElement;
        el.style.opacity = '0.5';
      }, 0);
    },
    [disabled]
  );

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.target as HTMLElement;
    el.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handlePhotoDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex !== null && draggedIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [draggedIndex]
  );

  const handlePhotoDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handlePhotoDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(fromIndex) && fromIndex !== toIndex) {
        reorderPhotos(fromIndex, toIndex);
      }
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [reorderPhotos]
  );

  // Touch handlers for mobile reordering
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, index: number) => {
      if (disabled) return;
      const touch = e.touches[0];
      setTouchStartY(touch.clientY);
      setDraggedIndex(index);
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (draggedIndex === null || touchStartY === null) return;

      const touch = e.touches[0];
      const currentY = touch.clientY;

      // Find which photo the touch is over
      for (let i = 0; i < photoRefs.current.length; i++) {
        const ref = photoRefs.current[i];
        if (ref && i !== draggedIndex) {
          const rect = ref.getBoundingClientRect();
          if (currentY >= rect.top && currentY <= rect.bottom) {
            setDragOverIndex(i);
            break;
          }
        }
      }
    },
    [draggedIndex, touchStartY]
  );

  const handleTouchEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      reorderPhotos(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTouchStartY(null);
  }, [draggedIndex, dragOverIndex, reorderPhotos]);

  const deletePhoto = useCallback(
    async (index: number) => {
      const photo = photos[index];
      const updatedPhotos = photos.filter((_, i) => i !== index);

      // If deleted photo was primary, make first remaining photo primary
      if (photo.isPrimary && updatedPhotos.length > 0) {
        updatedPhotos[0].isPrimary = true;
      }

      // Update order values
      updatedPhotos.forEach((p, i) => {
        p.order = i;
      });

      onChange(updatedPhotos);

      // Try to delete from storage (don't fail if it doesn't work)
      try {
        const urlParts = photo.url.split('/');
        const storagePath = urlParts.slice(urlParts.indexOf('media') + 1).join('/');
        if (storagePath) {
          await supabase.storage.from('media').remove([storagePath]);
        }
      } catch (err) {
        console.warn('Could not delete photo from storage:', err);
      }
    },
    [photos, onChange, supabase]
  );

  const canUploadMore = photos.length < maxPhotos;

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      {canUploadMore && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/50',
            (isUploading || disabled) && 'pointer-events-none opacity-60'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled || isUploading}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
              <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">
                Drop photos here or click to upload
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                JPG, PNG up to 5MB each • {photos.length}/{maxPhotos} photos
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
              >
                Select Photos
              </Button>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo, index) => (
            <div
              key={photo.url}
              ref={(el) => {
                photoRefs.current[index] = el;
              }}
              draggable={!disabled && photos.length > 1}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handlePhotoDragOver(e, index)}
              onDragLeave={handlePhotoDragLeave}
              onDrop={(e) => handlePhotoDrop(e, index)}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={cn(
                'relative group rounded-lg overflow-hidden border-2 transition-all select-none',
                photo.isPrimary ? 'border-primary' : 'border-border',
                draggedIndex === index && 'opacity-50 scale-95',
                dragOverIndex === index && 'border-primary border-dashed ring-2 ring-primary/30',
                !disabled && photos.length > 1 && 'cursor-grab active:cursor-grabbing'
              )}
            >
              {/* Photo */}
              <div className="aspect-[4/3] relative bg-muted">
                <Image
                  src={photo.url}
                  alt={`Vehicle photo ${index + 1}`}
                  fill
                  className="object-cover pointer-events-none"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  draggable={false}
                />
              </div>

              {/* Drag handle indicator */}
              {!disabled && photos.length > 1 && (
                <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded text-white opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4" />
                </div>
              )}

              {/* Primary badge */}
              {photo.isPrimary && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded">
                  <Star className="w-3 h-3 fill-current" />
                  Primary
                </div>
              )}

              {/* Order number badge */}
              <div className="absolute bottom-2 left-2 w-6 h-6 flex items-center justify-center bg-black/60 text-white text-xs font-medium rounded-full">
                {index + 1}
              </div>

              {/* Actions overlay - desktop */}
              <div className="hidden sm:flex absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-2">
                {/* Set as primary */}
                {!photo.isPrimary && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimaryPhoto(index);
                    }}
                    title="Set as primary"
                    disabled={disabled}
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}

                {/* Delete */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-9 w-9"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePhoto(index);
                  }}
                  title="Delete photo"
                  disabled={disabled}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Mobile actions (always visible) */}
              <div className="sm:hidden absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                  {!photo.isPrimary ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrimaryPhoto(index);
                      }}
                      className="text-white text-xs flex items-center gap-1 min-h-[44px] min-w-[44px] justify-center"
                      disabled={disabled}
                    >
                      <Star className="w-4 h-4" />
                      Primary
                    </button>
                  ) : (
                    <span className="text-xs text-white/80 px-2">Primary</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhoto(index);
                    }}
                    className="text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    disabled={disabled}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && !canUploadMore && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No photos uploaded</p>
        </div>
      )}

      {/* Help text */}
      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: The primary photo appears first in listings.
          {photos.length > 1 && ' Drag photos to reorder them.'}
        </p>
      )}
    </div>
  );
}
