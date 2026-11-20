"use client";

import { UserProvider } from "@/context/UserContext";
import { AvatarProvider } from "@/context/AvatarContext";
import { FileBlobProvider } from "@/context/FileBlobContext";
import { useEffect } from "react";
import { initPwa } from "@/hooks/use-pwa-install";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPwa();
  }, []);

  return (
    <UserProvider>
      <AvatarProvider>
        <FileBlobProvider>{children}</FileBlobProvider>
      </AvatarProvider>
    </UserProvider>
  );
}
