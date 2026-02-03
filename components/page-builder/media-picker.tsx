'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import {
  Search,
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import type { Media } from '@/lib/supabase/types';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: Media) => void;
  title?: string;
  allowedTypes?: string[]; // e.g., ['image/jpeg', 'image/png']
  currentValue?: string; // Current selected URL
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Image',
  allowedTypes,
  currentValue,
}: MediaPickerProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Find currently selected media
  useEffect(() => {
    if (currentValue && media.length > 0) {
      const current = media.find((m) => m.url === currentValue);
      if (current) {
        setSelectedMedia(current);
      }
    }
  }, [currentValue, media]);

  // Fetch media when modal opens
  useEffect(() => {
    if (!isOpen) return;

    async function fetchMedia() {
      setIsLoading(true);
      setError(null);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not authenticated');
          return;
        }

        // Get tenant ID
        const { data: profile } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('auth_id', user.id)
          .single() as { data: { tenant_id: string } | null };

        if (!profile?.tenant_id) {
          setError('No tenant found');
          return;
        }

        setTenantId(profile.tenant_id);

        // Build query
        let query = supabase
          .from('media')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .order('created_at', { ascending: false });

        // Filter by allowed types if specified
        if (allowedTypes && allowedTypes.length > 0) {
          // Filter for images by default (most common use case)
          query = query.like('mime_type', 'image/%');
        }

        const { data: mediaData, error: mediaError } = await query as {
          data: Media[] | null;
          error: Error | null;
        };

        if (mediaError) throw mediaError;

        setMedia(mediaData || []);
      } catch (err) {
        console.error('Error fetching media:', err);
        setError('Failed to load media library');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMedia();
  }, [isOpen, supabase, allowedTypes]);

  // Filter media based on search
  const filteredMedia = media.filter(
    (item) =>
      !searchQuery ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle file upload
  const handleUpload = useCallback(
    async (files: FileList) => {
      if (!tenantId || files.length === 0) return;

      const file = files[0];
      setIsUploading(true);
      setUploadError(null);

      try {
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File is too large (max 10MB)');
        }

        // Validate file type if allowed types specified
        if (allowedTypes && !allowedTypes.some((type) => file.type.match(type.replace('*', '.*')))) {
          throw new Error('File type not allowed');
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${tenantId}/general/${timestamp}-${sanitizedName}`;

        // Upload to Supabase Storage
        const { error: storageError } = await supabase.storage
          .from('media')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (storageError) throw storageError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(storagePath);

        // Get image dimensions if it's an image
        let width: number | null = null;
        let height: number | null = null;

        if (file.type.startsWith('image/')) {
          const dimensions = await getImageDimensions(file);
          width = dimensions.width;
          height = dimensions.height;
        }

        // Insert record into media table
        const { data: mediaRecord, error: mediaError } = await supabase
          .from('media')
          .insert({
            tenant_id: tenantId,
            filename: file.name,
            storage_path: storagePath,
            url: publicUrl,
            mime_type: file.type,
            size: file.size,
            width,
            height,
            folder: 'general',
          } as any)
          .select()
          .single() as { data: Media | null; error: Error | null };

        if (mediaError) throw mediaError;
        if (!mediaRecord) throw new Error('Failed to create media record');

        // Add to state and select
        setMedia((prev) => [mediaRecord, ...prev]);
        setSelectedMedia(mediaRecord);
      } catch (err) {
        console.error('Upload error:', err);
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
        // Reset input
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    },
    [tenantId, allowedTypes, supabase]
  );

  // Get image dimensions helper
  function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Handle confirm selection
  const handleConfirm = useCallback(() => {
    if (selectedMedia) {
      onSelect(selectedMedia);
      onClose();
    }
  }, [selectedMedia, onSelect, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSelectedMedia(null);
    setUploadError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="xl">
      <div className="flex flex-col h-[60vh] min-h-[400px]">
        {/* Header with search and upload */}
        <div className="flex flex-col sm:flex-row gap-3 pb-4 border-b border-border">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Upload button */}
          <div className="flex-shrink-0">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload New
            </Button>
          </div>
        </div>

        {/* Upload error */}
        {uploadError && (
          <div className="mt-3 p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center justify-between">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Media grid */}
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
              <p>
                {media.length === 0
                  ? 'No images uploaded yet'
                  : 'No images match your search'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredMedia.map((item) => {
                const isSelected = selectedMedia?.id === item.id;
                const isCurrent = currentValue === item.url;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMedia(item)}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20'
                        : isCurrent
                        ? 'border-primary/50'
                        : 'border-transparent hover:border-muted-foreground/50'
                    )}
                  >
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-5 h-5" />
                        </div>
                      </div>
                    )}

                    {/* Current indicator */}
                    {isCurrent && !isSelected && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-primary/90 text-primary-foreground text-xs rounded">
                        Current
                      </div>
                    )}

                    {/* Filename tooltip on hover */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate">{item.filename}</p>
                      <p className="text-white/70 text-xs">{formatFileSize(item.size)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with selected info and actions */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Selected info */}
          <div className="text-sm text-muted-foreground">
            {selectedMedia ? (
              <span>
                Selected: <strong className="text-foreground">{selectedMedia.filename}</strong>
                {selectedMedia.width && selectedMedia.height && (
                  <span className="ml-2">
                    ({selectedMedia.width}x{selectedMedia.height})
                  </span>
                )}
              </span>
            ) : (
              <span>No image selected</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedMedia}
              className="flex-1 sm:flex-none"
            >
              Select Image
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Convenience component: Image field with picker button
interface ImageFieldProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  hint?: string;
}

export function ImageField({
  label,
  value,
  onChange,
  placeholder = 'Enter image URL or select from library',
  hint,
}: ImageFieldProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleSelect = useCallback(
    (media: Media) => {
      onChange(media.url);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      <div className="flex gap-2">
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsPickerOpen(true)}
          title="Browse media library"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            title="Clear image"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {/* Preview */}
      {value && (
        <div className="mt-2 relative w-full max-w-xs aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <MediaPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSelect}
        currentValue={value}
      />
    </div>
  );
}
