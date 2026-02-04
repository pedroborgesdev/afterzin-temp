import { useState } from 'react';
import { Copy, Check, Loader2, X } from 'lucide-react';
import { Event } from '@/types/events';
import { TicketSelection } from './TicketSelectionModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { graphqlClient } from '@/lib/graphql';
import { MUTATION_CHECKOUT_PAY } from '@/lib/graphql-operations';
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
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success'>('pending');
  const { refreshTickets } = useAuth();
  const { toast } = useToast();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleCopyCode = () => {
    if (checkoutId) {
      navigator.clipboard.writeText(checkoutId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Código copiado!',
        description: 'Cole no app do seu banco para pagar.',
      });
    }
  };

  const handlePay = async () => {
    if (!checkoutId) {
      toast({ title: 'Erro', description: 'Checkout não disponível.', variant: 'destructive' });
      return;
    }
    setPaymentStatus('processing');
    try {
      const data = await graphqlClient.request<{
        checkoutPay: { success: boolean; message?: string | null };
      }>(MUTATION_CHECKOUT_PAY, { input: { checkoutId } });
      if (data?.checkoutPay?.success) {
        setPaymentStatus('success');
        await refreshTickets();
        toast({
          title: 'Pagamento confirmado! 🎉',
          description: 'Seu ingresso está na Mochila de Tickets.',
        });
        setTimeout(() => onSuccess(), 1500);
      } else {
        setPaymentStatus('pending');
        toast({
          title: 'Erro',
          description: data?.checkoutPay?.message ?? 'Não foi possível confirmar o pagamento.',
          variant: 'destructive',
        });
      }
    } catch {
      setPaymentStatus('pending');
      toast({
        title: 'Erro',
        description: 'Não foi possível confirmar o pagamento.',
        variant: 'destructive',
      });
    }
  };

  const content = (
    <div className="px-4 sm:px-6 pb-safe">
      {paymentStatus === 'success' ? (
        <div className="text-center py-8 sm:py-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 sm:w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Compra realizada!</h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            Seu ingresso está na Mochila de Tickets.
          </p>
        </div>
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

          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground mb-3">Código do pedido (PIX)</p>
            <button
              onClick={handleCopyCode}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted rounded-xl text-sm hover:bg-accent transition-colors min-h-touch touch-manipulation active:scale-[0.99]"
            >
              <span className="font-mono truncate flex-1 text-left text-xs">{checkoutId}</span>
              {copied ? (
                <Check className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <Copy className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
            </button>
          </div>

          <p className="text-xs sm:text-sm text-center text-muted-foreground mb-4">
            Após o pagamento, o ingresso estará na sua{' '}
            <span className="text-primary font-medium">Mochila de Tickets</span>.
          </p>

          <Button
            className="w-full"
            size="lg"
            onClick={handlePay}
            disabled={paymentStatus === 'processing'}
          >
            {paymentStatus === 'processing' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar pagamento'
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
                {paymentStatus === 'success' ? 'Pagamento Confirmado!' : 'Finalizar Compra'}
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
            {paymentStatus === 'success' ? 'Pagamento Confirmado!' : 'Finalizar Compra'}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
