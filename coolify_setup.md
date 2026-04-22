# 🐳 Setup CompresemModeracao no Coolify - Instruções Exatas

## 📋 **Siga estes passos no seu Coolify:**

### **PASSO 1: Criar Projeto**
1. Abra seu painel Coolify
2. Clique em **"New Resource"** ou **"+"**
3. Escolha **"Application"**

### **PASSO 2: Configurar Source**
- **Name**: `CompresemModeracao`
- **Git Repository**: `https://github.com/viniciusglopes/CompresemModeracao.git`
- **Branch**: `master`
- **Build Pack**: `Dockerfile`

### **PASSO 3: Configurar Deploy**
- **Root Directory**: `/` (root)
- **Dockerfile Location**: `./Dockerfile`
- **Port**: `3000`
- **Publish Directory**: (deixe vazio)

### **PASSO 4: Domain**
- **Domains**: `csm.vinculodigital.com.br`
- **Generate Domain**: Desabilitado
- **HTTPS**: Habilitado

### **PASSO 5: Environment Variables**
```
NODE_ENV=production
PORT=3000
PYTHON_PATH=/usr/bin/python3
```

### **PASSO 6: Volumes (Opcional)**
```
/app/data → persistent volume
/app/logs → persistent volume
```

### **PASSO 7: Deploy**
- Clique **"Deploy"**
- Aguarde build (2-5 minutos)
- Verificar logs se der erro

---

## 🎯 **URLs Finais:**

Após deploy bem-sucedido:
- **Homepage**: https://csm.vinculodigital.com.br
- **Admin**: https://csm.vinculodigital.com.br/admin
- **API Status**: https://csm.vinculodigital.com.br/api/status
- **Health**: https://csm.vinculodigital.com.br/health

---

## 🐛 **Se der problema:**

### **Build Error:**
- Verificar se repo está acessível
- Conferir se Dockerfile existe
- Checar logs do build

### **Deploy Error:**
- Verificar se porta 3000 está livre
- Conferir variáveis de ambiente
- Ver logs do container

### **Domain Error:**
- Verificar DNS do domínio
- Aguardar propagação (até 24h)
- Tentar sem HTTPS primeiro

---

**📞 Se precisar de ajuda, me chame com o erro específico!**