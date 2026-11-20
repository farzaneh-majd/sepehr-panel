// Types for Settings

export interface UserData {
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  email?: string
  avatarId?: number | string
}

export type SettingsTab = "profile" | "password" | "notifications" | "preferences"
