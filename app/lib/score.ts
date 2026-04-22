export interface ScoreInput {
  vendas: number
  desconto_percent: number
  rating: number
  frete_gratis: boolean
  loja_premium: boolean
  comissao_percent: number
}

export interface ScoreResult {
  score: number
  detalhes: {
    vendas: number
    desconto: number
    rating: number
    frete: number
    loja: number
    comissao: number
  }
}

export function calcularScore(input: ScoreInput): ScoreResult {
  let vendas = 0
  if (input.vendas >= 5000) vendas = 30
  else if (input.vendas >= 1000) vendas = 20
  else if (input.vendas >= 100) vendas = 10
  else if (input.vendas >= 10) vendas = 5

  let desconto = 0
  if (input.desconto_percent >= 50) desconto = 25
  else if (input.desconto_percent >= 30) desconto = 15
  else if (input.desconto_percent >= 15) desconto = 5

  let rating = 0
  if (input.rating >= 4.5) rating = 20
  else if (input.rating >= 4.0) rating = 15
  else if (input.rating >= 3.5) rating = 10

  const frete = input.frete_gratis ? 10 : 0
  const loja = input.loja_premium ? 10 : 0
  const comissao = input.comissao_percent >= 10 ? 5 : 0

  return {
    score: vendas + desconto + rating + frete + loja + comissao,
    detalhes: { vendas, desconto, rating, frete, loja, comissao },
  }
}
