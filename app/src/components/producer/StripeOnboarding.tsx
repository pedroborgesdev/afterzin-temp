import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  KeyRound,
} from 'lucide-react';
import {
  createStripeAccount,
  createOnboardingLink,
  getStripeStatus,
  updatePixKey,
} from '@/lib/stripe-api';
import { useToast } from '@/hooks/use-toast';

interface StripeStatus {
  hasAccount: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  transfersActive?: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  error?: string;
}

/**
 * Stripe Connect onboarding component for the producer dashboard.
 * Handles account creation, onboarding flow, status display, and PIX key management.
 */
export function StripeOnboarding() {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showPixForm, setShowPixForm] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('');
  const { toast } = useToast();

  const fetchStatus = async () => {
    try {
      const data = await getStripeStatus();
      setStatus(data);
    } catch {
      // Stripe not configured on backend — hide the component
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check if returning from Stripe onboarding
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_onboarding') === 'complete') {
      window.history.replaceState({}, '', window.location.pathname);
      // Re-fetch to update status
      setTimeout(fetchStatus, 1000);
    }
    if (params.get('stripe_refresh') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleCreateAccount = async () => {
    setActing(true);
    try {
      await createStripeAccount();
      toast({
        title: 'Conta criada!',
        description: 'Agora complete o cadastro para receber pagamentos.',
      });
      await fetchStatus();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setActing(false);
    }
  };

  const handleStartOnboarding = async () => {
    setActing(true);
    try {
      const data = await createOnboardingLink();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      setActing(false);
    }
  };

  const handleUpdatePixKey = async () => {
    if (!pixKey || !pixKeyType) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setActing(true);
    try {
      await updatePixKey(pixKey, pixKeyType);
      toast({ title: 'Chave PIX atualizada!', description: 'Seus recebimentos usarão esta chave.' });
      setShowPixForm(false);
      setPixKey('');
      setPixKeyType('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-4 w-full bg-muted rounded" />
      </div>
    );
  }

  // If Stripe is not configured on the backend, don't show anything
  if (status === null) {
    return null;
  }

  // No account yet — show CTA to create
  if (!status.hasAccount) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-lg mb-1">
              Recebimento de pagamentos
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Ative sua conta para receber pagamentos dos ingressos vendidos diretamente via PIX.
              A plataforma retém uma taxa fixa de R$ 5,00 por ingresso.
            </p>
            <Button onClick={handleCreateAccount} disabled={acting}>
              {acting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                'Ativar recebimento de pagamentos'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Account active — show success state + PIX key management
  if (status.onboardingComplete) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-semibold text-lg">Pagamentos ativos</h3>
              <Badge variant="default" className="bg-green-600">
                Ativo
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Sua conta está configurada. Os pagamentos serão depositados automaticamente via PIX.
            </p>
          </div>
        </div>

        {/* PIX key management */}
        {!showPixForm ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPixForm(true)}
            className="gap-2"
          >
            <KeyRound className="w-4 h-4" />
            Gerenciar chave PIX
          </Button>
        ) : (
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
            <p className="text-sm font-medium">Atualizar chave PIX</p>
            <p className="text-xs text-muted-foreground">
              Atenção: todos os seus eventos devem estar pausados para alterar a chave PIX.
            </p>
            <Select value={pixKeyType} onValueChange={setPixKeyType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo da chave" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Chave aleatória</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Insira a chave PIX"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpdatePixKey} disabled={acting}>
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowPixForm(false);
                  setPixKey('');
                  setPixKeyType('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Account exists but onboarding incomplete
  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-500/5 p-6 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold text-lg">Cadastro incompleto</h3>
            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
              Pendente
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Complete seu cadastro no Stripe para começar a receber pagamentos. Você será
            redirecionado para preencher seus dados bancários e documentos.
          </p>
          <Button onClick={handleStartOnboarding} disabled={acting} className="gap-2">
            {acting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecionando...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Completar cadastro
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
