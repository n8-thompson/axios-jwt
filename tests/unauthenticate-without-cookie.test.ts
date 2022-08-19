import { unauthenticate } from '../src';

jest.mock('../src', () => {
  const original = jest.requireActual('../src');
  return {
    ...original,
    cookieData: jest.fn(() => undefined),
    reconstructCookies: jest.fn((value) => {
      expect(value).toEqual({ authenticated: {} });
    })
  };
});

test('error is thrown when we do not have a cookie and unathenticated is called', () => {
  try {
    unauthenticate();
  } catch (e) {
    let error = new Error(
      'Unable to unauthenticate becuase there is no cookie'
    );
    expect(e).toStrictEqual(error);
  }
});
