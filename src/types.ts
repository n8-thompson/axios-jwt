type Token = string

interface ICustomCookieStructure {
  original: IOriginalCookieStructure
  userId: number
  expiration: number
  accessToken: string
  refreshToken: string
}

interface IOriginalCookieStructure {
  authenticated: IAuthenticated
}

interface IAuthenticated {
  authenticator?: string
  exp?: string
  token?: string
  refreshToken?: string
  tokenData?: {
    company_week_type?: string
    default_schedule?: string
    exp: string
    is_pet_parent: boolean
    typ: string
    user_email: string
    user_id: number
  }
}

type TokenRefreshRequest = (refreshToken: Token) => Promise<Token>

interface IAuthTokenInterceptorConfig {
  header: string
  requestRefresh: TokenRefreshRequest
}

export { Token, IOriginalCookieStructure, ICustomCookieStructure, TokenRefreshRequest, IAuthTokenInterceptorConfig }
