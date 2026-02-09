import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Loader2, X, QrCode, Clock } from 'lucide-react';
import { Event } from '@/types/events';
import { TicketSelection } from './TicketSelectionModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { createPixPayment, getPaymentStatus, type PixPaymentResult } from '@/lib/pagarme-api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';

interface CheckoutModalProps {
  event: Event;
  selection: TicketSelection;
  checkoutId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CheckoutModal({
  event,
  selection,
  checkoutId,
  isOpen,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'loading' | 'pix' | 'success' | 'error'>('idle');
  const [pixData, setPixData] = useState<PixPaymentResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const { refreshTickets } = useAuth();
  const { toast } = useToast();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Start countdown timer when PIX data is available
  useEffect(() => {
    if (!pixData?.expiresAt) return;
    const updateTimer = () => {
      const expiresAtMs = new Date(pixData.expiresAt).getTime();
      const now = Date.now();
      const diff = Math.floor((expiresAtMs - now) / 1000);
      if (diff <= 0) {
        setTimeLeft('Expirado');
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pixData?.expiresAt]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleCopyCode = () => {
    const code = pixData?.pixQrCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Código copiado!',
        description: 'Cole no app do seu banco para pagar.',
      });
    }
  };

  // Start PIX payment flow
  const handlePay = async () => {
    if (!checkoutId) {
      toast({ title: 'Erro', description: 'Checkout não disponível.', variant: 'destructive' });
      return;
    }
    setPaymentStatus('loading');

    try {
      const result = await createPixPayment(checkoutId);
      setPixData(result);
      setPaymentStatus('pix');

      // Start polling for payment confirmation (every 3 seconds)
      pollRef.current = setInterval(async () => {
        try {
          const status = await getPaymentStatus(checkoutId);
          if (status.paid) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            setPaymentStatus('success');
            await refreshTickets();
            toast({
              title: 'Pagamento confirmado! 🎉',
              description: 'Seu ingresso está na Mochila de Tickets.',
            });
            setTimeout(() => onSuccess(), 1500);
          }
        } catch {
          // Ignore polling errors, keep trying
        }
      }, 3000);
    } catch (err) {
      setPaymentStatus('error');
      toast({
        title: 'Erro ao gerar PIX',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const content = (
    <div className="px-4 sm:px-6 pb-safe">
      {paymentStatus === 'success' ? (
        <div className="text-center py-8 sm:py-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Pagamento confirmado!</h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            Seu ingresso está na Mochila de Tickets.
          </p>
        </div>
      ) : paymentStatus === 'pix' && pixData ? (
        <>
          {/* QR Code */}
          <div className="flex flex-col items-center mb-4">
            {pixData.pixQrCodeUrl ? (
              <img
                src={pixData.pixQrCodeUrl}
                alt="QR Code PIX"
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg border border-border"
              />
            ) : (
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg border border-border flex items-center justify-center bg-muted">
                <QrCode className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            {pixData.expiresAt && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Expira em: <span className="font-mono font-medium text-foreground">{timeLeft}</span></span>
              </div>
            )}
          </div>

          {/* Copia e Cola */}
          {pixData.pixQrCode && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2 text-center">PIX Copia e Cola</p>
              <button
                onClick={handleCopyCode}
                className="w-full flex items-center gap-2 px-4 py-3 bg-muted rounded-xl text-sm hover:bg-accent transition-colors min-h-touch touch-manipulation active:scale-[0.99]"
              >
                <span className="font-mono truncate flex-1 text-left text-xs">
                  {pixData.pixQrCode}
                </span>
                {copied ? (
                  <Check className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <Copy className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
              </button>
            </div>
          )}

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 py-3 mb-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">Aguardando pagamento...</span>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Abra o app do seu banco, escaneie o QR code ou cole o código PIX.
            O ingresso será liberado automaticamente após a confirmação.
          </p>
        </>
      ) : (
        <>
          <div className="bg-muted/50 rounded-xl p-3.5 sm:p-4 mb-4">
            <h4 className="font-semibold mb-2.5 text-sm sm:text-base">Resumo do Pedido</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Evento</span>
                <span className="font-medium text-right truncate max-w-[180px]">{event.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data</span>
                <span>{formatDate(selection.date.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ingresso</span>
                <span>
                  {selection.ticket.name}
                  {selection.ticket.variants.length > 1 &&
                    ` · ${selection.selectedVariant.audience === 'MALE' ? 'Masculino' : selection.selectedVariant.audience === 'FEMALE' ? 'Feminino' : selection.selectedVariant.audience === 'CHILD' ? 'Criança' : 'Geral'}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantidade</span>
                <span className="tabular-nums">
                  {selection.quantity}x R$ {selection.unitPrice.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary text-base sm:text-lg tabular-nums">
                  R$ {selection.total.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-4 p-2.5 bg-accent/50 rounded-lg">
            Ao comprar, você concorda com os{' '}
            <a href="#" className="text-primary hover:underline">Termos de Uso</a> e a{' '}
            <a href="#" className="text-primary hover:underline">Política de Reembolso</a>.
          </p>

          {paymentStatus === 'error' && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-center">
              Erro ao gerar PIX. Tente novamente.
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handlePay}
            disabled={paymentStatus === 'loading'}
          >
            {paymentStatus === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando PIX...
              </>
            ) : (
              'Pagar com PIX'
            )}
          </Button>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="border-b border-border px-4 pb-3">
            <div className="flex items-center justify-between">
              <DrawerTitle className="font-display text-xl">
              {paymentStatus === 'success' ? 'Pagamento Confirmado!' : paymentStatus === 'pix' ? 'Pagar com PIX' : 'Finalizar Compra'}
            </DrawerTitle>
              <DrawerClose asChild>
                <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-4">
          <DialogTitle className="font-display text-xl">
            {paymentStatus === 'success' ? 'Pagamento Confirmado!' : paymentStatus === 'pix' ? 'Pagar com PIX' : 'Finalizar Compra'}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
