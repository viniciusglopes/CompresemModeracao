# 🔥 CRIAR PROJETO COMPRESEMMODERACAO NO COOLIFY - MANUAL RÁPIDO

## ⚡ **PASSOS EXATOS (2 minutos):**

### **1. 🚪 ACESSE SEU COOLIFY:**
- URL: http://31.97.42.252:8000/
- Login: viniciusglopes@gmail.com
- Senha: VGLvgl0312@

### **2. ➕ CRIAR NOVO PROJETO:**
- Clique em **"+ New Resource"**
- Escolha **"Application"**

### **3. 📝 CONFIGURAÇÕES BÁSICAS:**
```
Name: CompresemModeracao
Description: Sistema automatizado de ofertas e afiliados
```

### **4. 📂 SOURCE (Git Repository):**
```
Repository URL: https://github.com/viniciusglopes/CompresemModeracao.git
Branch: master
Source Type: Git
Build Pack: Dockerfile
```

### **5. 🏗️ BUILD SETTINGS:**
```
Dockerfile Path: ./Dockerfile
Context Directory: .
Port: 3000
```

### **6. 🌐 DOMAIN:**
```
Domain: csm.vinculodigital.com.br
HTTPS: ✅ Enabled (Let's Encrypt automático)
Force HTTPS: ✅ Enabled
```

### **7. ⚙️ ENVIRONMENT VARIABLES:**
```
NODE_ENV=production
PORT=3000
PYTHON_PATH=/usr/bin/python3
```

### **8. 💾 VOLUMES (Opcional):**
```
/app/data → Persistent Volume
/app/logs → Persistent Volume
```

### **9. 🚀 DEPLOY:**
- Clique **"Save & Deploy"**
- Aguarde build (2-3 minutos)
- ✅ Pronto!

---

## 🌐 **RESULTADO FINAL:**

**Suas URLs após deploy:**
- 🏠 **Homepage**: https://csm.vinculodigital.com.br
- 👤 **Admin**: https://csm.vinculodigital.com.br/admin
- 🔌 **API**: https://csm.vinculodigital.com.br/api/status
- ❤️ **Health**: https://csm.vinculodigital.com.br/health

---

## 🐛 **SE DER ERRO:**

### **Build Error:**
- Verificar se repo GitHub está acessível
- Branch "master" existe
- Dockerfile na raiz do projeto

### **Deploy Error:**
- Verificar logs do container
- Port 3000 configurado corretamente
- Environment variables definidas

### **Domain Error:**
- DNS pode demorar 1-24h para propagar
- Testar sem HTTPS primeiro
- Verificar se domínio aponta para seu servidor

---

## 📞 **SUPORTE BILLY:**

Se der qualquer erro, me chame com:
1. Screenshot da tela de erro
2. Logs do build/deploy
3. Qual passo travou

**🎯 Em 2 minutos você terá o CompresemModeracao rodando em produção!**