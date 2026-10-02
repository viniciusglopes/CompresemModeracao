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

const SET_NICHOS: ReadonlySet<string> = new Set(NICHOS_VALIDOS)

export function isNichoValido(v: unknown): v is Nicho {
  return typeof v === 'string' && SET_NICHOS.has(v)
}

/** Ids legados que rotas antigas gravavam e que NAO existem no cadastro de grupos. */
export const NICHOS_LEGADOS: Record<string, Nicho> = {
  casa: 'casa_moveis',
  pet: 'pet_shop',
  moda_masc: 'moda',
  moda_fem: 'moda',
  joias: 'moda',
  relogios: 'moda',
  acessorios: 'moda',
  bolsas: 'moda',
  lingerie: 'moda',
  beleza_saude: 'beleza',
  celulares: 'eletronicos',
  perfumaria: 'beleza',
  eletro: 'eletrodomesticos',
  eletroportateis: 'eletrodomesticos',
}

/** Normaliza um nicho ja gravado: traduz legado, descarta desconhecido. */
export function normalizarNicho(v: unknown): Nicho | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  if (SET_NICHOS.has(s)) return s as Nicho
  return NICHOS_LEGADOS[s] ?? null
}
