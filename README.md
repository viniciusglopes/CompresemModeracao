# 👜 Compre sem Moderação

> Sistema automatizado de monitoramento de ofertas e disparo de afiliados para grupos de WhatsApp, Telegram e redes sociais.

## 🎯 **Conceito**

Monitorar APIs de e-commerce (Mercado Livre, Shopee, Amazon), capturar promoções, aplicar links de afiliado e disparar automaticamente para:
- 📱 Grupos WhatsApp 
- 💬 Canais Telegram
- 📸 Instagram/TikTok (stories/posts)
- 🎨 Criativos automáticos

## 🏗️ **Arquitetura**

```
📦 CompresemModeracao/
├── 🔌 api/              # Integrações e-commerce
│   ├── mercadolivre/    # API Mercado Livre
│   ├── shopee/          # API Shopee  
│   ├── amazon/          # Amazon Associates
│   └── common/          # Funções comuns
├── 🎨 creative/         # Geração de criativos
│   ├── templates/       # Templates visuais
│   ├── generator/       # Gerador automático
│   └── assets/          # Imagens, fontes
├── 📱 dispatch/         # Sistema de envio
│   ├── whatsapp/        # WhatsApp (Evolution API)
│   ├── telegram/        # Telegram Bot
│   └── social/          # Redes sociais
├── 🗄️ data/            # Base de dados
│   ├── products/        # Produtos monitorados
│   ├── offers/          # Ofertas ativas
│   └── analytics/       # Métricas
├── ⚙️ config/           # Configurações
├── 📜 scripts/          # Automações
└── 📋 docs/             # Documentação
```

## 🚀 **MVP (Versão 1.0)**

### **Fase 1 - Base** 
- [x] Estrutura do projeto
- [ ] Integração Mercado Livre API
- [ ] Sistema de afiliados básico
- [ ] Disparo WhatsApp (usando FlowSender)

### **Fase 2 - Criativos**
- [ ] Templates de posts
- [ ] Geração automática de imagens
- [ ] Integração Telegram

### **Fase 3 - Social Media**
- [ ] Posts automáticos Instagram
- [ ] Stories automatizados
- [ ] Analytics e métricas

## 💰 **Monetização**

1. **Afiliados**: Comissão por venda
2. **Grupos Premium**: Ofertas exclusivas
3. **API as a Service**: Vender acesso
4. **Consultoria**: Setup personalizado

## 🔧 **Stack Técnica**

- **Backend**: Node.js/Python
- **APIs**: REST + Webhooks
- **Banco**: SQLite → PostgreSQL
- **Criativos**: Canvas API / Puppeteer
- **Deploy**: Docker + Coolify
- **Monitor**: Cron jobs + Heartbeats

## 📊 **KPIs**

- Ofertas monitoradas/dia
- CTR dos links de afiliado  
- Conversão por canal
- ROI por produto
- Crescimento dos grupos

## 🎯 **Diferenciais**

- ✅ **Automação Total**: Zero trabalho manual
- ✅ **Multi-plataforma**: WhatsApp + Telegram + Social  
- ✅ **Criativos Únicos**: Não é só link pelado
- ✅ **Analytics**: Dados para otimizar
- ✅ **Escalável**: Milhares de produtos

## 🚀 **Let's Build!**

**Criado por:** Bob + Vinícius G. Lopes  
**Data:** 23/03/2026  
**Status:** 🏗️ Em desenvolvimento  

---

*"Automatizar para escalar, escalar para lucrar!"* 💰