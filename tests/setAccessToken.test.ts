import { setAccessToken } from '../src';
import { COOKIE_AS_OBJECT } from './mockData';

jest.mock('../src', () => {
  const original = jest.requireActual('../src');
  return {
    ...original,
    reconstructCookies: jest.fn((value) => {
      let expectedObject = { ...COOKIE_AS_OBJECT.original };
      expectedObject.authenticated.token = 'replacementToken';
      expect(value).toEqual(expectedObject);
    })
  };
});

test('can modify the access token in the cookie object', () => {
  setAccessToken('replacementToken', COOKIE_AS_OBJECT.original);
});
