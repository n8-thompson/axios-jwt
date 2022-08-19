import { getCurrentOrRefreshedAccessToken } from '../src';
import { COOKIE_AS_OBJECT } from './mockData';

jest.mock('../src', () => {
  const original = jest.requireActual('../src');
  return {
    ...original,
    cookieData: jest.fn(() => console.log('fake cookieData fn hit')),
    tokenIsExpiredOrIsAboutToExpire: jest.fn(() =>
      console.log('fake tokenIsExpiredOrIsAboutToExpire fn hit')
    ),
    refreshToken: jest.fn(() => console.log('fake refreshToken fn hit'))
  };
});

test('can modify the access token in the cookie object', () => {
  let requestRefresh = async (): Promise<string> => 'refreshedToken';
  getCurrentOrRefreshedAccessToken(requestRefresh);
});
