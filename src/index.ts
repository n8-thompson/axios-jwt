import { AxiosInstance, AxiosRequestConfig } from 'axios';

export const STORAGE_KEY = 'ember_simple_auth-session';
const TARGET_COOKIE_PREFIX = `${STORAGE_KEY}=`;
const COOKIES_SEPARATOR = '; ';

type Token = string;

interface ICustomCookieStructure {
  original: IOriginalCookieStructure;
  userId: number;
  expiration: number;
  accessToken: string;
  refreshToken: string;
}

interface IOriginalCookieStructure {
  authenticated: IAuthenticated;
}

interface IAuthenticated {
  authenticator?: string;
  exp?: string;
  token?: string;
  refreshToken?: string;
  tokenData?: {
    company_week_type?: string;
    default_schedule?: string;
    exp: string;
    is_pet_parent: boolean;
    typ: string;
    user_email: string;
    user_id: number;
  };
}

export type TokenRefreshRequest = (refreshToken: Token) => Promise<Token>;

interface IAuthTokenInterceptorConfig {
  header?: string;
  requestRefresh: TokenRefreshRequest;
}

// **** EXPORTS ****

/**
 * Modifies the cookie to contain the updated token
 * @param {Token} accessToken - access token to replace existing access token
 * @param {IOriginalCookieStructure} originalCookieData - copy of the original cookie data
 */
export const setAccessToken = (
  accessToken: Token,
  originalCookieData: IOriginalCookieStructure
): void => {
  console.log('setAccessToken hit');
  let newCookie = {} as IOriginalCookieStructure;
  newCookie = originalCookieData;
  newCookie.authenticated.token = accessToken;
  reconstructCookies(newCookie);
};

/**
 * Gets the ember_simple_auth-session cookie and returns it's data if it exists
 * @returns {ICustomCookieStructure} Object representing the cookie
 */
export const cookieData = (): ICustomCookieStructure | undefined => {
  console.log('cookieData hit');
  try {
    const cookies = document.cookie.split(COOKIES_SEPARATOR);
    const cookieIndex = cookies.findIndex((el) =>
      el.includes(TARGET_COOKIE_PREFIX)
    );
    const cookieContent = cookies[cookieIndex].replace(
      TARGET_COOKIE_PREFIX,
      ''
    );
    const contentDecoded = decodeURIComponent(cookieContent);
    const contentParsed = JSON.parse(contentDecoded);
    if (Object.keys(contentParsed.authenticated).length) {
      return {
        original: contentParsed,
        userId: contentParsed.authenticated.tokenData.user_id,
        expiration: Number(contentParsed.authenticated.exp),
        accessToken: contentParsed.authenticated.token,
        refreshToken: contentParsed.authenticated.refresh_token
      };
    }
  } catch (e: any) {
    throw new Error(
      `Failed to either get or parse cookie from browser: ${e.message}`
    );
  }

  return undefined;
};

/**
 * Clears the cookie data by overwriting with {authorized: {}}
 */
export const unauthenticate = (): void => {
  console.log('unauthenticate hit');
  let cookie = cookieData();
  if (!cookie)
    throw new Error(
      'Unable to update access token since there are not tokens currently stored'
    );
  let newCookie = {} as IOriginalCookieStructure;
  newCookie = cookie.original;
  newCookie.authenticated = {};
  reconstructCookies(newCookie);
};

/**
 * @callback requestRefresh
 * @param {string} refreshToken - Token that is sent to the backend
 * @returns {Promise} Promise that resolves in an access token
 */

/**
 * Gets the current access token, if it has expired, it will return a new token. Otherwise it will return the current token
 * @param {TokenRefreshRequest} requestRefresh - Function that is used to get a new access token
 * @returns {string} Access token
 */
export const getCurrentOrRefreshedAccessToken = async (
  requestRefresh: TokenRefreshRequest
): Promise<Token | undefined> => {
  console.log('getCurrentOrRefreshedAccessToken hit');
  let cookie = cookieData();
  if (!cookie) return undefined;

  const { expiration, accessToken } = cookie;
  let token = accessToken;
  let shouldRefresh = tokenIsExpiredOrIsAboutExpire(Number(expiration));
  if (shouldRefresh) token = await refreshToken(requestRefresh);
  return token;
};

/**
 *
 * @param {Axios} axios - Axios instance to apply the interceptor to
 * @param {IAuthTokenInterceptorConfig} config - Configuration for the interceptor
 */
export const applyAuthTokenInterceptor = (
  axios: AxiosInstance,
  config: IAuthTokenInterceptorConfig
): void => {
  console.log('applyAuthTokenInterceptor hit');
  if (!axios.interceptors) throw new Error(`invalid axios instance: ${axios}`);
  axios.interceptors.request.use(authTokenInterceptor(config));
};

/**
 * Rebuilds cookie from object and sets the cookie in the browser
 * @param {IOriginalCookieStructure} cookieObject - the new cookie as an object
 */
const reconstructCookies = (cookieObject: IOriginalCookieStructure): void => {
  console.log('reconstructCookies hit');
  let newCookie = JSON.stringify(cookieObject);
  newCookie = encodeURIComponent(newCookie);
  newCookie = `${TARGET_COOKIE_PREFIX}${newCookie}; path=/`;
  document.cookie = newCookie;
};

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
  requestRefresh
}: IAuthTokenInterceptorConfig) => async (
  requestConfig: AxiosRequestConfig
): Promise<AxiosRequestConfig> => {
  console.log('authTokenInterceptor hit');
  let cookie = cookieData();
  if (!!cookie?.refreshToken === false) return requestConfig;

  // Queue the request if another refresh request is currently happening
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      queue.push({ resolve, reject });
    })
      .then((token) => {
        if (requestConfig.headers) {
          requestConfig.headers[header] = String(token);
        }
        return requestConfig;
      })
      .catch(Promise.reject);
  }

  let accessToken;
  try {
    accessToken = await getCurrentOrRefreshedAccessToken(requestRefresh);
    resolveQueue(accessToken);
  } catch (error: unknown) {
    if (error instanceof Error) {
      declineQueue(error);
      throw new Error(
        `Unable to refresh access token for request due to token refresh error: ${error.message}`
      );
    }
  }

  // add token to headers
  if (accessToken && requestConfig.headers)
    requestConfig.headers[header] = accessToken;
  return requestConfig;
};

// **** PRIVATE ****

const tokenIsExpiredOrIsAboutExpire = (expiration: number) => {
  console.log('tokenIsExpiredOrIsAboutExpire hit');
  if (!expiration) return true;
  const timeRemaining = expiration - Date.now() / 1000;
  return timeRemaining <= 10;
};

/**
 * Refreshes the access token using the provided function
 * @param {requestRefresh} requestRefresh - Function that is used to get a new access token
 * @returns {string} - Fresh access token
 */
const refreshToken = async (
  requestRefresh: TokenRefreshRequest
): Promise<Token> => {
  let cookie = cookieData();
  let token = cookie?.refreshToken;

  if (!cookie || !token) throw new Error('No refresh token available');

  try {
    isRefreshing = true;
    const newToken = await requestRefresh(token);
    await setAccessToken(newToken, cookie.original);
    return newToken;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 401 || status === 422) {
      unauthenticate();
      throw new Error(`Got ${status} on token refresh; unauthenticating user`);
    } else {
      throw new Error(`Failed to refresh auth token: ${error.message}`);
    }
  } finally {
    isRefreshing = false;
  }
};

type RequestsQueue = {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}[];

let isRefreshing = false;
let queue: RequestsQueue = [];

/**
 * Function that resolves all items in the queue with the provided token
 * @param token New access token
 */
const resolveQueue = (token?: Token) => {
  queue.forEach((p) => {
    p.resolve(token);
  });

  queue = [];
};

/**
 * Function that declines all items in the queue with the provided error
 * @param error Error
 */
const declineQueue = (error: Error) => {
  queue.forEach((p) => {
    p.reject(error);
  });

  queue = [];
};
