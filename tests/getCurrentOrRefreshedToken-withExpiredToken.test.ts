import { getCurrentOrRefreshedAccessToken } from '../src';
import { COOKIE_AS_OBJECT } from './mockData';

jest.mock('../src', () => {
  const original = jest.requireActual('../src');
  return {
    ...original,
    cookieData: jest.fn(() => COOKIE_AS_OBJECT),
    tokenIsExpiredOrIsAboutToExpire: jest.fn(() => true),
    refreshToken: jest.fn(() => 'refreshedToken')
  };
});

test('if no cookie is found in the browser then function will return undefined', async () => {
  const requestRefresh = async (): Promise<string> => 'refreshedToken';
  const result = await getCurrentOrRefreshedAccessToken(requestRefresh);
  expect(result).toBe('refreshedToken');
});
