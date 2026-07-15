import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, XCircle, Clock, CalendarClock, AlertTriangle } from 'lucide-react';

export default function SummaryCards({ total, aprovados, reprovados, pendentes, vencendo, vencidos, onFilter }) {
  const cards = [
    { label: 'Total', value: total, icon: FileText, color: 'text-blue-500', border: 'border-blue-200', filter: null },
    { label: 'Aprovados', value: aprovados, icon: CheckCircle, color: 'text-green-500', border: 'border-green-200', filter: 'aprovado' },
    { label: 'Reprovados', value: reprovados, icon: XCircle, color: 'text-red-500', border: 'border-red-200', filter: 'reprovado' },
    { label: 'Pendentes', value: pendentes, icon: Clock, color: 'text-amber-500', border: 'border-amber-200', filter: 'pendente' },
    { label: 'Vencendo', value: vencendo, icon: CalendarClock, color: 'text-orange-500', border: 'border-orange-200', filter: 'vencendo' },
    { label: 'Vencidos', value: vencidos, icon: AlertTriangle, color: 'text-red-600', border: 'border-red-300', filter: 'vencido' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Button
            key={c.label}
            variant="outline"
            className={`h-auto justify-start ${c.border} hover:shadow-md transition-shadow`}
            onClick={() => onFilter?.(c.filter)}
          >
            <Icon className={`h-7 w-7 ${c.color}`} />
            <div className="text-left">
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </Button>
        );
      })}
    </div>
  );
}