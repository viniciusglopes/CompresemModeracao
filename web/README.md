# 🖥️ CompresemModeracao Web Dashboard

Interface web moderna para monitoramento e gerenciamento de ofertas automáticas.

## 🎯 **Funcionalidades**

### **👤 Painel Admin (Login Vinny):**
- 📊 Dashboard com métricas em tempo real
- ⚙️ Configuração de APIs e filtros
- 📱 Teste de envios WhatsApp/Telegram
- 📈 Analytics de conversão
- 🎨 Preview de criativos

### **🛒 Página Pública (Estilo Gafanho.to):**
- 🃏 Cards de ofertas atualizadas
- 🔥 Badges de desconto destacados
- 🔍 Busca e filtros por categoria
- 📱 Layout responsivo mobile-first
- ⚡ Loading automático (infinite scroll)

### **🔧 Recursos Técnicos:**
- 🚀 SPA (Single Page Application)
- 📡 WebSocket para updates real-time
- 🔐 Autenticação JWT
- 📱 PWA (Progressive Web App)
- 🎨 Design system próprio

## 🏗️ **Arquitetura**

```
web/
├── 🎨 frontend/           # Interface do usuário
│   ├── public/            # Assets públicos
│   ├── src/
│   │   ├── components/    # Componentes React/Vue
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── styles/        # CSS/SCSS
│   │   └── utils/         # Utilitários JS
│   └── package.json
├── 🔧 backend/            # API e servidor
│   ├── routes/            # Endpoints API
│   ├── models/            # Modelos de dados
│   ├── middleware/        # Auth, CORS, etc.
│   ├── services/          # Integrações (ML, Evolution)
│   └── server.js
└── 📦 assets/             # Imagens, ícones, etc.
```

## 🚀 **Stack Proposta**

### **Frontend:**
- ⚡ **Vite + React** (ou Vue.js)
- 🎨 **Tailwind CSS** + Shadcn/UI
- 📊 **Chart.js** para gráficos
- 📡 **Socket.io** para real-time
- 📱 **PWA** capabilities

### **Backend:**
- 🟢 **Node.js + Express** (ou FastAPI Python)
- 🗃️ **SQLite → PostgreSQL**
- 🔐 **JWT Authentication**
- 📡 **WebSocket** support
- 🔄 **Cron jobs** integrados

### **Deploy:**
- 🐳 **Docker** containerization
- ☁️ **Coolify** deployment
- 🌐 **Subdomain**: csm.vinculodigital.com.br

## 📱 **Protótipo das Telas**

### **1. 🏠 Homepage Pública:**
```
🛒 COMPRE SEM MODERAÇÃO
[Buscar ofertas...] [Filtros ▼]

🔥 OFERTAS DO DIA
┌─────────────────┬─────────────────┬─────────────────┐
│ 📱 iPhone 15    │ 🏠 Airfryer     │ 👕 Camiseta    │
│ R$ 3.999,00     │ R$ 199,90       │ R$ 29,90        │
│ 🏷️ 25% OFF      │ 🏷️ 60% OFF      │ 🏷️ 40% OFF      │
│ [VER OFERTA] ↗  │ [VER OFERTA] ↗  │ [VER OFERTA] ↗  │
└─────────────────┴─────────────────┴─────────────────┘

📂 CATEGORIAS
[📱 Eletrônicos] [🏠 Casa] [👕 Moda] [💄 Beleza]
```

### **2. 👤 Dashboard Admin:**
```
🔐 PAINEL COMPRE SEM MODERAÇÃO - Vinny

📊 HOJE                          ⚙️ CONTROLES
├─ 47 ofertas encontradas        ├─ [▶️ Iniciar Monitor]
├─ 23 enviadas WhatsApp          ├─ [📱 Testar WhatsApp]
├─ 156 cliques nos links         ├─ [📊 Ver Analytics]
└─ R$ 892 em comissões          └─ [⚙️ Configurações]

📈 GRÁFICO ÚLTIMOS 7 DIAS
[Área chart com ofertas/dia e conversões]
```

## 🎨 **Design System**

### **Cores:**
- 🔥 **Primary**: #FF6B35 (laranja vibrante)
- ⚡ **Secondary**: #F7931E (amarelo energia)  
- 🌙 **Dark**: #1A1A1A (fundo escuro)
- 💚 **Success**: #10B981 (verde conversão)
- ❌ **Danger**: #EF4444 (vermelho alerta)

### **Tipografia:**
- 📰 **Headlines**: Inter Bold
- 📝 **Body**: Inter Regular  
- 💻 **Code**: JetBrains Mono

## 🚀 **Roadmap**

### **Fase 1 - MVP Web (1 semana):**
- [x] Estrutura base
- [ ] Homepage com ofertas estáticas
- [ ] Dashboard admin básico
- [ ] API simples (CRUD ofertas)
- [ ] Deploy no Coolify

### **Fase 2 - Integração (1 semana):**
- [ ] Conectar com monitor ML
- [ ] WebSocket real-time
- [ ] Sistema de autenticação
- [ ] Analytics básico

### **Fase 3 - Avançado (2 semanas):**
- [ ] PWA + notificações push
- [ ] Filtros avançados
- [ ] Comparador de preços
- [ ] Sistema de favoritos

---

**🎯 Objetivo:** Criar a **melhor interface de ofertas do Brasil**, superando Pelando/Gafanho! 🔥