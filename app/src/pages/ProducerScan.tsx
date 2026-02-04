import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProducerEvents } from '@/hooks/useProducerEvents';
import { Skeleton } from '@/components/ui/skeleton';
import { QrCode, ArrowLeft, Calendar } from 'lucide-react';

export default function ProducerScan() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: allEvents = [], isLoading: eventsLoading } = useProducerEvents();

  const scanableEvents = allEvents.filter(
    (e) => e.status === 'PUBLISHED' || e.status === 'PAUSED'
  );

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-12 flex justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground mb-4">Faça login para validar ingressos.</p>
          <Button asChild>
            <Link to="/auth?redirect=/produtor/validar">Entrar</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 sm:py-10 max-w-2xl">
        <Link
          to="/produtor"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">Validar ingressos</h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-8">
          Selecione o evento para abrir a câmera e escanear o QR Code do ingresso.
        </p>

        {eventsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : scanableEvents.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-60" />
            <p>Nenhum evento publicado ou pausado no momento.</p>
            <p className="text-sm mt-1">Publique um evento para validar ingressos.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {scanableEvents.map((event) => (
              <li key={event.id}>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 px-4"
                  asChild
                >
                  <Link to={`/produtor/validar/${event.id}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-semibold truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                    </div>
                    <QrCode className="w-5 h-5 shrink-0 text-muted-foreground ml-auto" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
