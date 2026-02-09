import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Building2,
} from 'lucide-react';
import {
  createRecipient,
  getRecipientStatus,
  type CreateRecipientRequest,
} from '@/lib/pagarme-api';
import { useToast } from '@/hooks/use-toast';

interface RecipientStatus {
  hasRecipient: boolean;
  recipientId?: string;
  onboardingComplete: boolean;
  status?: string;
  name?: string;
  error?: string;
}

const BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú Unibanco' },
  { code: '260', name: 'Nubank (Nu Pagamentos)' },
  { code: '077', name: 'Banco Inter' },
  { code: '336', name: 'C6 Bank' },
  { code: '212', name: 'Banco Original' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '422', name: 'Safra' },
  { code: '070', name: 'BRB' },
  { code: '136', name: 'Unicred' },
  { code: '290', name: 'PagSeguro' },
  { code: '380', name: 'PicPay' },
  { code: '323', name: 'Mercado Pago' },
];

/**
 * Pagar.me onboarding component for the producer dashboard.
 * Handles recipient creation with bank account data and status display.
 */
export function PagarmeOnboarding() {
  const [status, setStatus] = useState<RecipientStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  // Form state
  const [document, setDocument] = useState('');
  const [documentType, setDocumentType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [bankCode, setBankCode] = useState('');
  const [branchNumber, setBranchNumber] = useState('');
  const [branchCheckDigit, setBranchCheckDigit] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountCheckDigit, setAccountCheckDigit] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');

  const fetchStatus = async () => {
    try {
      const data = await getRecipientStatus();
      setStatus(data);
    } catch {
      // Pagar.me not configured on backend — hide the component
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCreateRecipient = async () => {
    if (!document || !bankCode || !branchNumber || !accountNumber || !accountCheckDigit) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setActing(true);
    try {
      const req: CreateRecipientRequest = {
        document: document.replace(/\D/g, ''),
        documentType,
        type: documentType === 'CNPJ' ? 'company' : 'individual',
        bankCode,
        branchNumber: branchNumber.replace(/\D/g, ''),
        branchCheckDigit: branchCheckDigit.replace(/\D/g, ''),
        accountNumber: accountNumber.replace(/\D/g, ''),
        accountCheckDigit: accountCheckDigit.replace(/\D/g, ''),
        accountType,
      };

      await createRecipient(req);
      toast({
        title: 'Conta configurada!',
        description: 'Você já pode receber pagamentos dos seus eventos.',
      });
      setShowForm(false);
      await fetchStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
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

  // If Pagar.me is not configured on the backend, don't show anything
  if (status === null) {
    return null;
  }

  // Recipient active — show success state
  if (status.hasRecipient && status.onboardingComplete) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
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
              Sua conta está configurada. Os pagamentos serão depositados automaticamente na sua conta bancária.
              A plataforma retém R$ 5,00 por ingresso vendido.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No recipient yet — show CTA or form
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
            Configure sua conta bancária para receber os pagamentos dos ingressos vendidos.
            A plataforma retém uma taxa fixa de R$ 5,00 por ingresso.
          </p>

          {!showForm ? (
            <Button onClick={() => setShowForm(true)}>
              <Building2 className="w-4 h-4 mr-2" />
              Configurar conta bancária
            </Button>
          ) : (
            <div className="space-y-4 p-4 rounded-xl bg-muted/50 border border-border">
              <h4 className="font-medium text-sm">Dados bancários</h4>

              {/* Document Type + Document */}
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={documentType} onValueChange={(v) => setDocumentType(v as 'CPF' | 'CNPJ')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="CNPJ">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{documentType}</Label>
                  <Input
                    placeholder={documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                  />
                </div>
              </div>

              {/* Bank */}
              <div>
                <Label className="text-xs">Banco</Label>
                <Select value={bankCode} onValueChange={setBankCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.code} - {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Branch */}
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div>
                  <Label className="text-xs">Agência</Label>
                  <Input
                    placeholder="0001"
                    value={branchNumber}
                    onChange={(e) => setBranchNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Dígito</Label>
                  <Input
                    placeholder="0"
                    value={branchCheckDigit}
                    onChange={(e) => setBranchCheckDigit(e.target.value)}
                    maxLength={2}
                  />
                </div>
              </div>

              {/* Account */}
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div>
                  <Label className="text-xs">Conta</Label>
                  <Input
                    placeholder="12345"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Dígito</Label>
                  <Input
                    placeholder="6"
                    value={accountCheckDigit}
                    onChange={(e) => setAccountCheckDigit(e.target.value)}
                    maxLength={2}
                  />
                </div>
              </div>

              {/* Account Type */}
              <div>
                <Label className="text-xs">Tipo de conta</Label>
                <Select value={accountType} onValueChange={(v) => setAccountType(v as 'checking' | 'savings')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreateRecipient} disabled={acting}>
                  {acting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Configurando...
                    </>
                  ) : (
                    'Salvar e ativar'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  disabled={acting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
