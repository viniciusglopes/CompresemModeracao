import { NextResponse } from 'next/server'
import { TODOS_NICHOS } from '../mercadolivre/route'

export async function GET() {
  const nichos = Object.entries(TODOS_NICHOS).map(([id, n]) => ({
    id,
    label: n.label,
    category: n.category,
    emoji: n.emoji,
  }))
  return NextResponse.json({ nichos })
}
