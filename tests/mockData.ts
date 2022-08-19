import { ICustomCookieStructure } from '../src';

const COOKIE_AS_OBJECT: ICustomCookieStructure = {
  original: {
    authenticated: {
      authenticator: 'authenticator:jwt',
      token: 'fakeAccessToken',
      refresh_token: 'fakeRefreshToken',
      exp: 1660938823,
      tokenData: {
        user_email: 'demo@petpocketbook.com',
        user_id: 8,
        default_schedule: 'all',
        company_week_type: 'week',
        is_pet_parent: false,
        exp: 1660938823,
        typ: 'JWT'
      }
    }
  },
  userId: 8,
  expiration: 1660938823,
  accessToken: 'fakeAccessToken',
  refreshToken: 'fakeRefreshToken'
};

const ENCODED_COOKIE =
  'ember_simple_auth-session=%7B%22authenticated%22%3A%7B%22authenticator%22%3A%22authenticator%3Ajwt%22%2C%22token%22%3A%22fakeAccessToken%22%2C%22refresh_token%22%3A%22fakeRefreshToken%22%2C%22exp%22%3A1660938823%2C%22tokenData%22%3A%7B%22user_email%22%3A%22demo%40petpocketbook.com%22%2C%22user_id%22%3A8%2C%22default_schedule%22%3A%22all%22%2C%22company_week_type%22%3A%22week%22%2C%22is_pet_parent%22%3Afalse%2C%22exp%22%3A1660938823%2C%22typ%22%3A%22JWT%22%7D%7D%7D;';
const COOKIE_PATH = 'path=/';

export { COOKIE_AS_OBJECT, ENCODED_COOKIE, COOKIE_PATH };
