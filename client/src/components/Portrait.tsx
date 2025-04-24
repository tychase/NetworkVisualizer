import { useState } from 'react';

interface PortraitProps {
  urls: string;
  alt?: string;
  className?: string;
}

/**
 * Portrait component that handles fallback image loading
 * 
 * The component takes a pipe-separated list of URLs and tries each one in order.
 * If all URLs fail, it falls back to a placeholder silhouette.
 */
export function Portrait({ urls, alt = "Portrait", className = "h-16 w-16 rounded-full object-cover bg-gray-200" }: PortraitProps) {
  // Start with the first URL in the pipe-separated list
  const [src, setSrc] = useState(urls?.split('|')[0] || '');
  
  const handleError = () => {
    // If current URL fails, try the fallback URL
    const urlParts = urls?.split('|') || [];
    const fallback = urlParts[1];
    
    if (fallback && src !== fallback) {
      // Try the fallback URL
      setSrc(fallback);
    } else {
      // If both primary and fallback fail, use a placeholder silhouette
      setSrc('/img/placeholder.svg');
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}

export default Portrait;