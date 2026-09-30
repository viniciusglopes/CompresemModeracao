// Lista canonica de nichos — sem imports, pode ser usada no cliente e no servidor.
// Extraida de app/admin/grupos/page.tsx — e a lista que o admin usa pra marcar
// os nichos de cada grupo. Qualquer id fora daqui nunca casa com grupo nenhum.

export const NICHOS_VALIDOS = [
  'eletronicos',
  'eletrodomesticos',
  'informatica',
  'audio_video',
  'cameras',
  'games',
  'moda',
  'calcados',
  'beleza',
  'casa_moveis',
  'ferramentas',
  'esportes',
  'bebes',
  'brinquedos',
  'veiculos_acess',
  'livros',
  'saude',
  'alimentos',
  'musica',
  'pet_shop',
] as const

export type Nicho = (typeof NICHOS_VALIDOS)[number]

/** Rotulo de cada nicho (mesmos textos da tela /admin/grupos). */
export const NICHO_LABEL: Record<Nicho, string> = {
  eletronicos: 'Eletrônicos',
  eletrodomesticos: 'Eletrodomésticos',
  informatica: 'Informática',
  audio_video: 'Áudio e Vídeo',
  cameras: 'Câmeras',
  games: 'Games',
  moda: 'Moda',
  calcados: 'Calçados',
  beleza: 'Beleza',
  casa_moveis: 'Casa e Móveis',
  ferramentas: 'Ferramentas',
  esportes: 'Esportes',
  bebes: 'Bebês',
  brinquedos: 'Brinquedos',
  veiculos_acess: 'Veículos',
  livros: 'Livros',
  saude: 'Saúde',
  alimentos: 'Alimentos',
  musica: 'Música',
  pet_shop: 'Pet Shop',
}
