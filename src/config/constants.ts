export const SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxNR65gAhmYqrh32RPZyAnOz7yco-POGl2jMHOJaGGVpY8ETbQQ1AuWQDHO8gED-2zw/exec";
export const SHEET_TIPO = "Atividades";

export const GEO_CONTEXT = "Fortaleza, CE, Brasil";
export const DEFAULT_CENTER: [number, number] = [-3.7319, -38.5267];
export const DEFAULT_ZOOM = 11;

export const EXCLUDED_SERVICE_TYPES = [
  'Reuniao', 'Na base', 'Refeicao', 'Apoio a outro tecnico',
  'Manutencao de veiculo', 'Ausência por motivo medico'
].map(s => s.toLowerCase());

export const REQUIRED_COLUMNS = [
  'Recurso', 
  'Intervalo de Tempo', 
  'Tipo de Atividade', 
  'Cód de Baixa 1', 
  'Duração'
];

export const TARGET_ACTIVITIES = [
  'MUDANCA DE PACOTE',
  'INSTALACAO',
  'INST GPON - INST CABO'
];
