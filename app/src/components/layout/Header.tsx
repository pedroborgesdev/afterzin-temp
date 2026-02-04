import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Ticket, User, Menu, X, LogOut, Home, Backpack, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, isAuthenticated, logout, tickets } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;
  const isProducerArea = location.pathname.startsWith('/produtor');

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container flex h-14 md:h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-elevated transition-shadow duration-200">
            <img
              src="/logo.svg"
              alt="Afterzin Logo"
              className="w-9 h-9 md:w-9 md:h-9 object-contain"
              draggable="false"
            />
          </div>
          <span className="font-display text-lg md:text-xl font-bold text-gradient hidden xs:block">
            Afterzin
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link 
            to="/" 
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive('/') 
                ? "bg-accent text-accent-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            Eventos
          </Link>
          {isAuthenticated && (
            <Link 
              to="/mochila" 
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                isActive('/mochila') 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Backpack className="w-4 h-4" />
              Mochila
              {tickets.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {tickets.length}
                </span>
              )}
            </Link>
          )}
          {isAuthenticated && (
            <Link
              to="/produtor"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                isProducerArea
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Megaphone className="w-4 h-4" />
              Produtor
            </Link>
          )}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 pr-2 md:pr-3 hover:bg-accent transition-colors focus-ring">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">
                    {user?.name?.split(' ')[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2.5">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/perfil')} className="py-2.5">
                  <User className="w-4 h-4 mr-2" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/mochila')} className="py-2.5">
                  <Backpack className="w-4 h-4 mr-2" />
                  Meus Ingressos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/produtor')} className="py-2.5">
                  <Megaphone className="w-4 h-4 mr-2" />
                  Área do Produtor
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="py-2.5 text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="hidden sm:inline-flex"
              >
                Entrar
              </Button>
              <Button 
                size="sm" 
                onClick={() => navigate('/auth?mode=register')}
              >
                Criar Conta
              </Button>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2.5 hover:bg-accent rounded-lg transition-colors min-h-touch min-w-touch flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background animate-slide-up">
          <nav className="container py-3 flex flex-col gap-1">
            <Link 
              to="/" 
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors font-medium min-h-touch",
                isActive('/') ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="w-5 h-5" />
              Eventos
            </Link>
            {isAuthenticated && (
              <>
                <Link 
                  to="/mochila" 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors font-medium min-h-touch",
                    isActive('/mochila') ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Backpack className="w-5 h-5" />
                  Mochila de Tickets
                  {tickets.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full ml-auto">
                      {tickets.length}
                    </span>
                  )}
                </Link>
                <Link 
                  to="/perfil" 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors font-medium min-h-touch",
                    isActive('/perfil') ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  Meu Perfil
                </Link>
                <Link 
                  to="/produtor" 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors font-medium min-h-touch",
                    isProducerArea ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Megaphone className="w-5 h-5" />
                  Área do Produtor
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors font-medium min-h-touch text-destructive hover:bg-destructive/10 w-full text-left mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  Sair da conta
                </button>
              </>
            )}
            {!isAuthenticated && (
              <div className="flex gap-2 px-4 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}
                >
                  Entrar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => { navigate('/auth?mode=register'); setMobileMenuOpen(false); }}
                >
                  Criar Conta
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
