# 🐳 Deploy CompresemModeracao no Coolify

## 🎯 **Configuração Coolify**

### **1. Criar Novo Projeto no Coolify:**
- Acesse seu painel Coolify
- Clique em **"New Project"**
- Nome: `CompresemModeracao`
- Descrição: `Sistema automatizado de ofertas e afiliados`

### **2. Configurar Source:**
- **Source Type**: Git Repository
- **Repository**: `https://github.com/viniciusglopes/CompresemModeracao.git`
- **Branch**: `master`
- **Build Pack**: Docker

### **3. Configuração Docker:**
- **Dockerfile Path**: `./Dockerfile`
- **Docker Compose**: `./docker-compose.yml`
- **Port Mapping**: `3000:3000`

### **4. Domínio Personalizado:**
- **Domain**: `csm.vinculodigital.com.br`
- **SSL**: Let's Encrypt automático
- **HTTPS Redirect**: Habilitado

### **5. Environment Variables:**
```bash
NODE_ENV=production
PORT=3000
PYTHON_PATH=/usr/bin/python3
```

### **6. Volumes Persistentes:**
- `/app/data` → dados ofertas
- `/app/logs` → logs sistema

## 🚀 **Deploy Steps**

### **Manual Deploy:**
1. Push código para GitHub
2. No Coolify, clique **"Deploy"**
3. Aguardar build + deploy
4. Verificar logs se necessário

### **Auto Deploy:**
- ✅ Git Webhook configurado
- ✅ Auto-deploy no push para `master`

## 🔗 **URLs Após Deploy:**

- 🏠 **Homepage**: https://csm.vinculodigital.com.br
- 🔐 **Admin**: https://csm.vinculodigital.com.br/admin
- 🔌 **API**: https://csm.vinculodigital.com.br/api/status
- ❤️ **Health**: https://csm.vinculodigital.com.br/health

## ⚙️ **Configurações Pós-Deploy:**

### **1. Verificar Health Check:**
```bash
curl https://csm.vinculodigital.com.br/health
```

### **2. Configurar APIs:**
- Editar `/app/config/config.json` no container
- Ou usar environment variables

### **3. Testar Interface:**
- Homepage: Cards ofertas funcionando
- Admin: Métricas + gráficos
- API: Endpoints respondendo

## 🐛 **Troubleshooting:**

### **Logs Container:**
```bash
docker logs compresemmoderacao-web
```

### **Entrar no Container:**
```bash
docker exec -it compresemmoderacao-web /bin/bash
```

### **Verificar Portas:**
```bash
docker port compresemmoderacao-web
```

## 📊 **Monitoramento:**

### **Métricas Coolify:**
- CPU/Memory usage
- Network traffic
- Storage usage
- Uptime

### **Health Checks:**
- Intervalo: 30s
- Timeout: 10s
- Retries: 3

---

## 🎯 **Resultado Final:**

✅ **Interface acessível via domínio próprio**  
✅ **SSL automático (HTTPS)**  
✅ **Auto-deploy Git**  
✅ **Monitoramento integrado**  
✅ **Backups automáticos**  

**🔥 CompresemModeracao rodando em produção!**