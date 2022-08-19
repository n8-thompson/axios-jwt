import { getCurrentOrRefreshedAccessToken } from '../src';

jest.mock('../src', () => {
  const original = jest.requireActual('../src');
  return {
    ...original,
    cookieData: jest.fn(() => undefined)
  };
});

test('if no cookie is found in the browser then function will return undefined', async () => {
  const requestRefresh = async (): Promise<string> => 'refreshedToken';
  const result = await getCurrentOrRefreshedAccessToken(requestRefresh);
  expect(result).toBeUndefined();
});
