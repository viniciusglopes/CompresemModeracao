#!/bin/bash

# Compre sem Moderação - WhatsApp Dispatcher
# Bob - 23/03/2026
# Dispatcher de ofertas para grupos WhatsApp

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
EVOLUTION_URL="http://evo-atwauj1cau8wonjpjhiu4ldc.31.97.42.252.sslip.io"
EVOLUTION_TOKEN="mqNrrltfU15iyPZzEV3wnKRfhUUjgu3M"
INSTANCE="iphone"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logs
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Função para enviar mensagem WhatsApp
send_whatsapp() {
    local grupo="$1"
    local mensagem="$2"
    
    log "📱 Enviando para grupo: ${grupo:0:20}..."
    
    result=$(curl -s -X POST "$EVOLUTION_URL/message/sendText/$INSTANCE" \
        -H "Content-Type: application/json" \
        -H "apikey: $EVOLUTION_TOKEN" \
        -d "{
            \"number\": \"$grupo\",
            \"text\": \"$mensagem\"
        }")
    
    if echo "$result" | grep -q "PENDING"; then
        success "WhatsApp enviado para grupo"
        return 0
    else
        error "Falha no envio WhatsApp: $(echo $result | jq -r '.message // "Erro desconhecido"' 2>/dev/null || echo "Falha")"
        return 1
    fi
}

# Função para formatar oferta
formatar_oferta() {
    local produto_json="$1"
    
    # Extrair dados do JSON
    local titulo=$(echo "$produto_json" | jq -r '.titulo // "Produto"' | cut -c1-60)
    local preco=$(echo "$produto_json" | jq -r '.preco_atual // 0')
    local desconto=$(echo "$produto_json" | jq -r '.desconto // 0')
    local url=$(echo "$produto_json" | jq -r '.url_produto // ""')
    local frete_gratis=$(echo "$produto_json" | jq -r '.frete_gratis // false')
    
    # Emojis baseados na categoria
    local emoji="🔥"
    if echo "$titulo" | grep -qi "eletronico\|celular\|notebook"; then
        emoji="📱"
    elif echo "$titulo" | grep -qi "casa\|cozinha"; then
        emoji="🏠" 
    elif echo "$titulo" | grep -qi "moda\|roupa"; then
        emoji="👕"
    fi
    
    # Frete gratis
    local frete_texto=""
    if [ "$frete_gratis" = "true" ]; then
        frete_texto=" 🚚 FRETE GRÁTIS"
    fi
    
    # Montar mensagem
    cat << EOF
$emoji *COMPRE SEM MODERAÇÃO* $emoji

💰 *R$ $preco* (${desconto}% OFF)
📦 $titulo$frete_texto

🔗 *Link:* $url

⚡ *OFERTA RELÂMPAGO!*
🏃‍♂️ Corra que é por tempo limitado!

_Enviado pelo Compre sem Moderação 🤖_
EOF
}

# Função para disparar ofertas
disparar_ofertas() {
    local ofertas_file="$PROJECT_ROOT/data/offers/ofertas_ml.json"
    
    if [ ! -f "$ofertas_file" ]; then
        error "Arquivo de ofertas não encontrado: $ofertas_file"
        return 1
    fi
    
    log "📋 Carregando ofertas de: $ofertas_file"
    
    # Carregar grupos de config
    local config_file="$PROJECT_ROOT/config/config.json"
    if [ ! -f "$config_file" ]; then
        error "Config não encontrado. Use config.example.json como base"
        return 1
    fi
    
    # Grupos de exemplo (TODO: ler do config)
    local grupos=(
        "5531998048691"  # Número pessoal para teste
    )
    
    # Ler ofertas
    local total_ofertas=$(jq '.ofertas | length' "$ofertas_file" 2>/dev/null || echo 0)
    log "📦 Total de ofertas: $total_ofertas"
    
    if [ "$total_ofertas" -eq 0 ]; then
        error "Nenhuma oferta para disparar"
        return 1
    fi
    
    # Disparar para cada grupo
    for grupo in "${grupos[@]}"; do
        log "🎯 Disparando para grupo: $grupo"
        
        # Pegar top 3 ofertas
        for i in $(seq 0 2); do
            local produto=$(jq ".ofertas[$i]" "$ofertas_file" 2>/dev/null)
            
            if [ "$produto" = "null" ] || [ -z "$produto" ]; then
                break
            fi
            
            local mensagem=$(formatar_oferta "$produto")
            
            if send_whatsapp "$grupo" "$mensagem"; then
                success "Oferta $((i+1)) enviada com sucesso"
                sleep 3  # Evitar spam
            else
                error "Falha no envio da oferta $((i+1))"
            fi
        done
        
        sleep 5  # Pausa entre grupos
    done
}

# Função principal
main() {
    echo ""
    echo "👜 Compre sem Moderação - WhatsApp Dispatcher"
    echo "======================================"
    echo ""
    
    # Testar Evolution API
    log "🔍 Testando Evolution API..."
    if curl -s "$EVOLUTION_URL/manager/" > /dev/null; then
        success "Evolution API: Online"
    else
        error "Evolution API: Offline"
        exit 1
    fi
    
    echo ""
    disparar_ofertas
    
    echo ""
    success "🎉 Disparo concluído!"
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi