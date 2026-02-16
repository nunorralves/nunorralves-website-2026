import NextImage from "next/image";
import type { ImageProps as NextImageProps } from "next/image";

interface ImageProps extends NextImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

const Image = ({
  src,
  alt,
  width,
  height,
  className,
  ...props
}: ImageProps) => {
  // Check if src is already an absolute URL or starts with /
  const imageSrc =
    src.startsWith("http") || src.startsWith("/") ? src : `/images/${src}`;

  return (
    <NextImage
      src={imageSrc}
      alt={alt}
      width={width || 800}
      height={height || 400}
      className={className}
      {...props}
    />
  );
};

export default Image;
