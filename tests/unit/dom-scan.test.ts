/**
 * Tests for DOM scanning
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { discoverFields } from '../../src/core/dom-scan';

describe('discoverFields', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should discover input fields with labels', () => {
    document.body.innerHTML = `
      <form>
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" />
      </form>
    `;

    const fields = discoverFields();

    expect(fields).toHaveLength(1);
    expect(fields[0].labelText).toBe('email address');
    expect(fields[0].inputType).toBe('email');
  });

  it('should discover fields with aria-label', () => {
    document.body.innerHTML = `
      <input type="text" aria-label="First Name" />
    `;

    const fields = discoverFields();

    expect(fields).toHaveLength(1);
    expect(fields[0].labelText).toBe('first name');
  });

  it('should discover fields with placeholder', () => {
    document.body.innerHTML = `
      <input type="text" placeholder="Enter your name" />
    `;

    const fields = discoverFields();

    expect(fields).toHaveLength(1);
    expect(fields[0].labelText).toBe('enter your name');
  });

  it('should skip password and file inputs', () => {
    document.body.innerHTML = `
      <input type="password" id="pwd" />
      <input type="file" id="file" />
      <input type="text" id="name" />
    `;

    const fields = discoverFields();

    expect(fields).toHaveLength(1); // Only the text input
    expect(fields[0].element.id).toBe('name');
  });

  it('should discover select elements', () => {
    document.body.innerHTML = `
      <label for="country">Country</label>
      <select id="country" name="country">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </select>
    `;

    const fields = discoverFields();

    expect(fields).toHaveLength(1);
    expect(fields[0].labelText).toBe('country');
    expect(fields[0].inputType).toBe('select');
  });

  it('should discover textarea elements', () => {
    document.body.innerHTML = `
      <label for="comments">Comments</label>
      <textarea id="comments" name="comments"></textarea>
    `;

    const fields = discoverFields();

    expect(fields).toHaveLength(1);
    expect(fields[0].labelText).toBe('comments');
    expect(fields[0].inputType).toBe('textarea');
  });

  it('should skip hidden fields by default', () => {
    document.body.innerHTML = `
      <input type="text" id="visible" value="visible" />
      <input type="text" id="hidden" style="display: none;" value="hidden" />
    `;

    const fields = discoverFields(false);

    expect(fields).toHaveLength(1);
    expect(fields[0].element.id).toBe('visible');
  });

  it('should include hidden fields when requested', () => {
    document.body.innerHTML = `
      <input type="text" id="visible" value="visible" />
      <input type="text" id="hidden" style="display: none;" value="hidden" />
    `;

    const fields = discoverFields(true);

    expect(fields).toHaveLength(2);
  });

  it('should handle fields wrapped in labels', () => {
    document.body.innerHTML = `
      <label>
        Phone Number
        <input type="tel" name="phone" />
      </label>
    `;

    const fields = discoverFields();

    expect(fields).toHaveLength(1);
    expect(fields[0].labelText).toBe('phone number');
  });
});

