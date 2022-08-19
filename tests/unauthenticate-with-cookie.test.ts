import { unauthenticate } from '../src';
import { COOKIE_AS_OBJECT } from './mockData';

jest.mock('../src', () => {
  const original = jest.requireActual('../src');
  return {
    ...original,
    cookieData: jest.fn(() => COOKIE_AS_OBJECT),
    reconstructCookies: jest.fn((value) => {
      expect(value).toEqual({ authenticated: {} });
    })
  };
});

test('reconstructCookies is called with proper data when we have a cookie', () => {
  unauthenticate();
});
