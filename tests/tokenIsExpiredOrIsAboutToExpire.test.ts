import { tokenIsExpiredOrIsAboutToExpire } from '../src';

jest.useFakeTimers('modern').setSystemTime(new Date('2022-01-01').getTime());

test('returns true if number is less than 10', () => {
  //Results in -3281990400 time left
  expect(tokenIsExpiredOrIsAboutToExpire(-1640995200)).toBe(true);
});

test('returns true if number is less than 10', () => {
  //Results in 0 time left
  expect(tokenIsExpiredOrIsAboutToExpire(1640995200)).toBe(true);
});

test('returns true if number is 10', () => {
  //Results in 10 time left
  expect(tokenIsExpiredOrIsAboutToExpire(1640995210)).toBe(true);
});

test('returns false if number is greater than 10', () => {
  //Results in 20 time left
  expect(tokenIsExpiredOrIsAboutToExpire(1640995220)).toBe(false);
});
