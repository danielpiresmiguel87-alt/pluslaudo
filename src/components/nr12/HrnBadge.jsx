import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const HRN_STYLES = {
  'RISCO DESPREZÍVEL': 'bg-green-100 text-green-800 hover:bg-green-100',
  'RISCO BAIXO': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  'RISCO MÉDIO': 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  'RISCO ALTO': 'bg-red-100 text-red-800 hover:bg-red-100',
  'RISCO MUITO ALTO': 'bg-red-900 text-white hover:bg-red-900',
};

export const HRN_RANK = {
  'RISCO DESPREZÍVEL': 1,
  'RISCO BAIXO': 2,
  'RISCO MÉDIO': 3,
  'RISCO ALTO': 4,
  'RISCO MUITO ALTO': 5,
};

export const HRN_CLASSES = ['RISCO DESPREZÍVEL', 'RISCO BAIXO', 'RISCO MÉDIO', 'RISCO ALTO', 'RISCO MUITO ALTO'];

export default function HrnBadge({ valor, classificacao }) {
  const style = HRN_STYLES[classificacao] || 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  return (
    <Badge className={cn('text-xs whitespace-nowrap', style)}>
      {valor != null ? `HRN ${valor}` : '—'}{classificacao ? ` · ${classificacao}` : ''}
    </Badge>
  );
}