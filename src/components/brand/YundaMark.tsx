"use client";

import Image from "next/image";

export function YundaMark({
    className = "h-11 w-11 md:h-12 md:w-12",
}: {
  className?: string;
}) {
  return (
    <Image
      src="/images/yunda-mark.png"
      alt="YUNDA"
      width={256}
      height={256}
      className={`object-contain ${className}`}
      priority
    />
  );
}
