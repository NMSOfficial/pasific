import type { ReactNode } from 'react';
import { PasificLogo } from '../../components/PasificLogo';
import { EthosoftBrand } from '../../components/EthosoftBrand';
import { ThemeSelector } from '../../components/ThemeSelector';
import { LanguageSelector } from '../../components/LanguageSelector';

export function AuthLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="auth-screen">
      <header className="auth-screen__topbar">
        <LanguageSelector compact />
        <ThemeSelector compact />
      </header>
      <main className={`auth-card ${wide ? 'auth-card--wide' : ''}`}>
        <div className="auth-card__brand">
          <PasificLogo size="lg" />
        </div>
        {children}
      </main>
      <footer className="auth-screen__footer">
        <EthosoftBrand />
      </footer>
    </div>
  );
}
