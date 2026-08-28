import { test, expect } from '@playwright/test';
import { getReadingTimeMinutes } from '../../lib/reading-time';

function words(count: number): string {
  return new Array(count).fill('word').join(' ');
}

test('reading time logic: a short post still rounds up to one minute', () => {
  expect(getReadingTimeMinutes('a few words')).toBe(1);
});

test('reading time logic: divides the word count by the words-per-minute rate', () => {
  expect(getReadingTimeMinutes(words(400), 200)).toBe(2);
});

test('reading time logic: rounds a partial minute up rather than down', () => {
  // 401 words at 200/minute is 2.005 minutes, which should read as 3, not 2:
  // a reader who needs one extra second still needs the extra minute shown.
  expect(getReadingTimeMinutes(words(401), 200)).toBe(3);
});

// A code-heavy post should not be rated as though its fences are read at
// prose speed - stripping them is what keeps the estimate honest.
test('reading time logic: code fences are not counted as prose', () => {
  const withCode = `${words(50)}\n\n\`\`\`\n${words(1000)}\n\`\`\`\n\n${words(50)}`;

  expect(getReadingTimeMinutes(withCode, 200)).toBe(1);
});

test('reading time logic: inline code, images and raw tags are stripped too', () => {
  const content = `Some prose with \`inline code\` and an image ![alt](/img.png) and <span>raw html</span>.`;

  // Only the plain words survive: "Some prose with and an image and raw html."
  expect(getReadingTimeMinutes(content, 200)).toBe(1);
});

test('reading time logic: a link keeps its visible text, not its URL', () => {
  const linkOnly = `[${words(50)}](https://example.com/some/very/long/path)`;
  const plainOnly = words(50);

  expect(getReadingTimeMinutes(linkOnly, 200)).toBe(
    getReadingTimeMinutes(plainOnly, 200),
  );
});
