"use client";

import Image from "next/image";

export function BrandMark({ size = 48 }: { size?: number }) {
  return (
    <Image
      src="/myFolks_logo.jpg"
      alt="myFolks"
      width={size}
      height={size}
      className="brand-logo-image"
    />
  );
}