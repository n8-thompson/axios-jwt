import { AxiosInstance, AxiosRequestConfig } from 'axios'
// import jwtDecode from 'jwt-decode'

// a little time before expiration to try refresh (seconds)
const EXPIRE_FUDGE = 10
export const STORAGE_KEY = 'ember_simple_auth-session'

type Token = string
export interface IAuthTokens {
  accessToken: IAccessToken
  refreshToken: Token
}

export interface IAccessToken {
  value: Token
  exp: string
}

// EXPORTS

/**
 * Checks if refresh tokens are stored
 * @returns Whether the user is logged in or not
 */
export const isLoggedIn = (): boolean => {
  const token = getRefreshToken()
  return !!token
}

/**
 * Sets the access and refresh tokens
 * @param {IAuthTokens} tokens - Access and Refresh tokens
 */
export const setAuthTokens = (tokens: IAuthTokens): void => {
  const COOKIE_PREFIX = `${STORAGE_KEY}=`
  const COOKIES_SEPARATOR = '; '

  // Deconstruct cookies
  const cookies = document.cookie.split(COOKIES_SEPARATOR)
  const cookieIndex = cookies.findIndex((el) => el.includes(COOKIE_PREFIX))
  const cookieContent = cookies[cookieIndex].replace(COOKIE_PREFIX, '')
  const contentDecoded = decodeURIComponent(cookieContent)

  // Modify target cookie
  let newCookie
  newCookie = JSON.parse(contentDecoded)
  newCookie.authenticated.token = tokens.accessToken
  newCookie.authenticated.refresh_token = tokens.refreshToken // I THINK THIS ISN'T NEEDED ?

  // Reconstruct cookies
  newCookie = JSON.stringify(newCookie)
  newCookie = encodeURIComponent(newCookie)
  newCookie = `${COOKIE_PREFIX}${newCookie}`
  let newCookies
  newCookies = [...cookies.slice(0, cookieIndex - 1), newCookie, ...cookies.slice(cookieIndex + 1)]
  newCookies = newCookies.join(COOKIES_SEPARATOR)
  document.cookie = newCookies
}

/**
 * Sets the access token
 * @param {string} token - Access token
 */
export const setAccessToken = (token: Token): void => {
  const tokens = getAuthTokens()
  if (!tokens) {
    throw new Error('Unable to update access token since there are not tokens currently stored')
  }

  tokens.accessToken.value = token
  setAuthTokens(tokens)
}

/**
 * Clears both tokens
 */
export const clearAuthTokens = (): void => localStorage.removeItem(STORAGE_KEY)

/**
 * Returns the stored refresh token
 * @returns {string} Refresh token
 */
export const getRefreshToken = (): Token | undefined => {
  const tokens = getAuthTokens()
  return tokens ? tokens.refreshToken : undefined
}

/**
 * Returns the stored access token
 * @returns {string} Access token
 */
export const getAccessToken = (): Token | undefined => {
  const tokens = getAuthTokens()
  console.log('getAccessToken(): ', tokens)
  return tokens ? tokens.accessToken.value : undefined
}

export const getAccessTokenExpiration = (): string | undefined => {
  const tokens = getAuthTokens()
  console.log('getAccessToken(): ', tokens)
  return tokens ? tokens.accessToken.exp : undefined
}

/**
 * @callback requestRefresh
 * @param {string} refreshToken - Token that is sent to the backend
 * @returns {Promise} Promise that resolves in an access token
 */

/**
 * Gets the current access token, exchanges it with a new one if it's expired and then returns the token.
 * @param {requestRefresh} requestRefresh - Function that is used to get a new access token
 * @returns {string} Access token
 */
export const refreshTokenIfNeeded = async (requestRefresh: TokenRefreshRequest): Promise<Token | undefined> => {
  // use access token (if we have it)
  let accessToken = getAccessToken()
  let expiration = getAccessTokenExpiration()

  let shouldRefresh = tokenIsExpiredOrIsAboutExpire(Number(expiration))
  console.log('shouldRefresh: ', shouldRefresh)
  if (accessToken && shouldRefresh) {
    accessToken = await refreshToken(requestRefresh)
  }

  return accessToken
}

/**
 *
 * @param {Axios} axios - Axios instance to apply the interceptor to
 * @param {IAuthTokenInterceptorConfig} config - Configuration for the interceptor
 */
export const applyAuthTokenInterceptor = (axios: AxiosInstance, config: IAuthTokenInterceptorConfig): void => {
  if (!axios.interceptors) throw new Error(`invalid axios instance: ${axios}`)
  axios.interceptors.request.use(authTokenInterceptor(config))
}

/**
 * @deprecated This method has been renamed to applyAuthTokenInterceptor and will be removed in a future release.
 */
export const useAuthTokenInterceptor = applyAuthTokenInterceptor

// PRIVATE

/**
 *  Returns the refresh and access tokens
 * @returns {IAuthTokens} Object containing refresh and access tokens
 */
const getAuthTokens = (): IAuthTokens | undefined => {
  const cookie = document.cookie.split(`; ${STORAGE_KEY}=`)
  const encodedValue = cookie.pop()?.split(';').shift()

  let tokens = undefined
  if (encodedValue) {
    const decodedValue = decodeURIComponent(encodedValue)
    try {
      const parsedValue = JSON.parse(decodedValue)
      const accessTokenValue = parsedValue.authenticated.token
      const accessTokenExp = parsedValue.authenticated.tokenData.exp
      const refreshToken = parsedValue.authenticated.refresh_token
      tokens = { accessToken: { value: accessTokenValue, exp: accessTokenExp }, refreshToken }
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        error.message = `Failed to parse auth tokens: ${decodedValue}`
        throw error
      }
    }
  }

  return tokens
}

/**
 * Checks if the token is undefined, has expired or is about the expire
 *
 * @param {string} token - Access token
 * @returns Whether or not the token is undefined, has expired or is about the expire
 */
const isTokenExpired = (expiration: number): boolean => {
  if (!expiration) return true
  const expiresIn = getExpiresIn(expiration)
  return !expiresIn || expiresIn <= EXPIRE_FUDGE
}

const tokenIsExpiredOrIsAboutExpire = (expiration: number) => {
  if (!expiration) return true
  const timeRemaining = expiration - Date.now() / 1000
  return timeRemaining <= 10
}

/**
 * Returns the number of seconds before the access token expires or -1 if it already has
 *
 * @param {string} token - Access token
 * @returns {number} Number of seconds before the access token expires
 */
const getExpiresIn = (expiration: number): number => {
  if (!expiration) return -1
  return expiration - Date.now() / 1000
}

/**
 * Refreshes the access token using the provided function
 *
 * @param {requestRefresh} requestRefresh - Function that is used to get a new access token
 * @returns {string} - Fresh access token
 */
const refreshToken = async (requestRefresh: TokenRefreshRequest): Promise<Token> => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token available')

  try {
    isRefreshing = true

    // Refresh and store access token using the supplied refresh function
    const newTokens = await requestRefresh(refreshToken)
    console.log('newTokens: ', newTokens)
    if (typeof newTokens === 'object' && newTokens?.accessToken) {
      await setAuthTokens(newTokens)
      return newTokens.accessToken
    } else if (typeof newTokens === 'string') {
      await setAccessToken(newTokens)
      return newTokens
    }

    throw new Error('requestRefresh must either return a string or an object with an accessToken')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Failed to refresh token
    const status = error?.response?.status
    if (status === 401 || status === 422) {
      // The refresh token is invalid so remove the stored tokens
      localStorage.removeItem(STORAGE_KEY)
      throw new Error(`Got ${status} on token refresh; clearing both auth tokens`)
    } else {
      // A different error, probably network error
      throw new Error(`Failed to refresh auth token: ${error.message}`)
    }
  } finally {
    isRefreshing = false
  }
}

export type TokenRefreshRequest = (refreshToken: Token) => Promise<Token | IAuthTokens>

export interface IAuthTokenInterceptorConfig {
  header?: string
  headerPrefix?: string
  requestRefresh: TokenRefreshRequest
}

/**
 * Function that returns an Axios Intercepter that:
 * - Applies that right auth header to requests
 * - Refreshes the access token when needed
 * - Puts subsequent requests in a queue and executes them in order after the access token has been refreshed.
 *
 * @param {IAuthTokenInterceptorConfig} config - Configuration for the interceptor
 * @returns {Promise} Promise that resolves in the supplied requestConfig
 */
export const authTokenInterceptor = ({
  header = 'Authorization',
  headerPrefix = '',
  requestRefresh,
}: IAuthTokenInterceptorConfig) => async (requestConfig: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
  // We need refresh token to do any authenticated requests
  if (!getRefreshToken()) return requestConfig

  // Queue the request if another refresh request is currently happening
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      queue.push({ resolve, reject })
    })
      .then((token) => {
        if (requestConfig.headers) {
          requestConfig.headers[header] = `${headerPrefix}${token}`
        }
        return requestConfig
      })
      .catch(Promise.reject)
  }

  // Do refresh if needed
  let accessToken
  try {
    accessToken = await refreshTokenIfNeeded(requestRefresh)
    resolveQueue(accessToken)
  } catch (error: unknown) {
    if (error instanceof Error) {
      declineQueue(error)
      throw new Error(`Unable to refresh access token for request due to token refresh error: ${error.message}`)
    }
  }

  // add token to headers
  if (accessToken && requestConfig.headers) requestConfig.headers[header] = accessToken
  return requestConfig
}

type RequestsQueue = {
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}[]

let isRefreshing = false
let queue: RequestsQueue = []

/**
 * Function that resolves all items in the queue with the provided token
 * @param token New access token
 */
const resolveQueue = (token?: Token) => {
  queue.forEach((p) => {
    p.resolve(token)
  })

  queue = []
}

/**
 * Function that declines all items in the queue with the provided error
 * @param error Error
 */
const declineQueue = (error: Error) => {
  queue.forEach((p) => {
    p.reject(error)
  })

  queue = []
}
