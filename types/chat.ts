export type ChannelType = 'public' | 'private' | 'project' | 'task' | 'direct';

export type Channel = {
  id: number;
  name: string;
  description?: string | null;
  type: ChannelType;
  isArchived?: boolean;
  projectId?: number | null;
  taskId?: number | null;
  createdBy: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ChannelMember = {
  id: number;
  channelId: number;
  userId: number;
  role?: string | null;
  lastReadAt?: string | null;
  createdAt?: string | null;
};

export type Message = {
  id: number;
  content: string;
  channelId: number;
  userId: number;
  parentId?: number | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MessageReaction = {
  id: number;
  messageId: number;
  userId: number;
  emoji: string;
  createdAt?: string | null;
};

export type MessageAttachment = {
  id: number;
  messageId: number;
  name: string;
  url: string;
  type?: string | null;
  size?: number | null;
  createdAt?: string | null;
};

export type DirectMessage = {
  id: number;
  user1Id: number;
  user2Id: number;
  channelId: number;
  createdAt?: string | null;
};

// Extended types with relations
export type ChannelWithDetails = Channel & {
  memberCount?: number;
  unreadCount?: number;
  lastMessage?: MessageWithUser | null;
};

export type MessageWithUser = Message & {
  user: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  reactions?: (MessageReaction & { user: { id: number; firstName?: string | null; lastName?: string | null } })[];
  attachments?: MessageAttachment[];
  replyCount?: number;
};

export type ChannelMemberWithUser = ChannelMember & {
  user: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    avatarUrl?: string | null;
  };
};

export type UserForChat = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
};
