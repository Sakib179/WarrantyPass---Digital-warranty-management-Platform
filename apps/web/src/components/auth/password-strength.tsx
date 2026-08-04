'use client';

import { passwordStrength } from '@warrantypass/validation';
import type { ReactNode } from 'react';

export function PasswordStrength({ password }: { password: string }): ReactNode {
  const strength = passwordStrength(password);
  return (
    <div aria-live="polite" className="mt-2">
      <div className="grid grid-cols-4 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={`h-1.5 rounded-full ${
              level <= strength.score
                ? strength.score >= 3
                  ? 'bg-[var(--success-text)]'
                  : 'bg-[var(--warning-text)]'
                : 'bg-[var(--surface-emphasis)]'
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-[var(--text-subtle)]">
        Password strength: {strength.label}. Passphrases are welcome.
      </p>
    </div>
  );
}
