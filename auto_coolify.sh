#!/bin/bash

# CompresemModeracao - Auto Deploy Coolify
# Bob - 23/03/2026
# Script para você executar no seu servidor

echo "🚀 CompresemModeracao - Auto Deploy Coolify"
echo "==================================="
echo ""

# Verificar se está no servidor correto
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado!"
    echo "Execute este script no seu servidor com Coolify"
    exit 1
fi

# Verificar se Coolify está rodando
if ! docker ps | grep -q coolify; then
    echo "❌ Coolify não está rodando!"
    echo "Inicie o Coolify primeiro"
    exit 1
fi

echo "✅ Docker encontrado"
echo "✅ Coolify detectado"
echo ""

# Preparar deploy
echo "📦 Preparando deploy..."

# Clonar repo (se não existir)
if [ ! -d "/tmp/CompresemModeracao" ]; then
    echo "📥 Clonando repositório..."
    git clone https://github.com/viniciusglopes/CompresemModeracao.git /tmp/CompresemModeracao
fi

cd /tmp/CompresemModeracao

# Build direto (temporário)
echo "🔨 Buildando aplicação..."
docker build -t compresemmoderacao:latest .

# Executar com proxy
echo "🚀 Iniciando aplicação..."
docker run -d \
    --name compresemmoderacao \
    --restart unless-stopped \
    --network coolify \
    -p 3000:3000 \
    -e NODE_ENV=production \
    -e PORT=3000 \
    compresemmoderacao:latest

echo ""
echo "🎉 APLICAÇÃO RODANDO!"
echo ""
echo "🌐 Para configurar no Coolify:"
echo "1. Acesse painel Coolify"
echo "2. New Application"
echo "3. Use estas configurações:"
echo ""
echo "   Name: CompresemModeracao"
echo "   Git: https://github.com/viniciusglopes/CompresemModeracao.git"
echo "   Domain: csm.vinculodigital.com.br"
echo "   Port: 3000"
echo "   Build: Dockerfile"
echo ""
echo "🔗 Temporário: http://localhost:3000"
echo ""
echo "Precisa de ajuda? Chame o Billy!"