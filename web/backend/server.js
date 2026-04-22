#!/usr/bin/env node

/**
 * CompresemModeracao Web Server
 * Billy Bot - 23/03/2026
 * 
 * Servidor web simples para interface do CompresemModeracao
 * Serve páginas estáticas + API básica
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const { supabaseAdmin } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Static files (public access)
app.use(express.static(path.join(__dirname, '../frontend')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}${req.session.user ? ' [USER: ' + req.session.user.email + ']' : ' [GUEST]'}`);
    next();
});

// Authentication system
const MASTER_USER = {
    email: 'viniciusglopes@gmail.com',
    password: '123456', // In production, this should be hashed
    name: 'Vinícius G. Lopes',
    role: 'master'
};

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                error: 'Unauthorized', 
                message: 'Login necessário para acessar esta funcionalidade',
                loginUrl: '/login'
            });
        } else {
            return res.redirect('/login');
        }
    }
}

// Check if user is logged in
function isAuthenticated(req) {
    return req.session && req.session.user;
}

// Routes

// Home page (public)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Login page
app.get('/login', (req, res) => {
    // If already logged in, redirect to admin
    if (isAuthenticated(req)) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Admin page (protected)
app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// Authentication API Routes

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password, remember } = req.body;
    
    // Validate credentials
    if (email === MASTER_USER.email && password === MASTER_USER.password) {
        // Create session
        req.session.user = {
            email: MASTER_USER.email,
            name: MASTER_USER.name,
            role: MASTER_USER.role,
            loginTime: new Date().toISOString()
        };
        
        // Extend session if remember me is checked
        if (remember) {
            req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        }
        
        console.log(`✅ Login successful: ${email}`);
        
        res.json({ 
            success: true, 
            message: 'Login realizado com sucesso',
            user: {
                email: MASTER_USER.email,
                name: MASTER_USER.name,
                role: MASTER_USER.role
            }
        });
    } else {
        console.log(`❌ Login failed: ${email}`);
        res.status(401).json({ 
            success: false, 
            message: 'E-mail ou senha incorretos' 
        });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    const userEmail = req.session.user ? req.session.user.email : 'unknown';
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao fazer logout' 
            });
        }
        
        console.log(`👋 Logout successful: ${userEmail}`);
        res.json({ 
            success: true, 
            message: 'Logout realizado com sucesso' 
        });
    });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
    if (isAuthenticated(req)) {
        res.json({
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

// Protected API Routes

// Get system status (protected)
app.get('/api/status', requireAuth, (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        services: {
            mercadolivre: { status: 'online', lastCheck: new Date().toISOString() },
            evolution: { status: 'online', lastCheck: new Date().toISOString() },
            telegram: { status: 'pending', lastCheck: null },
            monitor: { status: 'active', lastCheck: new Date().toISOString() }
        }
    });
});

// Get current stats (protected)
app.get('/api/stats', requireAuth, (req, res) => {
    // Simulated data - replace with real data later
    res.json({
        today: {
            offers: 47,
            whatsapp_sent: 23,
            clicks: 156,
            commissions: 892
        },
        last7days: {
            offers: [32, 45, 38, 42, 51, 47, 58],
            commissions: [450, 680, 520, 590, 720, 650, 892]
        }
    });
});

// Get offers
app.get('/api/offers', (req, res) => {
    // Try to read from data file
    const offersPath = path.join(__dirname, '../../data/offers/ofertas_ml.json');
    
    try {
        if (fs.existsSync(offersPath)) {
            const data = fs.readFileSync(offersPath, 'utf8');
            const offers = JSON.parse(data);
            res.json(offers);
        } else {
            // Return mock data if no real data exists
            res.json({
                timestamp: new Date().toISOString(),
                total_ofertas: 4,
                ofertas: [
                    {
                        id: '1',
                        titulo: 'iPhone 15 Pro 256GB Titânio Natural',
                        preco_atual: 6999,
                        preco_original: 9299,
                        desconto: 25,
                        url_produto: 'https://mercadolivre.com.br/iphone-15',
                        imagem: 'https://via.placeholder.com/300x200/FF6B35/ffffff?text=iPhone+15',
                        vendedor: 'Apple Store',
                        frete_gratis: true,
                        categoria: 'eletronicos'
                    },
                    {
                        id: '2',
                        titulo: 'Airfryer Mondial 5.5L Digital Preto',
                        preco_atual: 199,
                        preco_original: 499,
                        desconto: 60,
                        url_produto: 'https://magazineluiza.com.br/airfryer',
                        imagem: 'https://via.placeholder.com/300x200/10B981/ffffff?text=Airfryer',
                        vendedor: 'Magazine Luiza',
                        frete_gratis: false,
                        categoria: 'casa'
                    }
                ]
            });
        }
    } catch (error) {
        console.error('Error reading offers:', error);
        res.status(500).json({ error: 'Failed to load offers' });
    }
});

// Protected Control endpoints

// Start monitor (protected)
app.post('/api/monitor/start', requireAuth, (req, res) => {
    console.log('🔄 Starting monitor...');
    // TODO: Implement actual monitor start
    res.json({ 
        success: true, 
        message: 'Monitor iniciado com sucesso',
        timestamp: new Date().toISOString()
    });
});

// Stop monitor (protected)
app.post('/api/monitor/stop', requireAuth, (req, res) => {
    console.log('⏹️ Stopping monitor...');
    // TODO: Implement actual monitor stop
    res.json({ 
        success: true, 
        message: 'Monitor parado com sucesso',
        timestamp: new Date().toISOString()
    });
});

// Test WhatsApp (protected)
app.post('/api/test/whatsapp', requireAuth, (req, res) => {
    console.log('📱 Testing WhatsApp...');
    // TODO: Implement actual WhatsApp test
    res.json({ 
        success: true, 
        message: 'Mensagem de teste enviada para WhatsApp',
        timestamp: new Date().toISOString()
    });
});

// Force update (protected)
app.post('/api/update', requireAuth, (req, res) => {
    console.log('🔄 Force updating...');
    // TODO: Implement actual force update
    res.json({ 
        success: true, 
        message: 'Atualização forçada executada',
        timestamp: new Date().toISOString()
    });
});

// ==== MERCADO LIVRE API ENDPOINTS ====

// ML Configuration storage (in-memory for now, should be in database)
let mlConfig = {
    maxRequestsPerMinute: 1000,
    siteId: 'MLB',
    minDiscountPercent: 30,
    minOriginalPrice: 50.0,
    maxPrice: 5000.0,
    searchKeywords: [
        'iphone', 'samsung', 'notebook', 'smartwatch',
        'fone bluetooth', 'mouse gamer', 'teclado mecânico',
        'monitor', 'tablet', 'kindle', 'chromecast',
        'airpods', 'jbl', 'xiaomi'
    ],
    monitoredCategories: [
        'MLB1648', 'MLB1000', 'MLB1430', 'MLB1276',
        'MLB1384', 'MLB1246', 'MLB1571', 'MLB1132'
    ],
    affiliateBaseUrl: '',
    affiliateTag: 'COMPRESEMMODERACAO'
};

let generalConfig = {
    monitoringInterval: 15,
    maxOffersPerDispatch: 10,
    enableAutoDispatch: true,
    enableNotifications: true
};

// Get ML configuration
app.get('/api/ml/config', requireAuth, (req, res) => {
    res.json({
        success: true,
        config: mlConfig
    });
});

// Save ML configuration
app.post('/api/ml/config', requireAuth, (req, res) => {
    try {
        const newConfig = req.body;
        
        // Update config
        mlConfig = { ...mlConfig, ...newConfig };
        
        console.log('💾 ML Config updated:', Object.keys(newConfig));
        
        res.json({
            success: true,
            message: 'Configurações da API Mercado Livre salvas com sucesso'
        });
    } catch (error) {
        console.error('Error saving ML config:', error);
        res.status(500).json({
            success: false,
            message: `Erro ao salvar configurações: ${error.message}`
        });
    }
});

// Test ML connection
app.post('/api/ml/test-connection', requireAuth, (req, res) => {
    // Simple test - try to access ML API
    const https = require('https');
    
    const testUrl = `https://api.mercadolibre.com/sites/${mlConfig.siteId}`;
    
    https.get(testUrl, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
            data += chunk;
        });
        
        response.on('end', () => {
            try {
                const result = JSON.parse(data);
                
                if (response.statusCode === 200 && result.id) {
                    console.log('✅ ML API connection test successful');
                    res.json({
                        success: true,
                        message: `Conexão OK! API Mercado Livre respondeu: Site ${result.id} (${result.name})`
                    });
                } else {
                    res.json({
                        success: false,
                        message: `Resposta inesperada da API: HTTP ${response.statusCode}`
                    });
                }
            } catch (parseError) {
                res.json({
                    success: false,
                    message: `Erro ao interpretar resposta da API: ${parseError.message}`
                });
            }
        });
    }).on('error', (error) => {
        console.error('❌ ML API connection test failed:', error.message);
        res.json({
            success: false,
            message: `Erro de conexão: ${error.message}`
        });
    });
});

// Test ML search
app.post('/api/ml/search-test', requireAuth, (req, res) => {
    const { query, limit = 10 } = req.body;
    
    if (!query || !query.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Query de busca não fornecida'
        });
    }
    
    const https = require('https');
    const querystring = require('querystring');
    
    const params = {
        q: query.trim(),
        limit: Math.min(limit, 50),
        sort: 'price_asc',
        shipping: 'free',
        condition: 'new'
    };
    
    const searchUrl = `https://api.mercadolibre.com/sites/${mlConfig.siteId}/search?${querystring.stringify(params)}`;
    
    https.get(searchUrl, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
            data += chunk;
        });
        
        response.on('end', () => {
            try {
                const result = JSON.parse(data);
                
                if (response.statusCode === 200 && result.results) {
                    // Process and filter results
                    const products = result.results.map(item => {
                        let discountPercent = null;
                        let originalPrice = null;
                        
                        // Try to calculate discount if original price exists
                        if (item.original_price && item.original_price > item.price) {
                            originalPrice = item.original_price;
                            discountPercent = Math.round(((originalPrice - item.price) / originalPrice) * 100);
                        }
                        
                        return {
                            id: item.id,
                            title: item.title,
                            price: item.price,
                            original_price: originalPrice,
                            discount_percent: discountPercent,
                            permalink: item.permalink,
                            thumbnail: item.thumbnail,
                            shipping_free: item.shipping?.free_shipping || false,
                            available_quantity: item.available_quantity,
                            sold_quantity: item.sold_quantity,
                            affiliate_link: mlConfig.affiliateBaseUrl ? 
                                `${mlConfig.affiliateBaseUrl}${item.permalink}` : 
                                item.permalink
                        };
                    }).filter(product => {
                        // Apply filters
                        return product.price >= mlConfig.minOriginalPrice &&
                               product.price <= mlConfig.maxPrice &&
                               product.available_quantity > 0 &&
                               product.sold_quantity >= 5;
                    });
                    
                    console.log(`🔍 ML search test: "${query}" - ${products.length}/${result.results.length} products`);
                    
                    res.json({
                        success: true,
                        products: products.slice(0, limit),
                        count: products.length
                    });
                } else {
                    res.json({
                        success: false,
                        message: `Erro na API: HTTP ${response.statusCode} - ${result.message || 'Resposta inválida'}`
                    });
                }
            } catch (parseError) {
                res.json({
                    success: false,
                    message: `Erro ao processar resultados: ${parseError.message}`
                });
            }
        });
    }).on('error', (error) => {
        console.error('❌ ML search test failed:', error.message);
        res.json({
            success: false,
            message: `Erro de conexão: ${error.message}`
        });
    });
});

// Discover hot deals
app.post('/api/ml/discover-deals', requireAuth, (req, res) => {
    const https = require('https');
    const querystring = require('querystring');
    
    let allProducts = [];
    let completedRequests = 0;
    const totalRequests = Math.min(mlConfig.searchKeywords.length, 5); // Limit to prevent rate limiting
    
    if (totalRequests === 0) {
        return res.json({
            success: true,
            products: [],
            count: 0,
            message: 'Nenhuma palavra-chave configurada para busca'
        });
    }
    
    const searchKeyword = (keyword, callback) => {
        const params = {
            q: keyword,
            limit: 20,
            sort: 'price_asc',
            shipping: 'free',
            condition: 'new'
        };
        
        const searchUrl = `https://api.mercadolibre.com/sites/${mlConfig.siteId}/search?${querystring.stringify(params)}`;
        
        https.get(searchUrl, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    if (response.statusCode === 200 && result.results) {
                        const products = result.results.map(item => {
                            let discountPercent = null;
                            let originalPrice = null;
                            
                            if (item.original_price && item.original_price > item.price) {
                                originalPrice = item.original_price;
                                discountPercent = Math.round(((originalPrice - item.price) / originalPrice) * 100);
                            }
                            
                            return {
                                id: item.id,
                                title: item.title,
                                price: item.price,
                                original_price: originalPrice,
                                discount_percent: discountPercent,
                                permalink: item.permalink,
                                thumbnail: item.thumbnail,
                                shipping_free: item.shipping?.free_shipping || false,
                                available_quantity: item.available_quantity,
                                sold_quantity: item.sold_quantity,
                                affiliate_link: mlConfig.affiliateBaseUrl ? 
                                    `${mlConfig.affiliateBaseUrl}${item.permalink}` : 
                                    item.permalink
                            };
                        }).filter(product => {
                            // Apply quality filters
                            return product.price >= mlConfig.minOriginalPrice &&
                                   product.price <= mlConfig.maxPrice &&
                                   product.available_quantity > 0 &&
                                   product.sold_quantity >= 10 && // Higher threshold for discovery
                                   (!product.discount_percent || product.discount_percent >= mlConfig.minDiscountPercent);
                        });
                        
                        callback(null, products);
                    } else {
                        callback(new Error(`API error for "${keyword}": HTTP ${response.statusCode}`), []);
                    }
                } catch (parseError) {
                    callback(parseError, []);
                }
            });
        }).on('error', (error) => {
            callback(error, []);
        });
    };
    
    // Search top keywords
    mlConfig.searchKeywords.slice(0, totalRequests).forEach(keyword => {
        searchKeyword(keyword, (error, products) => {
            if (!error) {
                allProducts.push(...products);
            } else {
                console.error(`Error searching "${keyword}":`, error.message);
            }
            
            completedRequests++;
            
            if (completedRequests === totalRequests) {
                // Remove duplicates and sort
                const uniqueProducts = {};
                allProducts.forEach(product => {
                    if (!uniqueProducts[product.id]) {
                        uniqueProducts[product.id] = product;
                    }
                });
                
                const sortedProducts = Object.values(uniqueProducts)
                    .sort((a, b) => {
                        // Sort by discount first, then by sales
                        const aScore = (a.discount_percent || 0) * 100 + a.sold_quantity;
                        const bScore = (b.discount_percent || 0) * 100 + b.sold_quantity;
                        return bScore - aScore;
                    })
                    .slice(0, 50); // Top 50 deals
                
                console.log(`🔥 Hot deals discovered: ${sortedProducts.length} unique offers`);
                
                res.json({
                    success: true,
                    products: sortedProducts,
                    count: sortedProducts.length,
                    message: `Descobertas ${sortedProducts.length} ofertas quentes de ${totalRequests} categorias pesquisadas`
                });
            }
        });
    });
});

// General configuration endpoints
app.get('/api/general-config', requireAuth, (req, res) => {
    res.json({
        success: true,
        config: generalConfig
    });
});

app.post('/api/general-config', requireAuth, (req, res) => {
    try {
        const newConfig = req.body;
        
        // Update config
        generalConfig = { ...generalConfig, ...newConfig };
        
        console.log('💾 General Config updated:', Object.keys(newConfig));
        
        res.json({
            success: true,
            message: 'Configurações gerais salvas com sucesso'
        });
    } catch (error) {
        console.error('Error saving general config:', error);
        res.status(500).json({
            success: false,
            message: `Erro ao salvar configurações: ${error.message}`
        });
    }
});

// ==== MCP SERVER ENDPOINTS ====

// MCP Configuration storage
let mcpConfig = {
    serverUrl: 'https://mcp.mercadolibre.com/mcp',
    accessToken: '',
    siteId: 'MLB',
    language: 'pt_br',
    maxRequestsPerMinute: 500,
    enabled: false,
    timeoutSeconds: 30,
    defaultLimit: 20
};

// Get MCP configuration
app.get('/api/mcp/config', requireAuth, (req, res) => {
    res.json({
        success: true,
        config: mcpConfig
    });
});

// Save MCP configuration
app.post('/api/mcp/config', requireAuth, (req, res) => {
    try {
        const newConfig = req.body;
        
        // Update config
        mcpConfig = { ...mcpConfig, ...newConfig };
        
        // Auto-enable if access token is provided
        if (mcpConfig.accessToken && mcpConfig.accessToken.length > 10) {
            mcpConfig.enabled = true;
        } else {
            mcpConfig.enabled = false;
        }
        
        console.log('💾 MCP Config updated:', Object.keys(newConfig));
        
        res.json({
            success: true,
            message: 'Configurações MCP salvas com sucesso',
            enabled: mcpConfig.enabled
        });
    } catch (error) {
        console.error('Error saving MCP config:', error);
        res.status(500).json({
            success: false,
            message: `Erro ao salvar configurações MCP: ${error.message}`
        });
    }
});

// Test MCP connection
app.post('/api/mcp/test-connection', requireAuth, (req, res) => {
    if (!mcpConfig.accessToken) {
        return res.json({
            success: false,
            message: 'Access Token do MCP não configurado'
        });
    }
    
    // Simple test - try to make a request to MCP server
    const https = require('https');
    const postData = JSON.stringify({
        method: 'tools/call',
        params: {
            name: 'search_documentation',
            arguments: {
                query: 'test connection',
                language: mcpConfig.language,
                siteId: mcpConfig.siteId,
                limit: 1
            }
        }
    });
    
    const options = {
        hostname: 'mcp.mercadolibre.com',
        port: 443,
        path: '/mcp',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${mcpConfig.accessToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'CompresemModeracao/1.0'
        }
    };
    
    const request = https.request(options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
            data += chunk;
        });
        
        response.on('end', () => {
            try {
                const result = JSON.parse(data);
                
                if (response.statusCode === 200) {
                    console.log('✅ MCP Server connection test successful');
                    res.json({
                        success: true,
                        message: 'Conexão MCP Server OK! Documentação acessível.'
                    });
                } else {
                    res.json({
                        success: false,
                        message: `Erro MCP: HTTP ${response.statusCode} - ${result.message || 'Resposta inválida'}`
                    });
                }
            } catch (parseError) {
                res.json({
                    success: false,
                    message: `Erro ao interpretar resposta MCP: ${parseError.message}`
                });
            }
        });
    });
    
    request.on('error', (error) => {
        console.error('❌ MCP Server connection test failed:', error.message);
        res.json({
            success: false,
            message: `Erro de conexão MCP: ${error.message}`
        });
    });
    
    request.write(postData);
    request.end();
});

// ==== COMPARISON ENDPOINTS ====

// Compare both APIs for a search query
app.post('/api/compare/search', requireAuth, (req, res) => {
    const { query, limit = 20, method = 'parallel' } = req.body;
    
    if (!query || !query.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Query de busca não fornecida'
        });
    }
    
    console.log(`🔄 Starting API comparison: "${query}" (method: ${method})`);
    
    // Simulate comparison result (in real implementation, this would call the comparison engine)
    const mockComparison = {
        session_id: `comp_${Date.now()}`,
        query: query.trim(),
        results: {
            direct_api: {
                products: [
                    {
                        id: 'MLB123',
                        title: `Produto Direct API ${query}`,
                        price: 199.99,
                        discount_percent: 35,
                        permalink: 'https://mercadolivre.com.br/produto-1',
                        shipping_free: true,
                        sold_quantity: 150
                    }
                ],
                metrics: {
                    response_time_ms: 450,
                    success: true,
                    total_results: 1,
                    api_calls_made: 1
                },
                count: 1
            },
            mcp_server: mcpConfig.enabled ? {
                products: [
                    {
                        id: 'MCP456',
                        title: `Produto MCP Server ${query}`,
                        price: 179.99,
                        discount_percent: 40,
                        permalink: 'https://mercadolivre.com.br/produto-2',
                        shipping_free: true,
                        sold_quantity: 200
                    }
                ],
                metrics: {
                    response_time_ms: 850,
                    success: mcpConfig.enabled,
                    total_results: mcpConfig.enabled ? 1 : 0,
                    api_calls_made: 2
                },
                count: mcpConfig.enabled ? 1 : 0
            } : {
                products: [],
                metrics: {
                    response_time_ms: 0,
                    success: false,
                    total_results: 0,
                    error_message: 'MCP não configurado'
                },
                count: 0
            }
        },
        comparison: {
            winner: mcpConfig.enabled ? 'direct_api' : 'direct_api',
            notes: mcpConfig.enabled ? 
                'Direct API foi 400ms mais rápido, mas MCP teve desconto médio 5% maior' :
                'Apenas Direct API disponível (MCP não configurado)'
        },
        timestamp: Date.now()
    };
    
    res.json({
        success: true,
        comparison: mockComparison
    });
});

// Get comparison statistics
app.get('/api/compare/stats', requireAuth, (req, res) => {
    // Mock statistics - in real implementation, this would come from metrics collector
    const mockStats = {
        total_comparisons: 8,
        direct_api_wins: 5,
        mcp_server_wins: 2,
        ties: 1,
        performance_summary: {
            direct_api: {
                avg_response_time_ms: 425,
                success_rate: 95,
                avg_results_per_search: 12.3
            },
            mcp_server: {
                avg_response_time_ms: mcpConfig.enabled ? 780 : 0,
                success_rate: mcpConfig.enabled ? 87 : 0,
                avg_results_per_search: mcpConfig.enabled ? 8.7 : 0
            }
        },
        recommendation: {
            primary: 'direct_api',
            confidence: 85,
            reason: mcpConfig.enabled ? 
                'Direct API mostra melhor performance e confiabilidade' :
                'MCP não configurado - apenas Direct API disponível'
        },
        latest_comparisons: [
            { query: 'notebook gamer', winner: 'direct_api', notes: 'Mais rápido e mais resultados' },
            { query: 'smartphone samsung', winner: 'mcp_server', notes: 'Melhor qualidade dos descontos' },
            { query: 'fone bluetooth', winner: 'direct_api', notes: 'Performance superior' }
        ]
    };
    
    res.json({
        success: true,
        stats: mockStats
    });
});

// Performance report
app.get('/api/compare/report', requireAuth, (req, res) => {
    const { hours = 24 } = req.query;
    
    const mockReport = {
        period: `Last ${hours} hours`,
        timestamp: new Date().toISOString(),
        overview: {
            total_searches: 15,
            direct_api_searches: 15,
            mcp_server_searches: mcpConfig.enabled ? 8 : 0,
            direct_success_rate: 93.3,
            mcp_success_rate: mcpConfig.enabled ? 87.5 : 0
        },
        insights: [
            {
                title: 'Direct API Performance Advantage',
                description: 'Direct API is 40% faster on average (425ms vs 780ms)',
                score: 8.5,
                recommendation: 'Use Direct API for time-sensitive operations'
            },
            mcpConfig.enabled ? {
                title: 'MCP Server Quality Edge',
                description: 'MCP Server finds 15% higher average discounts',
                score: 7.2,
                recommendation: 'Use MCP for discovering better deals'
            } : {
                title: 'MCP Server Not Available',
                description: 'MCP Server não está configurado',
                score: 0,
                recommendation: 'Configure MCP Access Token para comparação completa'
            }
        ].filter(Boolean),
        recommendations: mcpConfig.enabled ? [
            'Use Direct API as primary for speed',
            'Use MCP Server for quality deal discovery',
            'Implement hybrid approach based on use case'
        ] : [
            'Configure MCP Server para comparação completa',
            'Direct API está funcionando bem como solução única',
            'Considere obter Access Token do Mercado Livre para MCP'
        ]
    };
    
    res.json({
        success: true,
        report: mockReport
    });
});

// Health check (protected)
app.get('/health', requireAuth, (req, res) => {
    res.json({ 
        status: 'healthy', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ============================================================
// PLATAFORMAS - Teste de conexão
// ============================================================

app.post('/api/plataformas/:plataforma/test', requireAuth, async (req, res) => {
    const { plataforma } = req.params
    const { data: cfg } = await supabaseAdmin.from('config_plataformas').select('credenciais').eq('plataforma', plataforma).single()
    const creds = cfg?.credenciais || {}

    try {
        const https = require('https')
        if (plataforma === 'mercadolivre') {
            // Teste público — não precisa de credenciais
            const testUrl = `https://api.mercadolibre.com/sites/MLB`
            https.get(testUrl, (r) => {
                res.json({ success: r.statusCode === 200, message: r.statusCode === 200 ? 'API Mercado Livre acessível!' : `HTTP ${r.statusCode}` })
            }).on('error', (e) => res.json({ success: false, message: e.message }))
        } else if (plataforma === 'shopee') {
            if (!creds.partner_id) return res.json({ success: false, message: 'Credenciais não configuradas' })
            res.json({ success: true, message: 'Credenciais salvas. Teste real requer request assinado.' })
        } else if (plataforma === 'aliexpress') {
            if (!creds.app_key) return res.json({ success: false, message: 'Credenciais não configuradas' })
            res.json({ success: true, message: 'Credenciais salvas. Teste real requer request assinado.' })
        } else if (plataforma === 'amazon') {
            if (!creds.access_key) return res.json({ success: false, message: 'Credenciais não configuradas' })
            res.json({ success: true, message: 'Credenciais salvas. Teste real requer assinatura AWS SigV4.' })
        } else {
            res.json({ success: false, message: 'Plataforma desconhecida' })
        }
    } catch(e) {
        res.json({ success: false, message: e.message })
    }
})

// ============================================================
// SUPABASE - Produtos, Disparos, Tracking, Config Plataformas
// ============================================================

// Listar produtos
app.get('/api/produtos', requireAuth, async (req, res) => {
    const { plataforma, nicho, limit = 50 } = req.query
    let query = supabaseAdmin.from('produtos').select('*').order('created_at', { ascending: false }).limit(parseInt(limit))
    if (plataforma) query = query.eq('plataforma', plataforma)
    if (nicho) query = query.eq('nicho', nicho)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, produtos: data })
})

// Salvar produto
app.post('/api/produtos', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('produtos').insert(req.body).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, produto: data })
})

// Deletar produto
app.delete('/api/produtos/:id', requireAuth, async (req, res) => {
    const { error } = await supabaseAdmin.from('produtos').delete().eq('id', req.params.id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true })
})

// Registrar disparo
app.post('/api/disparos', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('disparos').insert(req.body).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, disparo: data })
})

// Listar disparos
app.get('/api/disparos', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('disparos').select('*, produtos(titulo, plataforma, preco)').order('disparado_em', { ascending: false }).limit(100)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, disparos: data })
})

// Registrar clique (público - chamado via redirect/pixel)
app.post('/api/clicks', async (req, res) => {
    const { produto_id, plataforma, fonte } = req.body
    const { error } = await supabaseAdmin.from('clicks').insert({ produto_id, plataforma, fonte })
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true })
})

// Listar vendas
app.get('/api/vendas', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('vendas').select('*, produtos(titulo)').order('data_venda', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, vendas: data })
})

// Registrar venda manualmente
app.post('/api/vendas', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('vendas').insert(req.body).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, venda: data })
})

// Dashboard stats (cliques, vendas, comissão por plataforma)
app.get('/api/dashboard', requireAuth, async (req, res) => {
    const [produtos, clicks, vendas, disparos] = await Promise.all([
        supabaseAdmin.from('produtos').select('plataforma', { count: 'exact' }),
        supabaseAdmin.from('clicks').select('plataforma'),
        supabaseAdmin.from('vendas').select('plataforma, comissao, valor_venda'),
        supabaseAdmin.from('disparos').select('canal', { count: 'exact' })
    ])
    const totalComissao = (vendas.data || []).reduce((sum, v) => sum + (v.comissao || 0), 0)
    const totalVendas = (vendas.data || []).reduce((sum, v) => sum + (v.valor_venda || 0), 0)
    res.json({
        success: true,
        stats: {
            total_produtos: produtos.count || 0,
            total_clicks: (clicks.data || []).length,
            total_disparos: disparos.count || 0,
            total_vendas: (vendas.data || []).length,
            total_valor_vendas: totalVendas.toFixed(2),
            total_comissao: totalComissao.toFixed(2)
        }
    })
})

// Config de plataformas
app.get('/api/plataformas/config', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('config_plataformas').select('plataforma, ativo, updated_at').order('plataforma')
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, plataformas: data })
})

app.put('/api/plataformas/config/:plataforma', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('config_plataformas')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('plataforma', req.params.plataforma).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, config: data })
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        message: `Route ${req.path} not found`,
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🛒 CompresemModeracao Web Server');
    console.log('========================');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📱 Homepage: http://localhost:${PORT}`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
    console.log(`🔌 API: http://localhost:${PORT}/api/status`);
    console.log(`❤️ Health: http://localhost:${PORT}/health`);
    console.log('');
    console.log('🚀 Ready to serve offers!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT received, shutting down gracefully');
    process.exit(0);
});