export interface JwtPayload {
  exp: number
  [key: string]: unknown
}

export interface LoginInputs {
  username: string
  password: string
}
