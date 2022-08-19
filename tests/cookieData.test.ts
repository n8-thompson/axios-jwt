import { cookieData } from '../src';
import { COOKIE_AS_OBJECT } from './mockData';

const COOKIE_KEY_VALUE_PAIR =
  'ember_simple_auth-session=%7B%22authenticated%22%3A%7B%22authenticator%22%3A%22authenticator%3Ajwt%22%2C%22token%22%3A%22fakeAccessToken%22%2C%22refresh_token%22%3A%22fakeRefreshToken%22%2C%22exp%22%3A1660938823%2C%22tokenData%22%3A%7B%22user_email%22%3A%22demo%40petpocketbook.com%22%2C%22user_id%22%3A8%2C%22default_schedule%22%3A%22all%22%2C%22company_week_type%22%3A%22week%22%2C%22is_pet_parent%22%3Afalse%2C%22exp%22%3A1660938823%2C%22typ%22%3A%22JWT%22%7D%7D%7D';
const ADDITIONAL_COOKIE_KEY_VALUE_PAIRS = '__hssrc=1; ccontrol_id=2;';
const mockFunction = jest.fn();

beforeAll(() => {
  Object.defineProperty(document, 'cookie', {
    get: mockFunction
  });
});

test('if browser has our cookie, then its data will be returned', () => {
  mockFunction.mockReturnValue(COOKIE_KEY_VALUE_PAIR);
  const data = cookieData();
  expect(data).toEqual(COOKIE_AS_OBJECT);
});

test('if browser has multiple cookies, then only the ember cookie data will be returned', () => {
  mockFunction.mockReturnValue(
    `${COOKIE_KEY_VALUE_PAIR}; ${ADDITIONAL_COOKIE_KEY_VALUE_PAIRS}`
  );
  const data = cookieData();
  expect(data).toEqual(COOKIE_AS_OBJECT);
});

test('if browser does not have our cookie, then undefined will be returned', () => {
  mockFunction.mockReturnValue('');
  const data = cookieData();
  expect(data).toBe(undefined);
});
