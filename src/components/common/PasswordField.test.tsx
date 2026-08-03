import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PasswordField } from '@/components/common/PasswordField';

describe('PasswordField', () => {
  it('associates its label and validation message with the input', () => {
    const markup = renderToStaticMarkup(
      <PasswordField
        id="account-password"
        label="Password"
        value="secret"
        autoComplete="current-password"
        error="Password is required"
        onChange={() => undefined}
      />
    );

    expect(markup).toContain('for="account-password"');
    expect(markup).toContain('id="account-password"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="account-password-error"');
    expect(markup).toContain('id="account-password-error"');
  });

  it('supports reveal controls without owning their behavior', () => {
    const markup = renderToStaticMarkup(
      <PasswordField
        label="Password"
        value="secret"
        autoComplete="current-password"
        showPassword
        icon={<span>lock</span>}
        trailingAction={<button type="button">Hide</button>}
        onChange={() => undefined}
      />
    );

    expect(markup).toContain('type="text"');
    expect(markup).toContain('>lock<');
    expect(markup).toContain('>Hide<');
    expect(markup).toContain('pl-10');
    expect(markup).toContain('pr-11');
  });
});
