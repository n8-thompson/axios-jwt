import { getCurrentOrRefreshedAccessToken } from '../src';
import { COOKIE_AS_OBJECT } from './mockData';

jest.mock('../src', () => {
  const original = jest.requireActual('../src');
  return {
    ...original,
    cookieData: jest.fn(() => COOKIE_AS_OBJECT),
    tokenIsExpiredOrIsAboutToExpire: jest.fn(() => false),
    refreshToken: jest.fn(() => console.log('fake refreshToken fn hit'))
  };
});

test('if no cookie is found in the browser then function will return undefined', async () => {
  const requestRefresh = async (): Promise<string> => 'refreshedToken';
  const result = await getCurrentOrRefreshedAccessToken(requestRefresh);
  expect(result).toBe('fakeAccessToken');
});
