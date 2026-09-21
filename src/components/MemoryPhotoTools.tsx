import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Plus,
  Star,
  Loader2,
  Volume2,
  Square,
  Mic,
  Calendar,
  MapPin,
  Tag,
} from 'lucide-react';
import { MemoryMoment } from '../types';

/**
 * Optimizes and resizes image files on client-side to prevent local storage quota overflows
 * and keep app lightweight and lightning fast.
 */
export async function optimizeImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('Failed to read image file'));
        return;
      }
      // If SVG or animated GIF, keep original data URL
      if (file.type.includes('svg') || file.type.includes('gif')) {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxWidth && height <= maxHeight && file.size < 350 * 1024) {
          resolve(result);
          return;
        }

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Component: PhotoUploadZone
 * Supports both drag-and-drop and manual file picker for multiple photos.
 */
interface PhotoUploadZoneProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  label?: string;
  helperText?: string;
  idPrefix?: string;
}

export const PhotoUploadZone: React.FC<PhotoUploadZoneProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 12,
  label = 'Upload Photos',
  helperText = 'Drag & drop multiple photos, or click to browse (JPG, PNG, WebP)',
  idPrefix = 'photo-upload',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFiles = async (fileList: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file && file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const remainingSlots = Math.max(0, maxPhotos - photos.length);
      const toProcess = validFiles.slice(0, remainingSlots);
      const optimizedUrls = await Promise.all(toProcess.map((f) => optimizeImageFile(f)));

      const nextPhotos = [...photos, ...optimizedUrls];
      onPhotosChange(nextPhotos);
    } catch (err) {
      console.error('Error processing uploaded photos:', err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updated = photos.filter((_, idx) => idx !== indexToRemove);
    onPhotosChange(updated);
  };

  const handleSetPrimaryPhoto = (indexToMakePrimary: number) => {
    if (indexToMakePrimary === 0) return;
    const target = photos[indexToMakePrimary];
    const rest = photos.filter((_, idx) => idx !== indexToMakePrimary);
    onPhotosChange([target, ...rest]);
  };

  return (
    <div id={`${idPrefix}-container`} className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-teal-800" />
          <span>{label}</span>
          {photos.length > 0 && (
            <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'} attached
            </span>
          )}
        </label>
        {photos.length > 0 && photos.length < maxPhotos && (
          <span className="text-[11px] text-stone-500">
            Can add {maxPhotos - photos.length} more
          </span>
        )}
      </div>

      {/* Drag & Drop Box */}
      <div
        id={`${idPrefix}-dropzone`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-teal-600 bg-teal-50/80 scale-[1.01]'
            : 'border-stone-300 hover:border-teal-700 bg-stone-50 hover:bg-teal-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          id={`${idPrefix}-input`}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-1.5 text-teal-900 py-1">
              <Loader2 className="w-7 h-7 animate-spin text-teal-700" />
              <span className="text-xs font-semibold">Optimizing and preparing photos...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-850 flex items-center justify-center shadow-2xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-stone-800">
                  <span className="text-teal-800 underline decoration-teal-400">Click to upload photos</span> or drag & drop here
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">{helperText}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Thumbnails Tray */}
      {photos.length > 0 && (
        <div id={`${idPrefix}-thumbnails`} className="space-y-1.5 pt-1">
          <p className="text-[11px] text-stone-500 italic">
            Tip: The first photo is the main cover. Click star to make any photo the primary cover.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {photos.map((url, idx) => {
              const isPrimary = idx === 0;
              return (
                <div
                  key={`${idx}-${url.slice(-20)}`}
                  className={`relative group rounded-xl overflow-hidden border-2 bg-stone-100 aspect-square shadow-2xs transition-all ${
                    isPrimary ? 'border-amber-400 ring-2 ring-amber-200' : 'border-stone-200'
                  }`}
                >
                  <img
                    src={url}
                    alt={`Uploaded photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />

                  {/* Primary Badge */}
                  {isPrimary && (
                    <span className="absolute top-1 left-1 bg-amber-400 text-teal-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-teal-950" />
                      <span>Cover</span>
                    </span>
                  )}

                  {/* Action Overlays */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimaryPhoto(idx);
                        }}
                        title="Set as Cover Photo"
                        className="p-1 bg-amber-400 hover:bg-amber-500 text-teal-950 rounded-lg shadow-xs"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span className="sr-only">Set cover</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto(idx);
                      }}
                      title="Remove Photo"
                      className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="sr-only">Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Component: MemoryCardPhotoGallery
 * In-card interactive photo slider and thumbnail indicators for multiple photos.
 */
interface MemoryCardPhotoGalleryProps {
  memory: MemoryMoment;
  onOpenViewer: (memory: MemoryMoment, initialIndex: number) => void;
  onAddMorePhotos?: (memory: MemoryMoment) => void;
  isCaregiverView?: boolean;
}

export const MemoryCardPhotoGallery: React.FC<MemoryCardPhotoGalleryProps> = ({
  memory,
  onOpenViewer,
  onAddMorePhotos,
  isCaregiverView,
}) => {
  const photos =
    memory.images && memory.images.length > 0
      ? memory.images
      : [memory.imageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'];

  const [activeSlide, setActiveSlide] = useState(0);

  const totalPhotos = photos.length;
  const hasMultiple = totalPhotos > 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide((prev) => (prev === 0 ? totalPhotos - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide((prev) => (prev === totalPhotos - 1 ? 0 : prev + 1));
  };

  const currentPhoto = photos[activeSlide] || photos[0];

  return (
    <div className="relative group/gallery overflow-hidden bg-stone-900 select-none">
      {/* Main Image with clickable action to open Lightbox */}
      <div
        onClick={() => onOpenViewer(memory, activeSlide)}
        className="relative h-44 sm:h-48 w-full cursor-pointer overflow-hidden"
      >
        <img
          src={currentPhoto}
          alt={`${memory.title} - photo ${activeSlide + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover/gallery:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Hover hint */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/gallery:opacity-100 transition-opacity flex items-center justify-center">
          <span className="px-3 py-1.5 bg-black/70 backdrop-blur-xs text-white text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-md">
            <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Click to View Full Screen</span>
          </span>
        </div>
      </div>

      {/* Voice Note Badge */}
      {memory.hasVoiceNote && (
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs z-10">
          <Mic className="w-3 h-3 text-amber-300" />
          <span>Spoken Voice Note</span>
        </div>
      )}

      {/* Photos Count Chip (Top Right) */}
      <div
        onClick={() => onOpenViewer(memory, activeSlide)}
        className="absolute top-2 right-2 bg-black/70 hover:bg-black/85 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs cursor-pointer z-10 transition-colors"
      >
        <ImageIcon className="w-3 h-3 text-teal-300" />
        <span>
          {hasMultiple ? `${activeSlide + 1}/${totalPhotos} Photos` : '1 Photo'}
        </span>
      </div>

      {/* Navigation Arrows for Multiple Photos */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all z-10 shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all z-10 shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dots Indicator Strip */}
          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none">
            {photos.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeSlide ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Add Photos Button (if passed) */}
      {onAddMorePhotos && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddMorePhotos(memory);
          }}
          className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-teal-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs z-10 transition-all"
        >
          <Plus className="w-3 h-3 text-teal-800" />
          <span>+ Photo</span>
        </button>
      )}
    </div>
  );
};

/**
 * Component: MemoryPhotoViewerModal
 * Full-screen accessible lightbox for viewing all photos of a memory with rich story narration.
 */
interface MemoryPhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: MemoryMoment | null;
  initialIndex?: number;
  activeReadingId?: string | null;
  onStartReading?: (id: string, text: string) => void;
  onStopReading?: () => void;
}

export const MemoryPhotoViewerModal: React.FC<MemoryPhotoViewerModalProps> = ({
  isOpen,
  onClose,
  memory,
  initialIndex = 0,
  activeReadingId,
  onStartReading,
  onStopReading,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Extract all photos
  const photos = memory
    ? memory.images && memory.images.length > 0
      ? memory.images
      : [memory.imageUrl]
    : [];

  const totalPhotos = photos.length;

  const handlePrev = useCallback(() => {
    if (totalPhotos <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? totalPhotos - 1 : prev - 1));
  }, [totalPhotos]);

  const handleNext = useCallback(() => {
    if (totalPhotos <= 1) return;
    setCurrentIndex((prev) => (prev === totalPhotos - 1 ? 0 : prev + 1));
  }, [totalPhotos]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen || !memory || photos.length === 0) return null;

  const isReading = activeReadingId === memory.id;
  const currentPhotoUrl = photos[currentIndex] || photos[0];

  const handleToggleVoice = () => {
    if (isReading) {
      onStopReading?.();
    } else {
      const fullText = `${memory.title}. ${memory.region}, ${memory.category}. ${memory.story}. ${memory.audioPrompt}`;
      onStartReading?.(memory.id, fullText);
    }
  };

  return (
    <div
      id="memory-photo-viewer-modal-overlay"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/80 to-transparent z-20 text-white">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-800 text-teal-100 flex items-center justify-center font-bold text-xs">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-white line-clamp-1">
              {memory.title}
            </h3>
            <p className="text-[11px] text-teal-200">
              {memory.region} • {memory.category} • {memory.dateLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Photo index counter */}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/20">
            {currentIndex + 1} / {totalPhotos}
          </span>

          {/* Voice Reader button */}
          {onStartReading && (
            <button
              type="button"
              id="viewer-voice-reader-btn"
              onClick={handleToggleVoice}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                isReading
                  ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                  : 'bg-amber-400 hover:bg-amber-500 text-teal-950'
              }`}
            >
              {isReading ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop Reading</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read Aloud</span>
                </>
              )}
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            id="viewer-close-btn"
            onClick={onClose}
            aria-label="Close photo viewer"
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Photo Viewing Stage */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Navigation Arrow Left */}
        {totalPhotos > 1 && (
          <button
            type="button"
            id="viewer-prev-btn"
            onClick={handlePrev}
            aria-label="Previous Photo"
            className="absolute left-3 sm:left-6 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all shadow-md active:scale-95 border border-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* The Current Photo */}
        <div className="relative max-w-5xl max-h-[68vh] sm:max-h-[72vh] w-full h-full flex items-center justify-center">
          <img
            key={currentPhotoUrl}
            src={currentPhotoUrl}
            alt={`${memory.title} - photo ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-200"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Navigation Arrow Right */}
        {totalPhotos > 1 && (
          <button
            type="button"
            id="viewer-next-btn"
            onClick={handleNext}
            aria-label="Next Photo"
            className="absolute right-3 sm:right-6 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all shadow-md active:scale-95 border border-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Tray: Story narrative & Thumbnail Strip */}
      <div className="bg-stone-950/90 border-t border-white/10 p-3 sm:p-4 z-20 max-w-4xl mx-auto w-full rounded-t-3xl backdrop-blur-md text-stone-200 space-y-3">
        {/* Story Narrative */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs sm:text-sm text-stone-100 font-serif leading-relaxed line-clamp-2 sm:line-clamp-3">
              "{memory.story}"
            </p>
            <p className="text-[11px] text-teal-300 italic mt-0.5">
              💬 {memory.audioPrompt}
            </p>
          </div>

          {memory.voiceNoteAudioUrl && (
            <div className="shrink-0 pt-1 sm:pt-0">
              <audio
                controls
                src={memory.voiceNoteAudioUrl}
                className="h-8 w-60 text-xs"
              />
            </div>
          )}
        </div>

        {/* Thumbnail Strip (if more than 1 photo) */}
        {totalPhotos > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 px-1">
            {photos.map((photo, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative rounded-lg overflow-hidden shrink-0 transition-all ${
                    isActive
                      ? 'w-14 h-14 sm:w-16 sm:h-16 ring-3 ring-amber-400 scale-105'
                      : 'w-11 h-11 sm:w-12 sm:h-12 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-amber-300 font-bold text-center">
                      Cover
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Component: AddPhotosModal
 * Allows adding more photos to an existing memory anytime.
 */
interface AddPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: MemoryMoment | null;
  onSaveUpdatedMemory: (updated: MemoryMoment) => void;
}

export const AddPhotosModal: React.FC<AddPhotosModalProps> = ({
  isOpen,
  onClose,
  memory,
  onSaveUpdatedMemory,
}) => {
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && memory) {
      const existing =
        memory.images && memory.images.length > 0
          ? memory.images
          : [memory.imageUrl];
      setPhotos(existing.filter(Boolean));
    }
  }, [isOpen, memory]);

  if (!isOpen || !memory) return null;

  const handleSave = () => {
    const updatedPhotos = photos.length > 0 ? photos : [memory.imageUrl];
    const updated: MemoryMoment = {
      ...memory,
      images: updatedPhotos,
      imageUrl: updatedPhotos[0] || memory.imageUrl,
    };
    onSaveUpdatedMemory(updated);
    onClose();
  };

  return (
    <div
      id="add-photos-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="add-photos-modal"
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="bg-teal-900 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg">
              Manage Photos for "{memory.title}"
            </h3>
            <p className="text-xs text-teal-200">
              Add new family album photos or adjust cover image
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-teal-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <PhotoUploadZone
            photos={photos}
            onPhotosChange={setPhotos}
            label="Attached Photos"
            helperText="Drag & drop new family photos or tap to browse"
            idPrefix="manage-existing-memory-photos"
          />
        </div>

        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            id="save-updated-photos-btn"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold bg-teal-850 hover:bg-teal-900 text-white rounded-xl shadow-xs"
          >
            Save Photos ({photos.length})
          </button>
        </div>
      </div>
    </div>
  );
};
