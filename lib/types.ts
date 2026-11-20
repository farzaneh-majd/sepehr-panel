export type User = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  password: string;
  avatarUrl?: string | null;
  role?: string | null;
  isActive?: boolean;
  deactivatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  userId: number;
  boardId?: number | null;
  isArchived?: boolean | null;
  isPublic?: boolean | null;
  isBillable?: boolean | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Task = {
  id: number;
  name: string;
  description?: string | null;
  projectId: number;
  userId: number;
  cardId?: number | null;
  isCompleted?: boolean | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type TimeEntry = {
  id: number;
  description?: string | null;
  userId: number;
  projectId?: number | null;
  taskId?: number | null;
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
  isBillable?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  source?: string | null;  
  originalDuration?: number | null;
};

export type Tag = {
  id: number;
  name: string;
  color?: string | null;
  userId: number;
  createdAt?: string | null;
};

export type TimeEntryWithRelations = TimeEntry & {
  project?: Project | null;
  task?: Task | null;
  tags?: Tag[];
};
