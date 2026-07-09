export function formatEnvironmentConditions(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object') return formatObj(parsed);
      return value;
    } catch {
      return value;
    }
  }
  if (typeof value === 'object') return formatObj(value);
  return String(value);
}

function formatObj(v) {
  const parts = [];
  if (v.periodo) parts.push(`Período: ${v.periodo}`);
  if (v.tempo) parts.push(`Tempo: ${v.tempo}`);
  if (v.temperatura) parts.push(`Temperatura: ${v.temperatura}°C`);
  if (v.umidade) parts.push(`Umidade: ${v.umidade}%`);
  return parts.join(' | ');
}