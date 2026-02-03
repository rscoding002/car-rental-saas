'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils/cn';
import {
  Upload,
  Image as ImageIcon,
  FileVideo,
  FileText,
  Trash2,
  Search,
  Grid3X3,
  List,
  FolderOpen,
  X,
  Check,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { Media } from '@/lib/supabase/types';

// Folder options for filtering and organizing
const FOLDER_OPTIONS = [
  { value: '', label: 'All Folders' },
  { value: 'general', label: 'General' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'pages', label: 'Pages' },
  { value: 'blog', label: 'Blog' },
  { value: 'branding', label: 'Branding' },
];

// MIME type icons
function getMimeTypeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return ImageIcon;
  }
  if (mimeType.startsWith('video/')) {
    return FileVideo;
  }
  return FileText;
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// Media card component
function MediaCard({
  media,
  isSelected,
  onSelect,
  onDelete,
  viewMode,
}: {
  media: Media;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  viewMode: 'grid' | 'list';
}) {
  const isImage = media.mime_type.startsWith('image/');
  const Icon = getMimeTypeIcon(media.mime_type);

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer',
          isSelected
            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
            : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30'
        )}
        onClick={onSelect}
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-muted">
          {isImage ? (
            <img
              src={media.url}
              alt={media.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{media.filename}</p>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(media.size)}
            {media.width && media.height && ` • ${media.width}x${media.height}`}
          </p>
        </div>

        {/* Folder badge */}
        <Badge variant="outline" className="hidden sm:flex">
          {media.folder}
        </Badge>

        {/* Date */}
        <span className="hidden md:block text-sm text-muted-foreground">
          {formatDate(media.created_at)}
        </span>

        {/* Delete button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border overflow-hidden transition-all cursor-pointer',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-muted-foreground/50'
      )}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-muted">
        {isImage ? (
          <img
            src={media.url}
            alt={media.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Delete button (on hover) */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>

      {/* Info */}
      <div className="p-2 bg-card">
        <p className="text-sm font-medium truncate">{media.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(media.size)}
        </p>
      </div>
    </div>
  );
}

// Upload dropzone component
function UploadDropzone({
  onUpload,
  isUploading,
  folder,
}: {
  onUpload: (files: FileList) => void;
  isUploading: boolean;
  folder: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        onUpload(e.dataTransfer.files);
      }
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onUpload(e.target.files);
        // Reset input so the same file can be selected again
        e.target.value = '';
      }
    },
    [onUpload]
  );

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/50',
        isUploading && 'pointer-events-none opacity-60'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      ) : (
        <>
          <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-foreground font-medium mb-1">
            Drop files here or click to upload
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Images, videos, and PDFs up to 10MB
            {folder && folder !== 'general' && (
              <span className="block mt-1">
                Files will be uploaded to: <strong>{folder}</strong>
              </span>
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            Select Files
          </Button>
        </>
      )}
    </div>
  );
}

// Media detail modal
function MediaDetailModal({
  media,
  isOpen,
  onClose,
}: {
  media: Media | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = useCallback(() => {
    if (media) {
      navigator.clipboard.writeText(media.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [media]);

  if (!media) return null;

  const isImage = media.mime_type.startsWith('image/');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Media Details">
      <div className="space-y-4">
        {/* Preview */}
        <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {isImage ? (
            <img
              src={media.url}
              alt={media.filename}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center">
              {getMimeTypeIcon(media.mime_type) === FileVideo ? (
                <FileVideo className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
              ) : (
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
              )}
              <p className="text-muted-foreground">{media.mime_type}</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Filename
            </label>
            <p className="text-foreground">{media.filename}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Size
              </label>
              <p className="text-foreground">{formatFileSize(media.size)}</p>
            </div>
            {media.width && media.height && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Dimensions
                </label>
                <p className="text-foreground">
                  {media.width} x {media.height}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Folder
              </label>
              <p className="text-foreground">{media.folder}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Uploaded
              </label>
              <p className="text-foreground">{formatDate(media.created_at)}</p>
            </div>
          </div>

          {/* URL with copy */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              URL
            </label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={media.url}
                readOnly
                className="text-sm font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                title="Copy URL"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <a href={media.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" title="Open in new tab">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Loading skeleton
function MediaGridSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border">
            <Skeleton className="w-12 h-12 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
        <div key={i} className="rounded-lg border border-border overflow-hidden">
          <Skeleton className="aspect-square" />
          <div className="p-2">
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Media Library Page
export default function AdminMediaPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [uploadFolder, setUploadFolder] = useState('general');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Selection
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Media | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  // Fetch tenant ID and media on mount
  useEffect(() => {
    async function fetchData() {
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

        // Fetch media
        const { data: mediaData, error: mediaError } = await supabase
          .from('media')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .order('created_at', { ascending: false }) as { data: Media[] | null; error: Error | null };

        if (mediaError) throw mediaError;

        setMedia(mediaData || []);
      } catch (err) {
        console.error('Error fetching media:', err);
        setError('Failed to load media library');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  // Filter media based on search and folder
  const filteredMedia = media.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = !folderFilter || item.folder === folderFilter;
    return matchesSearch && matchesFolder;
  });

  // Handle file upload
  const handleUpload = useCallback(
    async (files: FileList) => {
      if (!tenantId) return;

      setIsUploading(true);
      setUploadError(null);

      try {
        const uploadPromises = Array.from(files).map(async (file) => {
          // Validate file size (10MB max)
          if (file.size > 10 * 1024 * 1024) {
            throw new Error(`File ${file.name} is too large (max 10MB)`);
          }

          // Generate unique filename
          const timestamp = Date.now();
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const storagePath = `${tenantId}/${uploadFolder}/${timestamp}-${sanitizedName}`;

          // Upload to Supabase Storage
          const { data: storageData, error: storageError } = await supabase.storage
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
              folder: uploadFolder,
            } as any)
            .select()
            .single() as { data: Media | null; error: Error | null };

          if (mediaError) throw mediaError;
          if (!mediaRecord) throw new Error('Failed to create media record');

          return mediaRecord;
        });

        const uploadedMedia = await Promise.all(uploadPromises);

        // Add to state
        setMedia((prev) => [...uploadedMedia.filter(Boolean) as Media[], ...prev]);
      } catch (err) {
        console.error('Upload error:', err);
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [tenantId, uploadFolder, supabase]
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

  // Handle delete
  const handleDelete = useCallback(
    async (mediaItem: Media) => {
      setIsDeleting(true);

      try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('media')
          .remove([mediaItem.storage_path]);

        if (storageError) {
          console.warn('Storage delete error:', storageError);
          // Continue anyway - the file might already be deleted
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from('media')
          .delete()
          .eq('id', mediaItem.id);

        if (dbError) throw dbError;

        // Remove from state
        setMedia((prev) => prev.filter((m) => m.id !== mediaItem.id));
        setDeleteTarget(null);

        if (selectedMedia?.id === mediaItem.id) {
          setSelectedMedia(null);
          setIsDetailOpen(false);
        }
      } catch (err) {
        console.error('Delete error:', err);
        setUploadError('Failed to delete file');
      } finally {
        setIsDeleting(false);
      }
    },
    [supabase, selectedMedia]
  );

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage images, videos, and files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <UploadDropzone
              onUpload={handleUpload}
              isUploading={isUploading}
              folder={uploadFolder}
            />
          </div>
          <div className="sm:w-48">
            <Select
              label="Upload to folder"
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
              options={FOLDER_OPTIONS.filter((f) => f.value !== '')}
            />
          </div>
        </div>

        {uploadError && (
          <Alert variant="destructive" onClose={() => setUploadError(null)}>
            {uploadError}
          </Alert>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="sm:w-48">
          <Select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
            options={FOLDER_OPTIONS}
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && <MediaGridSkeleton viewMode={viewMode} />}

      {/* Empty State */}
      {!isLoading && !error && filteredMedia.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-2">
            {media.length === 0
              ? 'No files uploaded yet'
              : 'No files match your search'}
          </p>
          {media.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Drag and drop files above or click to upload
            </p>
          )}
        </div>
      )}

      {/* Media Grid/List */}
      {!isLoading && !error && filteredMedia.length > 0 && (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
              : 'space-y-2'
          }
        >
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              media={item}
              isSelected={selectedMedia?.id === item.id}
              viewMode={viewMode}
              onSelect={() => {
                setSelectedMedia(item);
                setIsDetailOpen(true);
              }}
              onDelete={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      )}

      {/* Media Detail Modal */}
      <MediaDetailModal
        media={selectedMedia}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedMedia(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete File"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete{' '}
            <strong className="text-foreground">{deleteTarget?.filename}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isDeleting}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
