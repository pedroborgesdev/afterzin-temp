import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Backpack } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Shown after Stripe Checkout redirect on successful PIX payment.
 * Waits for the webhook to process, then refreshes tickets.
 */
export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { refreshTickets } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for webhook to process the payment and create tickets
    const refresh = async () => {
      // Give the webhook a moment to fire and process
      await new Promise((r) => setTimeout(r, 3000));
      await refreshTickets();
      setLoading(false);
    };
    refresh();
  }, []);

  return (
    <Layout>
      <div className="container py-16 sm:py-20 text-center max-w-md mx-auto">
        {loading ? (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-3">Processando pagamento...</h1>
            <p className="text-muted-foreground">
              Aguarde enquanto confirmamos seu pagamento via PIX.
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 animate-scale-in">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-3">Pagamento confirmado! 🎉</h1>
            <p className="text-muted-foreground mb-8">
              Seu ingresso já está disponível na sua Mochila de Tickets.
            </p>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => navigate('/mochila')} className="gap-2">
                <Backpack className="w-5 h-5" />
                Ver meus ingressos
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Explorar mais eventos
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
