import { test } from 'node:test'
import assert from 'node:assert/strict'
import { escolhaExplicita, grupoGeral, gruposCompativeis, resolverAlvos, type GrupoBase } from './grupos-alvo'

// Espelho do banco em 01/10 (nichos e JSONB).
const GERAL: GrupoBase = { id: 'g-geral', nome: 'Compre sem Moderação (geral)', canal: 'whatsapp', grupo_id: '120363425639175424@g.us', nichos: [] }
const BELEZA: GrupoBase = { id: 'g-beleza', nome: 'Beleza - Compres sem moderação', canal: 'whatsapp', grupo_id: '120363409654290409@g.us', nichos: ['beleza'] }
const BEBES: GrupoBase = { id: 'g-bebes', nome: 'Bebês', canal: 'telegram', grupo_id: '-100', nichos: ['bebes'] }
const NULO: GrupoBase = { id: 'g-nulo', nome: 'Nichos null', canal: 'whatsapp', grupo_id: 'x', nichos: null }
const grupos = [GERAL, BELEZA, BEBES]
const ids = (gs: GrupoBase[]) => gs.map(g => g.id)

test('grupo com nichos [] ou null e geral', () => {
  assert.equal(grupoGeral(GERAL), true)
  assert.equal(grupoGeral(NULO), true)
  assert.equal(grupoGeral({ nichos: [''] }), true)
  assert.equal(grupoGeral(BELEZA), false)
})

test('produto de beleza vai para geral + beleza', () => {
  assert.deepEqual(ids(gruposCompativeis(grupos, 'beleza')), ['g-geral', 'g-beleza'])
})

test('nicho legado e normalizado (perfumaria -> beleza)', () => {
  assert.deepEqual(ids(gruposCompativeis(grupos, 'perfumaria')), ['g-geral', 'g-beleza'])
})

test('produto sem categoria (null/vazio/desconhecido) so vai para o geral', () => {
  for (const n of [null, undefined, '', '   ', 'xyz']) {
    assert.deepEqual(ids(gruposCompativeis(grupos, n)), ['g-geral'], `nicho=${String(n)}`)
  }
})

test('caso de 01/10: garimpado sem nicho e so grupos com filtro => 0 grupos', () => {
  assert.deepEqual(gruposCompativeis([BELEZA, BEBES], null), [])
})

test('escolha explicita vence o filtro de categoria', () => {
  assert.deepEqual(ids(resolverAlvos(grupos, null, ['g-beleza'])), ['g-beleza'])
  assert.deepEqual(ids(resolverAlvos(grupos, 'bebes', ['g-beleza', 'g-geral'])), ['g-geral', 'g-beleza'])
})

test('escolha explicita vazia = nenhum grupo; id inativo/inexistente e ignorado', () => {
  assert.deepEqual(resolverAlvos(grupos, 'beleza', []), [])
  assert.deepEqual(ids(resolverAlvos(grupos, 'beleza', ['nao-existe', 'g-bebes'])), ['g-bebes'])
})

test('sem escolha explicita usa a categoria', () => {
  assert.deepEqual(ids(resolverAlvos(grupos, 'bebes', undefined)), ['g-geral', 'g-bebes'])
  assert.deepEqual(ids(resolverAlvos(grupos, 'bebes', null)), ['g-geral', 'g-bebes'])
})

test('escolhaExplicita: mapa por produto > grupo_ids > nada', () => {
  assert.equal(escolhaExplicita('p1', {}), undefined)
  assert.deepEqual(escolhaExplicita('p1', { grupo_ids: ['a'] }), ['a'])
  assert.deepEqual(escolhaExplicita('p1', { grupos_por_produto: { p1: ['b'] }, grupo_ids: ['a'] }), ['b'])
  // mapa sem o produto e sem grupo_ids => produto nao foi escolhido => nenhum grupo
  assert.deepEqual(escolhaExplicita('p2', { grupos_por_produto: { p1: ['b'] } }), [])
  // mapa sem o produto, mas com grupo_ids => vale o grupo_ids
  assert.deepEqual(escolhaExplicita('p2', { grupos_por_produto: { p1: ['b'] }, grupo_ids: ['a'] }), ['a'])
  // lixo no corpo e ignorado
  assert.deepEqual(escolhaExplicita('p1', { grupo_ids: ['a', 3, null] }), ['a'])
  assert.equal(escolhaExplicita('p1', { grupo_ids: 'a' }), undefined)
})
