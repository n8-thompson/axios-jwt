import { reconstructCookies } from '../src';
import { COOKIE_AS_OBJECT, COOKIE_PATH, ENCODED_COOKIE } from './mockData';

const mockFunction = jest.fn();

beforeAll(() => {
  Object.defineProperty(document, 'cookie', {
    set: mockFunction
  });
});

test('can set document cookies', () => {
  reconstructCookies(COOKIE_AS_OBJECT.original);
  expect(mockFunction).toHaveBeenCalledWith(`${ENCODED_COOKIE} ${COOKIE_PATH}`);
});
