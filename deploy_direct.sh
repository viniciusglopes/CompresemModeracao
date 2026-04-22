#!/bin/bash

# CompresemModeracao - Deploy Direto 
# Bob - 23/03/2026
# Script para deploy manual caso Coolify não esteja acessível

echo "🚀 CompresemModeracao - Deploy Direto"
echo "============================="
echo ""

# Configurações
PROJECT_NAME="compresemmoderacao"
PORT=3000
DOMAIN="csm.vinculodigital.com.br"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Parar containers existentes
log "Parando containers existentes..."
docker stop $PROJECT_NAME 2>/dev/null || true
docker rm $PROJECT_NAME 2>/dev/null || true

# Build da imagem
log "Buildando imagem Docker..."
docker build -t $PROJECT_NAME:latest .

if [ $? -eq 0 ]; then
    success "Build concluído"
else
    error "Falha no build"
    exit 1
fi

# Executar container
log "Iniciando container..."
docker run -d \
    --name $PROJECT_NAME \
    --restart unless-stopped \
    -p $PORT:3000 \
    -v ${PROJECT_NAME}-data:/app/data \
    -v ${PROJECT_NAME}-logs:/app/logs \
    -e NODE_ENV=production \
    -e PORT=3000 \
    $PROJECT_NAME:latest

if [ $? -eq 0 ]; then
    success "Container iniciado"
else
    error "Falha ao iniciar container"
    exit 1
fi

# Aguardar inicialização
log "Aguardando inicialização..."
sleep 10

# Testar saúde
log "Testando aplicação..."
if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
    success "Aplicação rodando corretamente!"
else
    error "Aplicação não respondeu ao health check"
    echo "Logs do container:"
    docker logs $PROJECT_NAME --tail 20
    exit 1
fi

# Mostrar informações
echo ""
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo ""
echo "🌐 URLs locais:"
echo "   Homepage: http://localhost:$PORT"
echo "   Admin: http://localhost:$PORT/admin"
echo "   API: http://localhost:$PORT/api/status"
echo ""
echo "📊 Status container:"
docker ps | grep $PROJECT_NAME
echo ""
echo "📝 Para acessar externamente:"
echo "   Configure proxy reverso para: localhost:$PORT"
echo "   Domínio sugerido: $DOMAIN"
echo ""
echo "⚙️ Comandos úteis:"
echo "   Logs: docker logs $PROJECT_NAME -f"
echo "   Stop: docker stop $PROJECT_NAME"
echo "   Restart: docker restart $PROJECT_NAME"