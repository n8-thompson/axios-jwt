import { AxiosInstance, AxiosRequestConfig } from 'axios'

export const COOKIE_NAME = 'ember_simple_auth-session'

type TokenValue = string
export interface IAuthTokens {
  accessToken: IAccessToken
  refreshToken: TokenValue
}

interface IAccessToken {
  value: TokenValue
  exp: number
}

// EXPORTS

/**
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
  let cookies = decodeURIComponent(document.cookie).split('; ')
  const indexOfTargetCookie = cookies.findIndex((cookie) => cookie.includes(`${COOKIE_NAME}=`))

  let targetCookie = JSON.parse(cookies[indexOfTargetCookie].replace(`${COOKIE_NAME}=`, ''))
  targetCookie.authenticated.token = tokens.accessToken.value
  targetCookie.authenticated.refresh_token = tokens.refreshToken
  const stringifiedTargetCookie = `${COOKIE_NAME}=`.concat(JSON.stringify(targetCookie))
  cookies[indexOfTargetCookie] = stringifiedTargetCookie
  const replacementCookie = cookies.join('; ')
  document.cookie = encodeURIComponent(replacementCookie)
}

/**
 * Sets the access token
 * @param {string} token - Access token
 */
export const setAccessToken = (token: TokenValue): void => {
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
export const clearAuthTokens = (): void => localStorage.removeItem(COOKIE_NAME)

/**
 * @returns {string} Refresh token
 */
export const getRefreshToken = (): TokenValue | undefined => {
  const tokens = getAuthTokens()
  return tokens ? tokens.refreshToken : undefined
}

/**
 * @callback requestRefresh
 * @param {string} refreshToken - Token that is sent to the backend
 * @returns {Promise} Promise that resolves in an access token
 */

/**
 * @param {number} expiration - Expiration time of token
 * @returns {boolean} If expiration time has passed or will soon pass
 */
const hasExpiredOrIsAboutToExpire = (expiration: number): boolean => {
  const timeRemaining = expiration - Date.now() / 1000
  const aboutToExpire = timeRemaining <= 10
  return !timeRemaining || aboutToExpire
}

/**
 * @param {requestRefresh} requestRefresh - Function that is used to get a new access token
 * @returns {string} new access token
 */
export const refreshTokenIfNeeded = async (requestRefresh: TokenRefreshRequest): Promise<TokenValue | undefined> => {
  const accessToken = getAuthTokens()?.accessToken
  const expiration = accessToken?.exp
  let accessTokenValue = accessToken?.value
  if (expiration ? hasExpiredOrIsAboutToExpire(expiration) : true) {
    accessTokenValue = await refreshToken(requestRefresh)
  }
  return accessTokenValue
}

/**
 * @param {Axios} axios - Axios instance to apply the interceptor to
 * @param {IAuthTokenInterceptorConfig} config - Configuration for the interceptor
 */
export const applyAuthTokenInterceptor = (axios: AxiosInstance, config: IAuthTokenInterceptorConfig): void => {
  if (!axios.interceptors) throw new Error(`invalid axios instance: ${axios}`)
  axios.interceptors.request.use(authTokenInterceptor(config))
}

// PRIVATE

/**
 * @returns {IAuthTokens} Object containing refresh token and access token
 */
const getAuthTokens = (): IAuthTokens | undefined => {
  const cookie = document.cookie.split(`; ${COOKIE_NAME}=`)
  const encodedValue = cookie.pop()?.split(';').shift()

  let tokens = undefined
  if (encodedValue) {
    const decodedValue = decodeURIComponent(encodedValue)
    try {
      const parsedValue = JSON.parse(decodedValue)
      const accessTokenValue = parsedValue.authenticated.value
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
 * Refreshes the access token using the provided function
 * @param {requestRefresh} requestRefresh - Function that is used to get a new access token
 * @returns {string} - Fresh access token
 */
const refreshToken = async (requestRefresh: TokenRefreshRequest): Promise<TokenValue> => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token available')

  try {
    isRefreshing = true

    // Refresh and store access token using the supplied refresh function
    const newTokens = await requestRefresh(refreshToken)
    if (typeof newTokens === 'object' && newTokens?.accessToken) {
      await setAuthTokens(newTokens)
      return newTokens.accessToken.value
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
      localStorage.removeItem(COOKIE_NAME)
      throw new Error(`Got ${status} on token refresh; clearing both auth tokens`)
    } else {
      // A different error, probably network error
      throw new Error(`Failed to refresh auth token: ${error.message}`)
    }
  } finally {
    isRefreshing = false
  }
}

export type TokenRefreshRequest = (refreshToken: TokenValue) => Promise<TokenValue | IAuthTokens>

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
  headerPrefix = 'Bearer ',
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
  if (accessToken && requestConfig.headers) requestConfig.headers[header] = `${headerPrefix}${accessToken}`
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
const resolveQueue = (token?: TokenValue) => {
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
