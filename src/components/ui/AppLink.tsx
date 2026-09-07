import NextLink from "next/link";
import type { ComponentProps } from "react";

/** 业务导航默认不预取目标页 RSC，避免列表一屏打出十几条 `_rsc`。 */
export function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
