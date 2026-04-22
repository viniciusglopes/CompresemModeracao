#!/bin/bash

# Compre sem Moderação - Script Principal
# Bob - 23/03/2026
# Orquestra todo o processo: Monitor → Disparo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logs com estilo
header() {
    echo -e "${PURPLE}🛒 $1 🛒${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..50})${NC}"
}

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar dependências
check_dependencies() {
    log "🔍 Verificando dependências..."
    
    # Python
    if ! command -v python3 &> /dev/null; then
        error "Python3 não instalado"
        return 1
    fi
    
    # jq para JSON
    if ! command -v jq &> /dev/null; then
        warn "jq não instalado, instalando..."
        apt-get update && apt-get install -y jq > /dev/null 2>&1
    fi
    
    # requests para Python
    if ! python3 -c "import requests" 2>/dev/null; then
        warn "requests não instalado, instalando..."
        pip3 install requests > /dev/null 2>&1
    fi
    
    success "Dependências OK"
}

# Verificar configuração
check_config() {
    log "⚙️ Verificando configuração..."
    
    local config_file="$PROJECT_ROOT/config/config.json"
    
    if [ ! -f "$config_file" ]; then
        warn "Config não encontrado, copiando exemplo..."
        cp "$PROJECT_ROOT/config/config.example.json" "$config_file"
        error "Configure suas APIs em: $config_file"
        return 1
    fi
    
    # Verificar se tem as chaves básicas
    if ! jq '.apis.mercadolivre' "$config_file" > /dev/null 2>&1; then
        error "Configuração inválida em $config_file"
        return 1
    fi
    
    success "Configuração OK"
}

# Monitor de ofertas
monitor_ofertas() {
    header "MONITOR DE OFERTAS"
    
    log "🔍 Iniciando monitoramento Mercado Livre..."
    
    cd "$PROJECT_ROOT/api/mercadolivre"
    
    if python3 ml_monitor.py; then
        success "Monitoramento concluído"
        return 0
    else
        error "Falha no monitoramento"
        return 1
    fi
}

# Disparo WhatsApp
disparar_whatsapp() {
    header "DISPARO WHATSAPP"
    
    log "📱 Iniciando disparo WhatsApp..."
    
    cd "$PROJECT_ROOT/dispatch/whatsapp"
    chmod +x dispatcher.sh
    
    if ./dispatcher.sh; then
        success "Disparo WhatsApp concluído"
        return 0
    else
        error "Falha no disparo WhatsApp"
        return 1
    fi
}

# Relatório
gerar_relatorio() {
    header "RELATÓRIO"
    
    local ofertas_file="$PROJECT_ROOT/data/offers/ofertas_ml.json"
    
    if [ -f "$ofertas_file" ]; then
        local total=$(jq '.total_ofertas // 0' "$ofertas_file" 2>/dev/null || echo 0)
        local timestamp=$(jq -r '.timestamp // "N/A"' "$ofertas_file" 2>/dev/null)
        
        echo "📊 Ofertas encontradas: $total"
        echo "🕐 Última execução: $timestamp"
        echo "📁 Arquivo: $ofertas_file"
        
        # Top 3 ofertas
        echo ""
        echo "🏆 TOP 3 OFERTAS:"
        for i in $(seq 0 2); do
            local produto=$(jq ".ofertas[$i]" "$ofertas_file" 2>/dev/null)
            
            if [ "$produto" != "null" ] && [ -n "$produto" ]; then
                local titulo=$(echo "$produto" | jq -r '.titulo // "N/A"' | cut -c1-40)
                local preco=$(echo "$produto" | jq -r '.preco_atual // 0')
                local desconto=$(echo "$produto" | jq -r '.desconto // 0')
                
                echo "  $((i+1)). $titulo..."
                echo "     💰 R$ $preco (${desconto}% OFF)"
            fi
        done
    else
        warn "Nenhum arquivo de ofertas encontrado"
    fi
    
    echo ""
    echo "🔗 Logs: $PROJECT_ROOT/logs/"
}

# Modo automático (para cron)
auto_mode() {
    log "🤖 Modo automático iniciado"
    
    # Criar diretório de logs
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Log file com timestamp
    local logfile="$PROJECT_ROOT/logs/csm_$(date +%Y%m%d_%H%M%S).log"
    
    # Executar com log
    {
        echo "🚀 Compre sem Moderação - Execução Automática"
        echo "Data: $(date)"
        echo ""
        
        if check_dependencies && check_config; then
            if monitor_ofertas; then
                sleep 2
                disparar_whatsapp
            fi
        fi
        
        echo ""
        gerar_relatorio
        
    } | tee "$logfile"
}

# Menu interativo
interactive_mode() {
    while true; do
        clear
        echo ""
        header "COMPRE SEM MODERAÇÃO - MENU PRINCIPAL"
        echo ""
        echo "1. 🔍 Monitor de Ofertas"
        echo "2. 📱 Disparar WhatsApp" 
        echo "3. 🔄 Executar Completo (Monitor + Disparo)"
        echo "4. 🌐 Iniciar Interface Web"
        echo "5. ⚙️  Verificar Configuração"
        echo "6. 📊 Ver Relatório"
        echo "7. 🚪 Sair"
        echo ""
        read -p "Escolha uma opção (1-7): " opcao
        
        case $opcao in
            1)
                monitor_ofertas
                read -p "Pressione Enter para continuar..."
                ;;
            2)
                disparar_whatsapp
                read -p "Pressione Enter para continuar..."
                ;;
            3)
                if monitor_ofertas; then
                    sleep 2
                    disparar_whatsapp
                fi
                read -p "Pressione Enter para continuar..."
                ;;
            4)
                "$PROJECT_ROOT/scripts/start_web.sh"
                read -p "Pressione Enter para continuar..."
                ;;
            5)
                check_dependencies
                check_config
                read -p "Pressione Enter para continuar..."
                ;;
            6)
                gerar_relatorio
                read -p "Pressione Enter para continuar..."
                ;;
            7)
                echo "👋 Até logo!"
                exit 0
                ;;
            *)
                error "Opção inválida"
                sleep 1
                ;;
        esac
    done
}

# Menu de help
show_help() {
    echo "👜 Compre sem Moderação - Sistema de Ofertas Automático"
    echo ""
    echo "Uso: $0 [OPÇÃO]"
    echo ""
    echo "Opções:"
    echo "  auto       Execução automática (ideal para cron)"
    echo "  monitor    Apenas monitorar ofertas"
    echo "  dispatch   Apenas disparar ofertas"
    echo "  config     Verificar configuração"
    echo "  report     Ver relatório"
    echo "  help       Mostrar esta ajuda"
    echo ""
    echo "Sem opções: Modo interativo"
    echo ""
    echo "Exemplos:"
    echo "  $0 auto      # Executar automaticamente"
    echo "  $0 monitor   # Só buscar ofertas"
    echo "  $0 dispatch  # Só enviar mensagens"
}

# Função principal
main() {
    # Banner
    echo ""
    echo -e "${PURPLE}     🛒 COMPRE SEM MODERAÇÃO 🛒${NC}"
    echo -e "${PURPLE}   Ofertas Automáticas 24/7${NC}"
    echo -e "${PURPLE}   Bob + Vinícius G. Lopes${NC}"
    echo ""
    
    case "${1:-interactive}" in
        auto)
            auto_mode
            ;;
        monitor)
            check_dependencies && check_config && monitor_ofertas
            ;;
        dispatch)
            disparar_whatsapp
            ;;
        config)
            check_dependencies && check_config
            ;;
        report)
            gerar_relatorio
            ;;
        help|--help|-h)
            show_help
            ;;
        interactive|"")
            interactive_mode
            ;;
        *)
            error "Opção inválida: $1"
            show_help
            exit 1
            ;;
    esac
}

# Tornar executável
chmod +x "$PROJECT_ROOT/dispatch/whatsapp/dispatcher.sh"

# Executar
main "$@"