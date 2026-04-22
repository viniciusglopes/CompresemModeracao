# CompresemModeracao - Dockerfile
# Deploy Coolify com interface web + API

FROM node:18-slim

LABEL maintainer="Bob + Vinícius G. Lopes"
LABEL description="Compre sem Moderação - Vitrine de ofertas focada no público feminino"
LABEL version="1.0.0"

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

WORKDIR /app/web/backend
RUN npm install

WORKDIR /app
RUN pip3 install -r requirements.txt --break-system-packages

RUN mkdir -p /app/data/{offers,products,analytics} /app/logs

RUN chmod +x /app/scripts/*.sh /app/dispatch/whatsapp/*.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHON_PATH=/usr/bin/python3

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

WORKDIR /app/web/backend
CMD ["npm", "start"]
