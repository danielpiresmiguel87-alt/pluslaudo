import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, CheckCircle, XCircle, Clock, CalendarClock, AlertTriangle, ClipboardList } from 'lucide-react';

export default function SummaryCards({ total, aprovados, reprovados, pendentes, vencendo, vencidos }) {
  const cards = [
    { label: 'Total', value: total, icon: FileText, color: 'text-blue-500', border: 'border-blue-200' },
    { label: 'Aprovados', value: aprovados, icon: CheckCircle, color: 'text-green-500', border: 'border-green-200' },
    { label: 'Reprovados', value: reprovados, icon: XCircle, color: 'text-red-500', border: 'border-red-200' },
    { label: 'Pendentes', value: pendentes, icon: Clock, color: 'text-amber-500', border: 'border-amber-200' },
    { label: 'Vencendo', value: vencendo, icon: CalendarClock, color: 'text-orange-500', border: 'border-orange-200' },
    { label: 'Vencidos', value: vencidos, icon: AlertTriangle, color: 'text-red-600', border: 'border-red-300' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className={c.border}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Icon className={`h-7 w-7 ${c.color}`} />
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}