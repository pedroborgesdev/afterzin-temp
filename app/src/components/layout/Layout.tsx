import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <Header />
      <main className="flex-1 pb-6 md:pb-12">
        {children}
      </main>
      <footer className="border-t border-border/50 py-6 bg-card/50 mt-auto">
        <div className="container">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 TicketFlow. Todos os direitos reservados.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors py-1">
                Termos de Uso
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors py-1">
                Privacidade
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors py-1">
                Ajuda
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
