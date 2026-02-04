import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Ticket, Mail, Lock, User, Calendar, CreditCard, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const redirectUrl = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectUrl);
    }
  }, [isAuthenticated, navigate, redirectUrl]);

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const success = await login(email, password);
        if (success) {
          toast({
            title: "Bem-vindo de volta! 👋",
            description: "Login realizado com sucesso.",
          });
          navigate(redirectUrl);
        } else {
          toast({
            title: "Erro no login",
            description: "E-mail ou senha incorretos. Tente novamente.",
            variant: "destructive",
          });
        }
      } else {
        const result = await register({
          name,
          email,
          cpf,
          birthDate,
          password,
        });
        if (result.success) {
          toast({
            title: "Conta criada! 🎉",
            description: "Bem-vindo ao TicketFlow.",
          });
          navigate(redirectUrl);
        } else {
          toast({
            title: "Erro no cadastro",
            description: result.error || "E-mail já cadastrado ou dados inválidos. Tente novamente.",
            variant: "destructive",
          });
        }
      }
    } catch {
      toast({
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex">
      {/* Left Panel - Branding (desktop only) */}
      <div className="hidden lg:flex flex-1 bg-gradient-primary items-center justify-center p-8 xl:p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-24 h-24 xl:w-32 xl:h-32 border border-primary-foreground/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: `scale(${0.5 + Math.random()})`,
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 text-primary-foreground text-center max-w-md">
          <div className="w-16 h-16 xl:w-20 xl:h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mx-auto mb-5">
            <Ticket className="w-8 h-8 xl:w-10 xl:h-10" />
          </div>
          <h1 className="font-display text-3xl xl:text-4xl font-bold mb-3">TicketFlow</h1>
          <p className="text-lg xl:text-xl opacity-90">
            Sua porta de entrada para os melhores eventos do Brasil
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-sm sm:max-w-md">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors py-1 -ml-1 min-h-touch"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Voltar</span>
          </button>

          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-gradient">TicketFlow</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1.5">
            {mode === 'login' ? 'Bem-vindo de volta!' : 'Criar sua conta'}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
            {mode === 'login' 
              ? 'Entre para acessar seus ingressos' 
              : 'Cadastre-se para comprar ingressos'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <Label htmlFor="name" className="text-sm">Nome Completo</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome completo"
                      className="pl-10 h-11"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cpf" className="text-sm">CPF</Label>
                  <div className="relative mt-1.5">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      className="pl-10 h-11 font-mono"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      maxLength={14}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="birthDate" className="text-sm">Data de Nascimento</Label>
                  <div className="relative mt-1.5">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="birthDate"
                      type="date"
                      className="pl-10 h-11"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email" className="text-sm">E-mail</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm">Senha</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading 
                ? 'Carregando...' 
                : mode === 'login' 
                  ? 'Entrar' 
                  : 'Criar Conta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="ml-1.5 text-primary font-medium hover:underline"
              >
                {mode === 'login' ? 'Criar conta' : 'Fazer login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
