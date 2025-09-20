
import { getInitials } from '@/utils/constants';
import { Avatar } from '@material-tailwind/react';
import React, { useState } from 'react';

export default function FallBackAvatar({ src, alt, className, isDark, fontSize = '' }) {
    const [error, setError] = useState(false)

  return (
    <div>
     {  error || !src ? (
    <span className={`flex ${isDark ? `text-primary border-2 border-background ${fontSize}` : 'text-white border-2 border-background'} shadow-md justify-center items-center rounded-full ${className}`}>{getInitials(alt)}</span>
  ) : (
    <Avatar
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={` ${className}`}
    />
  )}
    </div>
  );
}
