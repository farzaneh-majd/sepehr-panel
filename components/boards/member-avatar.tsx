"use client";

import { useEffect } from "react";
import { useAvatar } from "@/context/AvatarContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MemberAvatar({
  member,
  className,
  fallbackClassName,
}: {
  member: { firstName?: string | null; lastName?: string | null; avatarId?: number | null };
  className?: string;
  fallbackClassName?: string;
}) {
  const { getAvatarUrl, preloadAvatar } = useAvatar();
  const avatarUrl = getAvatarUrl(member.avatarId);

  useEffect(() => {
    if (member.avatarId) preloadAvatar(member.avatarId);
  }, [member.avatarId, preloadAvatar]);

  return (
    <Avatar className={className} title={`${member.firstName || ""} ${member.lastName || ""}`.trim()}>
      {avatarUrl && <AvatarImage src={avatarUrl} className="object-cover" />}
      <AvatarFallback className={fallbackClassName}>
        {(member.firstName?.[0] || "") + (member.lastName?.[0] || "")}
      </AvatarFallback>
    </Avatar>
  );
}
