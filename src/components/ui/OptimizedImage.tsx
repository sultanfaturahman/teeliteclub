import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
  loading?: 'lazy' | 'eager';
}

const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop";

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK,
  className,
  onError,
  loading = 'lazy',
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    setCurrentSrc(src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn(`Image failed to load: ${currentSrc}`);
    setIsLoading(false);
    
    if (currentSrc !== fallbackSrc && !hasError) {
      console.log(`Falling back to: ${fallbackSrc}`);
      setCurrentSrc(fallbackSrc);
      setHasError(true);
    } else {
      setHasError(true);
    }
    
    onError?.(event);
  };

  // Validate and clean image URL
  const getValidImageUrl = (url: string): string => {
    if (!url) return fallbackSrc;
    
    // Handle relative URLs
    if (url.startsWith('/')) {
      return url;
    }
    
    // Handle Supabase storage URLs
    if (url.includes('supabase.co/storage/v1/object/public/')) {
      return url;
    }
    
    // Handle external URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If URL doesn't match any pattern, use fallback
    return fallbackSrc;
  };

  const validSrc = getValidImageUrl(currentSrc);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      <img
        {...props}
        src={validSrc}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          hasError && currentSrc === fallbackSrc ? "opacity-75" : "",
          className
        )}
        style={{
          ...props.style,
          display: isLoading ? 'none' : 'block'
        }}
      />
      
      {hasError && currentSrc === fallbackSrc && (
        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
          Image unavailable
        </div>
      )}
    </div>
  );
};
