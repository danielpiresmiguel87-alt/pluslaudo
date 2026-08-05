import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturou:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-2xl mx-auto p-6">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Algo deu errado ao exibir esta página</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || 'Erro inesperado.'}
              </p>
              <p className="text-sm text-muted-foreground">
                Tente recarregar a página. Se o problema persistir, contate o suporte.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()}>Recarregar</Button>
                <Button variant="outline" onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}>
                  Voltar ao início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}