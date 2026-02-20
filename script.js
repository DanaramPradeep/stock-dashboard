/**
 * Stock Market Dashboard - JavaScript
 * Modern fintech dashboard with real-time stock data visualization
 */

// ============================================
// Configuration & Constants
// ============================================

const STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'E-commerce' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
    { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology' }
];

const REFRESH_INTERVAL = 30000; // 30 seconds
const API_KEY = 'demo'; // Using demo key - will fall back to mock data

// ============================================
// State Management
// ============================================

let stockData = [];
let selectedStock = null;
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let chart = null;
let refreshTimer = null;

// ============================================
// Mock Data Generator
// ============================================

function generateMockStockData() {
    return STOCKS.map(stock => {
        const basePrice = getBasePrice(stock.symbol);
        const change = (Math.random() - 0.5) * 10;
        const percentChange = (change / basePrice) * 100;
        
        return {
            ...stock,
            price: (basePrice + change).toFixed(2),
            change: change.toFixed(2),
            changePercent: percentChange.toFixed(2),
            open: (basePrice + change - Math.random() * 2).toFixed(2),
            high: (basePrice + change + Math.random() * 3).toFixed(2),
            low: (basePrice + change - Math.random() * 3).toFixed(2),
            volume: Math.floor(Math.random() * 10000000 + 1000000).toLocaleString(),
            marketCap: getMarketCap(stock.symbol),
            previousClose: basePrice.toFixed(2)
        };
    });
}

function getBasePrice(symbol) {
    const prices = {
        'AAPL': 185.50,
        'GOOGL': 141.80,
        'MSFT': 378.90,
        'TSLA': 248.50,
        'AMZN': 178.25,
        'NVDA': 495.80,
        'META': 505.75
    };
    return prices[symbol] || 100;
}

function getMarketCap(symbol) {
    const caps = {
        'AAPL': '2.89T',
        'GOOGL': '1.78T',
        'MSFT': '2.81T',
        'TSLA': '789B',
        'AMZN': '1.85T',
        'NVDA': '1.22T',
        'META': '1.29T'
    };
    return caps[symbol] || '--';
}

function generateHistoricalData(symbol, days = 30) {
    const data = [];
    const basePrice = getBasePrice(symbol);
    let currentPrice = basePrice * 0.9;
    
    const now = new Date();
    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const change = (Math.random() - 0.48) * (basePrice * 0.03);
        currentPrice = Math.max(currentPrice + change, basePrice * 0.7);
        
        data.push({
            date: date.toISOString().split('T')[0],
            price: currentPrice.toFixed(2),
            volume: Math.floor(Math.random() * 50000000 + 10000000)
        });
    }
    
    return data;
}

// ============================================
// API Functions
// ============================================

async function fetchStockData() {
    try {
        // Try to fetch from Alpha Vantage (will likely fail without valid API key)
        const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&apikey=${API_KEY}&symbol=AAPL`
        );
        
        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        
        // Check if we got valid data or just the demo message
        if (data['Note'] || data['Information'] || !data['Global Quote']) {
            console.log('Using mock data (API limit or invalid key)');
            return generateMockStockData();
        }
        
        // If API works, use it (for each stock)
        const stocksWithData = await Promise.all(
            STOCKS.map(async stock => {
                try {
                    const res = await fetch(
                        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&apikey=${API_KEY}&symbol=${stock.symbol}`
                    );
                    const stockData = await res.json();
                    const quote = stockData['Global Quote'];
                    
                    if (quote && quote['05. price']) {
                        return {
                            ...stock,
                            price: parseFloat(quote['05. price']).toFixed(2),
                            change: parseFloat(quote['09. change']).toFixed(2),
                            changePercent: parseFloat(quote['10. change percent'].replace('%', '')).toFixed(2),
                            volume: parseInt(quote['06. volume']).toLocaleString(),
                            open: parseFloat(quote['02. open']).toFixed(2),
                            high: parseFloat(quote['03. high']).toFixed(2),
                            low: parseFloat(quote['04. low']).toFixed(2),
                            previousClose: parseFloat(quote['08. previous close']).toFixed(2),
                            marketCap: getMarketCap(stock.symbol)
                        };
                    }
                } catch (e) {
                    console.error(`Error fetching ${stock.symbol}:`, e);
                }
                return null;
            })
        );
        
        return stocksWithData.filter(s => s !== null);
        
    } catch (error) {
        console.log('Error fetching stock data, using mock data:', error);
        return generateMockStockData();
    }
}

// ============================================
// DOM Elements
// ============================================

const elements = {
    stockCardsGrid: document.getElementById('stockCardsGrid'),
    stockTableBody: document.getElementById('stockTableBody'),
    watchlistGrid: document.getElementById('watchlistGrid'),
    searchInput: document.getElementById('searchInput'),
    refreshBtn: document.getElementById('refreshBtn'),
    lastUpdated: document.getElementById('lastUpdated'),
    themeToggle: document.getElementById('themeToggle'),
    selectedStockName: document.getElementById('selectedStockName'),
    selectedStockSymbol: document.getElementById('selectedStockSymbol'),
    chartTimeframe: document.getElementById('chartTimeframe'),
    tableSort: document.getElementById('tableSort'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    menuToggle: document.getElementById('menuToggle'),
    
    // Detail elements
    detailPrice: document.getElementById('detailPrice'),
    detailOpen: document.getElementById('detailOpen'),
    detailHigh: document.getElementById('detailHigh'),
    detailLow: document.getElementById('detailLow'),
    detailVolume: document.getElementById('detailVolume'),
    detailMarketCap: document.getElementById('detailMarketCap'),
    
    // Market summary
    sp500: document.getElementById('sp500'),
    sp500Change: document.getElementById('sp500Change'),
    nasdaq: document.getElementById('nasdaq'),
    nasdaqChange: document.getElementById('nasdaqChange'),
    dowJones: document.getElementById('dowJones'),
    dowJonesChange: document.getElementById('dowJonesChange'),
    totalVolume: document.getElementById('totalVolume')
};

// ============================================
// Render Functions
// ============================================

function renderStockCards(stocks) {
    elements.stockCardsGrid.innerHTML = stocks.map(stock => {
        const isPositive = parseFloat(stock.change) >= 0;
        const isFavorite = watchlist.includes(stock.symbol);
        
        return `
            <div class="stock-card ${selectedStock?.symbol === stock.symbol ? 'selected' : ''}" 
                 data-symbol="${stock.symbol}">
                <div class="stock-card-header">
                    <div>
                        <div class="stock-symbol">${stock.symbol}</div>
                        <div class="stock-company">${stock.name}</div>
                    </div>
                    <button class="stock-favorite ${isFavorite ? 'active' : ''}" 
                            data-symbol="${stock.symbol}" 
                            onclick="toggleFavorite(event, '${stock.symbol}')">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
                <div class="stock-price-info">
                    <div class="stock-price">$${stock.price}</div>
                    <div class="stock-change ${isPositive ? 'positive' : 'negative'}">
                        <span>${isPositive ? '+' : ''}${stock.change}</span>
                        <span class="stock-change-percent">${isPositive ? '+' : ''}${stock.changePercent}%</span>
                    </div>
                </div>
                <div class="stock-card-footer">
                    <span><i class="fas fa-chart-line"></i> ${stock.sector}</span>
                    <span><i class="fas fa-chart-bar"></i> Vol: ${stock.volume}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    document.querySelectorAll('.stock-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.stock-favorite')) {
                selectStock(card.dataset.symbol);
            }
        });
    });
}

function renderStockTable(stocks) {
    elements.stockTableBody.innerHTML = stocks.map(stock => {
        const isPositive = parseFloat(stock.change) >= 0;
        const isFavorite = watchlist.includes(stock.symbol);
        
        return `
            <tr>
                <td><input type="checkbox"></td>
                <td class="symbol">${stock.symbol}</td>
                <td class="company-name">${stock.name}</td>
                <td class="price">$${stock.price}</td>
                <td class="change ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${stock.change}
                </td>
                <td class="change ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${stock.changePercent}%
                </td>
                <td class="volume">${stock.volume}</td>
                <td class="actions">
                    <button class="action-btn favorite ${isFavorite ? 'active' : ''}" 
                            data-symbol="${stock.symbol}"
                            onclick="toggleFavorite(event, '${stock.symbol}')">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="action-btn" onclick="selectStock('${stock.symbol}')">
                        <i class="fas fa-chart-line"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderWatchlist() {
    if (watchlist.length === 0) {
        elements.watchlistGrid.innerHTML = `
            <div class="empty-watchlist">
                <i class="fas fa-star"></i>
                <p>No stocks in watchlist</p>
                <span>Click the star icon on any stock to add it here</span>
            </div>
        `;
        return;
    }
    
    const watchlistStocks = stockData.filter(s => watchlist.includes(s.symbol));
    
    elements.watchlistGrid.innerHTML = watchlistStocks.map(stock => {
        const isPositive = parseFloat(stock.change) >= 0;
        
        return `
            <div class="watchlist-card">
                <div class="watchlist-info">
                    <span class="watchlist-symbol">${stock.symbol}</span>
                    <span class="watchlist-price">$${stock.price}</span>
                    <span class="watchlist-change ${isPositive ? 'positive' : 'negative'}">
                        ${isPositive ? '+' : ''}${stock.changePercent}%
                    </span>
                </div>
                <button class="watchlist-remove" onclick="removeFromWatchlist('${stock.symbol}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

function renderStockDetails(stock) {
    if (!stock) {
        elements.detailPrice.textContent = '--';
        elements.detailOpen.textContent = '--';
        elements.detailHigh.textContent = '--';
        elements.detailLow.textContent = '--';
        elements.detailVolume.textContent = '--';
        elements.detailMarketCap.textContent = '--';
        return;
    }
    
    const isPositive = parseFloat(stock.change) >= 0;
    
    elements.detailPrice.textContent = `$${stock.price}`;
    elements.detailPrice.style.color = isPositive ? 'var(--accent-success)' : 'var(--accent-danger)';
    
    elements.detailOpen.textContent = `$${stock.open}`;
    elements.detailHigh.textContent = `$${stock.high}`;
    elements.detailLow.textContent = `$${stock.low}`;
    elements.detailVolume.textContent = stock.volume;
    elements.detailMarketCap.textContent = stock.marketCap;
}

function renderMarketSummary() {
    // Simulate market indices (in real app, these would come from API)
    const sp500Value = (4780 + (Math.random() - 0.5) * 20).toFixed(2);
    const sp500Change = (Math.random() - 0.5).toFixed(2);
    
    const nasdaqValue = (15050 + (Math.random() - 0.5) * 50).toFixed(2);
    const nasdaqChange = (Math.random() - 0.5).toFixed(2);
    
    const dowValue = (37500 + (Math.random() - 0.5) * 100).toFixed(2);
    const dowChange = (Math.random() - 0.5).toFixed(2);
    
    const totalVol = Math.floor(Math.random() * 5000000000 + 10000000000).toLocaleString();
    
    // Update DOM
    elements.sp500.textContent = sp500Value;
    elements.sp500Change.textContent = `${parseFloat(sp500Change) >= 0 ? '+' : ''}${sp500Change}%`;
    elements.sp500Change.className = `summary-change ${parseFloat(sp500Change) >= 0 ? 'positive' : 'negative'}`;
    
    elements.nasdaq.textContent = nasdaqValue;
    elements.nasdaqChange.textContent = `${parseFloat(nasdaqChange) >= 0 ? '+' : ''}${nasdaqChange}%`;
    elements.nasdaqChange.className = `summary-change ${parseFloat(nasdaqChange) >= 0 ? 'positive' : 'negative'}`;
    
    elements.dowJones.textContent = dowValue;
    elements.dowJonesChange.textContent = `${parseFloat(dowChange) >= 0 ? '+' : ''}${dowChange}%`;
    elements.dowJonesChange.className = `summary-change ${parseFloat(dowChange) >= 0 ? 'positive' : 'negative'}`;
    
    elements.totalVolume.textContent = totalVol;
}

// ============================================
// Chart Functions
// ============================================

function initChart() {
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    // Get CSS custom properties for chart colors
    const style = getComputedStyle(document.documentElement);
    const textPrimary = style.getPropertyValue('--text-primary').trim() || '#f0f4f8';
    const textSecondary = style.getPropertyValue('--text-secondary').trim() || '#94a3b8';
    const accentPrimary = style.getPropertyValue('--accent-primary').trim() || '#3b82f6';
    const accentSuccess = style.getPropertyValue('--accent-success').trim() || '#10b981';
    const accentDanger = style.getPropertyValue('--accent-danger').trim() || '#ef4444';
    const bgCard = style.getPropertyValue('--bg-card').trim() || '#151d2e';
    const borderColor = style.getPropertyValue('--border-color').trim() || '#2d3748';
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Price',
                data: [],
                borderColor: accentPrimary,
                backgroundColor: `${accentPrimary}20`,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: accentPrimary,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: bgCard,
                    titleColor: textPrimary,
                    bodyColor: textSecondary,
                    borderColor: borderColor,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `$${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: `${borderColor}40`,
                        drawBorder: false
                    },
                    ticks: {
                        color: textSecondary,
                        maxTicksLimit: 8,
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: `${borderColor}40`,
                        drawBorder: false
                    },
                    ticks: {
                        color: textSecondary,
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        },
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

function updateChart(symbol) {
    const historicalData = generateHistoricalData(symbol, 30);
    const labels = historicalData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const prices = historicalData.map(d => parseFloat(d.price));
    
    // Determine if trend is positive or negative
    const isPositive = prices[prices.length - 1] >= prices[0];
    const style = getComputedStyle(document.documentElement);
    const accentPrimary = style.getPropertyValue('--accent-primary').trim() || '#3b82f6';
    const accentSuccess = style.getPropertyValue('--accent-success').trim() || '#10b981';
    const accentDanger = style.getPropertyValue('--accent-danger').trim() || '#ef4444';
    
    const color = isPositive ? accentSuccess : accentDanger;
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = prices;
    chart.data.datasets[0].borderColor = color;
    chart.data.datasets[0].backgroundColor = `${color}20`;
    chart.update();
}

// ============================================
// Event Handlers
// ============================================

function selectStock(symbol) {
    selectedStock = stockData.find(s => s.symbol === symbol);
    
    if (!selectedStock) return;
    
    // Update UI
    elements.selectedStockName.textContent = selectedStock.name;
    elements.selectedStockSymbol.textContent = selectedStock.symbol;
    
    // Update chart
    updateChart(symbol);
    
    // Update details
    renderStockDetails(selectedStock);
    
    // Update card selection
    document.querySelectorAll('.stock-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.symbol === symbol);
    });
    
    // Show notification
    showToast(`Selected ${selectedStock.symbol}`, 'info');
}

function toggleFavorite(event, symbol) {
    event.stopPropagation();
    
    const index = watchlist.indexOf(symbol);
    
    if (index > -1) {
        watchlist.splice(index, 1);
        showToast(`Removed ${symbol} from watchlist`, 'info');
    } else {
        watchlist.push(symbol);
        showToast(`Added ${symbol} to watchlist`, 'success');
    }
    
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    
    // Re-render
    renderStockCards(stockData);
    renderStockTable(stockData);
    renderWatchlist();
}

function removeFromWatchlist(symbol) {
    const index = watchlist.indexOf(symbol);
    
    if (index > -1) {
        watchlist.splice(index, 1);
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
        renderWatchlist();
        renderStockCards(stockData);
        renderStockTable(stockData);
    }
}

function handleSearch(query) {
    const filtered = stockData.filter(stock => 
        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
    );
    
    renderStockCards(filtered);
    renderStockTable(filtered);
}

function handleSort(criteria) {
    let sorted = [...stockData];
    
    switch (criteria) {
        case 'symbol':
            sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
            break;
        case 'price':
            sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
        case 'change':
            sorted.sort((a, b) => parseFloat(b.change) - parseFloat(a.change));
            break;
        case 'volume':
            sorted.sort((a, b) => parseInt(b.volume.replace(/,/g, '')) - parseInt(a.volume.replace(/,/g, '')));
            break;
    }
    
    renderStockCards(sorted);
    renderStockTable(sorted);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update button
    const icon = elements.themeToggle.querySelector('i');
    const text = elements.themeToggle.querySelector('span');
    
    if (newTheme === 'light') {
        icon.className = 'fas fa-sun';
        text.textContent = 'Light Mode';
    } else {
        icon.className = 'fas fa-moon';
        text.textContent = 'Dark Mode';
    }
    
    // Update chart colors
    if (chart && selectedStock) {
        updateChart(selectedStock.symbol);
    }
}

function toggleSidebar() {
    elements.sidebar.classList.toggle('active');
}

async function refreshData() {
    // Show loading state
    elements.lastUpdated.classList.add('refreshing');
    elements.refreshBtn.classList.add('loading');
    
    try {
        stockData = await fetchStockData();
        
        // Update all views
        renderStockCards(stockData);
        renderStockTable(stockData);
        renderWatchlist();
        renderMarketSummary();
        
        // Update selected stock details if any
        if (selectedStock) {
            const updated = stockData.find(s => s.symbol === selectedStock.symbol);
            if (updated) {
                selectedStock = updated;
                renderStockDetails(updated);
            }
        }
        
        // Update timestamp
        const now = new Date();
        elements.lastUpdated.innerHTML = `
            <i class="fas fa-check"></i>
            <span>Updated ${now.toLocaleTimeString()}</span>
        `;
        
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error refreshing data', 'error');
    } finally {
        elements.lastUpdated.classList.remove('refreshing');
        elements.refreshBtn.classList.remove('loading');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// Initialization
// ============================================

async function init() {
    // Load theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const icon = elements.themeToggle.querySelector('i');
    const text = elements.themeToggle.querySelector('span');
    
    if (savedTheme === 'light') {
        icon.className = 'fas fa-sun';
        text.textContent = 'Light Mode';
    }
    
    // Initialize chart
    initChart();
    
    // Load initial data
    await refreshData();
    
    // Auto-refresh
    refreshTimer = setInterval(refreshData, REFRESH_INTERVAL);
    
    // Set up event listeners
    elements.searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    elements.refreshBtn.addEventListener('click', refreshData);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.sidebarToggle?.addEventListener('click', toggleSidebar);
    elements.menuToggle?.addEventListener('click', toggleSidebar);
    elements.tableSort.addEventListener('change', (e) => handleSort(e.target.value));
    
    // Chart timeframe change
    elements.chartTimeframe.addEventListener('change', (e) => {
        if (selectedStock) {
            const days = e.target.value === 'daily' ? 30 : e.target.value === 'weekly' ? 90 : 365;
            const historicalData = generateHistoricalData(selectedStock.symbol, days);
            const labels = historicalData.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const prices = historicalData.map(d => parseFloat(d.price));
            
            const isPositive = prices[prices.length - 1] >= prices[0];
            const style = getComputedStyle(document.documentElement);
            const accentSuccess = style.getPropertyValue('--accent-success').trim() || '#10b981';
            const accentDanger = style.getPropertyValue('--accent-danger').trim() || '#ef4444';
            const color = isPositive ? accentSuccess : accentDanger;
            
            chart.data.labels = labels;
            chart.data.datasets[0].data = prices;
            chart.data.datasets[0].borderColor = color;
            chart.data.datasets[0].backgroundColor = `${color}20`;
            chart.update();
        }
    });
    
    // Chart type toggle
    document.querySelectorAll('.chart-type-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-type-toggle').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const type = btn.dataset.type;
            chart.config.type = type === 'bar' ? 'bar' : 'line';
            chart.update();
        });
    });
    
    // View toggle
    document.querySelectorAll('.view-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-toggle').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const view = btn.dataset.view;
            if (view === 'grid') {
                elements.stockCardsGrid.style.display = 'grid';
                document.querySelector('.table-section').style.display = 'none';
            } else {
                elements.stockCardsGrid.style.display = 'none';
                document.querySelector('.table-section').style.display = 'block';
            }
        });
    });
    
    // Select first stock by default
    if (stockData.length > 0) {
        selectStock(stockData[0].symbol);
    }
    
    console.log('Stock Dashboard initialized');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
