import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

/**
 * Shown when the user cancels Stripe Checkout.
 * No charge is made — the user can try again.
 */
export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container py-16 sm:py-20 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-3">Pagamento cancelado</h1>
        <p className="text-muted-foreground mb-8">
          Seu pagamento não foi concluído. Nenhuma cobrança foi realizada.
        </p>
        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={() => navigate(-1)}>
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Voltar para eventos
          </Button>
        </div>
      </div>
    </Layout>
  );
}
