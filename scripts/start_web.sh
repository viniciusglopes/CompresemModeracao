#!/bin/bash

# CompresemModeracao - Iniciar Servidor Web
# Bob - 23/03/2026

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
WEB_DIR="$PROJECT_ROOT/web/backend"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logs
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

# Verificar se Node.js está instalado
check_nodejs() {
    if ! command -v node &> /dev/null; then
        error "Node.js não está instalado!"
        echo "📝 Para instalar:"
        echo "curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
        echo "sudo apt-get install -y nodejs"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm não está instalado!"
        exit 1
    fi
    
    success "Node.js $(node --version) e npm $(npm --version) encontrados"
}

# Instalar dependências
install_dependencies() {
    log "📦 Verificando dependências..."
    
    cd "$WEB_DIR"
    
    if [ ! -d "node_modules" ]; then
        warn "Dependências não encontradas, instalando..."
        npm install
        if [ $? -eq 0 ]; then
            success "Dependências instaladas"
        else
            error "Falha na instalação das dependências"
            exit 1
        fi
    else
        success "Dependências já instaladas"
    fi
}

# Verificar porta
check_port() {
    local port=${1:-3000}
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        warn "Porta $port já está em uso!"
        echo "🔍 Processo usando a porta:"
        lsof -Pi :$port -sTCP:LISTEN
        echo ""
        read -p "Continuar mesmo assim? (y/N): " choice
        case "$choice" in 
            y|Y ) 
                log "Continuando..."
                ;;
            * ) 
                echo "Cancelado pelo usuário"
                exit 1
                ;;
        esac
    fi
}

# Iniciar servidor
start_server() {
    local mode=${1:-production}
    
    cd "$WEB_DIR"
    
    log "🚀 Iniciando servidor web..."
    
    if [ "$mode" = "dev" ]; then
        log "Modo desenvolvimento (auto-reload)"
        if command -v nodemon &> /dev/null; then
            npm run dev
        else
            warn "nodemon não encontrado, usando modo normal"
            npm start
        fi
    else
        log "Modo produção"
        npm start
    fi
}

# Mostrar informações
show_info() {
    echo ""
    success "🎉 Servidor CompresemModeracao iniciado com sucesso!"
    echo ""
    echo "🌐 URLs disponíveis:"
    echo "   📱 Homepage: http://localhost:3000"
    echo "   🔐 Admin: http://localhost:3000/admin"
    echo "   🔌 API: http://localhost:3000/api/status"
    echo "   ❤️ Health: http://localhost:3000/health"
    echo ""
    echo "⚙️ Controles:"
    echo "   Ctrl+C para parar o servidor"
    echo "   Logs em tempo real abaixo"
    echo ""
}

# Menu de opções
show_menu() {
    header "COMPRESEMMODERACAO WEB SERVER"
    echo ""
    echo "1. 🚀 Iniciar servidor (produção)"
    echo "2. 🔧 Iniciar servidor (desenvolvimento)"  
    echo "3. 📦 Apenas instalar dependências"
    echo "4. 🔍 Verificar status"
    echo "5. 🚪 Sair"
    echo ""
    read -p "Escolha uma opção (1-5): " choice
    
    case $choice in
        1)
            main "start"
            ;;
        2)
            main "dev"
            ;;
        3)
            check_nodejs
            install_dependencies
            success "Setup concluído!"
            ;;
        4)
            check_status
            ;;
        5)
            echo "👋 Até logo!"
            exit 0
            ;;
        *)
            error "Opção inválida"
            sleep 1
            show_menu
            ;;
    esac
}

# Verificar status
check_status() {
    log "🔍 Verificando status..."
    
    if curl -s http://localhost:3000/health > /dev/null; then
        success "Servidor online!"
        echo ""
        curl -s http://localhost:3000/health | jq 2>/dev/null || curl -s http://localhost:3000/health
    else
        warn "Servidor offline"
    fi
    
    echo ""
    read -p "Pressione Enter para continuar..."
    show_menu
}

# Função principal
main() {
    local action=${1:-menu}
    
    # Banner
    header "COMPRESEMMODERACAO WEB SERVER"
    echo "🔗 Interface web moderna para o sistema de ofertas"
    echo "📱 Homepage pública + Dashboard admin"
    echo ""
    
    case $action in
        start)
            check_nodejs
            install_dependencies
            check_port 3000
            show_info
            start_server production
            ;;
        dev)
            check_nodejs
            install_dependencies
            check_port 3000
            show_info
            start_server dev
            ;;
        menu)
            show_menu
            ;;
        *)
            echo "Uso: $0 [start|dev|menu]"
            echo ""
            echo "  start  - Iniciar em produção"
            echo "  dev    - Iniciar em desenvolvimento"
            echo "  menu   - Mostrar menu interativo"
            ;;
    esac
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi