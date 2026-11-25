// Types for Settings

export interface UserData {
  username?: string
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  email?: string
  avatarId?: number | string
}

export type SettingsTab = "profile" | "password" | "notifications" | "preferences"
