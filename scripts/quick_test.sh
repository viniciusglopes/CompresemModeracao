#!/bin/bash

# Compre sem Moderação - Teste Rápido
# Billy Bot - 23/03/2026
# Script para testar o sistema sem configurar APIs

echo "👜 Compre sem Moderação - Teste Rápido"
echo "==============================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "📁 Projeto: $PROJECT_ROOT"
echo "🗂️ Estrutura:"
find "$PROJECT_ROOT" -type f -name "*.py" -o -name "*.sh" -o -name "*.json" -o -name "*.md" | grep -v ".git" | sort

echo ""
echo "🔧 Scripts executáveis:"
find "$PROJECT_ROOT" -type f -executable | grep -v ".git"

echo ""
echo "📊 Estatísticas:"
echo "- Arquivos Python: $(find "$PROJECT_ROOT" -name "*.py" | wc -l)"
echo "- Scripts Shell: $(find "$PROJECT_ROOT" -name "*.sh" | wc -l)"
echo "- Configs JSON: $(find "$PROJECT_ROOT" -name "*.json" | wc -l)"
echo "- Total LOC: $(find "$PROJECT_ROOT" -name "*.py" -o -name "*.sh" -o -name "*.md" | grep -v ".git" | xargs wc -l | tail -1 | awk '{print $1}')"

echo ""
echo "🎯 Para usar:"
echo "1. cp config/config.example.json config/config.json"
echo "2. Configure suas APIs no config.json"
echo "3. ./scripts/run_csm.sh auto"

echo ""
echo "✅ Sistema pronto para configuração!"