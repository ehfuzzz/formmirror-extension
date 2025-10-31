import { describe, it, beforeEach, expect } from 'vitest';
import { getRobustSelector, resolveElementBySelector } from '../../src/core/selectors';

describe('getRobustSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form>
        <label for="email-field">Email</label>
        <input id="email-field" name="email" type="email" />
        <input name="username" type="text" />
        <div class="wrapper">
          <div class="inner">
            <input type="text" placeholder="Nested" />
          </div>
        </div>
      </form>
    `;
  });

  it('returns id selector when unique id present', () => {
    const input = document.getElementById('email-field')!;
    const selector = getRobustSelector(input);
    expect(selector).toBe('#email-field');
  });

  it('prefers name attribute when id missing', () => {
    const input = document.querySelector('input[name="username"]') as HTMLInputElement;
    input.removeAttribute('id');
    const selector = getRobustSelector(input);
    expect(selector).toBe('input[name="username"]');
  });

  it('builds path selector when no attributes available', () => {
    const input = document.querySelector('input[placeholder="Nested"]') as HTMLInputElement;
    input.removeAttribute('placeholder');
    const selector = getRobustSelector(input);
    expect(selector.includes('input')).toBe(true);
    const resolved = resolveElementBySelector(selector);
    expect(resolved).toBe(input);
  });
});
