import React from 'react';

export const ImageComponent = ({ imageFile, altText, size, alignment }) => {
  if (!imageFile) {
    return <div className="text-red-500 text-center text-lg">
      <img
        src={`/noimage.png`}
        alt={'no image'}
        className={`w-64 inline-block`}
      />
    </div>;
  }

  const sizeClassMap = {
    small: "w-32",
    medium: "w-[254px]",
    large: "w-96",
    full: "w-full"
  };

  const alignmentClassMap = {
    left: "text-left",
    center: "text-center",
    right: "text-right"
  };

  return (
    <div className={`w-full h-full ${alignmentClassMap[alignment]}`}>
      <img
        src={`https://africellcloud.sharepoint.com/${imageFile}`}
        alt={altText}
        className={`${sizeClassMap[size]} inline-block`}
      />
    </div>
  );
}
