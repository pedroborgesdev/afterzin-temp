import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useProducerEvent } from '@/hooks/useProducerEvents';
import { graphqlClient } from '@/lib/graphql';
import { MUTATION_VALIDATE_TICKET } from '@/lib/graphql-operations';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, QrCode, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const STORAGE_KEY_PREFIX = 'ticketScanCount_';

export default function ProducerScanEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading } = useProducerEvent(eventId ?? undefined);
  const { toast } = useToast();
  const [scanCount, setScanCount] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [validating, setValidating] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanAreaId = 'qr-reader';

  useEffect(() => {
    if (!eventId) return;
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + eventId);
    setScanCount(stored ? parseInt(stored, 10) : 0);
  }, [eventId]);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
      if (eventId) localStorage.removeItem(STORAGE_KEY_PREFIX + eventId);
    };
  }, [eventId]);

  const incrementCount = () => {
    if (!eventId) return;
    const next = scanCount + 1;
    setScanCount(next);
    localStorage.setItem(STORAGE_KEY_PREFIX + eventId, String(next));
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (!eventId || validating) return;
    setValidating(true);
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
    try {
      const data = await graphqlClient.request<{
        validateTicket: { success: boolean; errorCode?: string; message?: string; ticket?: { ticketType?: { name: string }; owner?: { name: string } } };
      }>(MUTATION_VALIDATE_TICKET, { eventId, qrCode: decodedText });
      const result = data?.validateTicket;
      if (result?.success) {
        incrementCount();
        const name = result.ticket?.owner?.name ?? result.ticket?.ticketType?.name ?? 'Ingresso';
        toast({ title: 'Ingresso válido!', description: `${name} validado com sucesso.` });
      } else {
        toast({
          title: 'Ingresso inválido',
          description: result?.message ?? 'Código não reconhecido ou já utilizado.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível validar o ingresso.',
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    if (!scanning || !eventId) return;
    const el = document.getElementById(scanAreaId);
    if (!el) return;
    const scanner = new Html5Qrcode(scanAreaId);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 5, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => handleScanSuccess(decodedText),
        () => {}
      )
      .catch(() => {
        setScanning(false);
        toast({
          title: 'Câmera indisponível',
          description: 'Verifique as permissões ou use outro dispositivo.',
          variant: 'destructive',
        });
      });
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleScanSuccess uses eventId from closure
  }, [scanning, eventId]);

  const startScan = () => {
    if (!eventId) return;
    setScanning(true);
    setValidating(false);
  };

  const stopScan = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  if (isLoading || !eventId) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground mb-4">Evento não encontrado.</p>
          <Button asChild>
            <Link to="/produtor/validar">Voltar</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 sm:py-10 max-w-lg">
        <Link
          to="/produtor/validar"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <h1 className="font-display text-xl sm:text-2xl font-bold mb-1">{event.title}</h1>
        <p className="text-muted-foreground text-sm mb-6">Validação de ingressos por QR Code</p>

        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/50 border border-border mb-6">
          <span className="text-sm font-medium">Ingressos escaneados nesta sessão</span>
          <span className="text-2xl font-bold tabular-nums text-primary">{scanCount}</span>
        </div>

        {!scanning ? (
          <Button
            className="w-full h-14 text-lg"
            size="lg"
            onClick={startScan}
            disabled={validating}
          >
            {validating ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <QrCode className="w-6 h-6 mr-2" />
                Escanear
              </>
            )}
          </Button>
        ) : (
          <>
            <div id={scanAreaId} className="rounded-xl overflow-hidden border border-border mb-4" />
            <Button variant="outline" className="w-full" onClick={stopScan}>
              Parar câmera
            </Button>
          </>
        )}

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Ao sair desta tela, o contador será resetado.
        </p>
      </div>
    </Layout>
  );
}
