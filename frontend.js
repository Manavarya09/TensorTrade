// Trading Analyst Dashboard - Deriv Hackathon
// Professional Trading Intelligence Platform

// API Configuration - use relative path for production, localhost for local dev
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8000' 
    : '';  // Use relative paths in production (Vercel)
let currentAnalysisData = null;
let isAnalyzing = false;
let currentPersonaPosts = { x: '', linkedin: '' };
let isDemoMode = false;

const DEMO_DATA = {
    "asset": "AAPL",
    "market_metrics": {
        "vix": 18.5,
        "market_regime": "BULLISH VOLATILE",
        "risk_index": 65,
        "risk_level": "ELEVATED",
        "regime_color": "#ff0000"
    },
    "market_analysis": {
        "council_opinions": [
            "Macro Hawk (High): Fed pivot priced in, yield curve steepening favors growth.",
            "Micro Forensic (Moderate): Margins compressing but services revenue +12% YoY.",
            "Flow Detective (High): Massive call gamma squeeze at $180 strike.",
            "Tech Interpreter (Moderate): Bull flag breakout on 4H chart targeting $185.",
            "Skeptic (Low): Valuation stretched at 32x PE, watch for rug pull."
        ],
        "consensus": ["Bullish short-term", "High volatility expected"],
        "market_context": {
            "price": 178.45,
            "move_direction": "UP",
            "change_pct": "2.3",
            "volume": 85000000
        }
    },
    "narrative": {
        "styled_message": "Listen up. The market is handing you a gift with this volatility, but don't get greedy. Technicals scream breakout, but that risk index at 65 means chop is incoming. Stick to the plan or get wrecked.",
        "persona_selected": "Coach"
    },
    "behavioral_analysis": {
        "flags": [
            { "pattern": "FOMO", "message": "Chasing breakout candles" },
            { "pattern": "Overtrading", "message": "15 trades in 2 hours" }
        ]
    },
    "trade_history": {
        "total_trades": 42,
        "win_rate": 58.5,
        "total_pnl": 1250.50
    },
    "economic_calendar": {
        "summary": "CPI data released lower than expected, fueling rate cut bets.",
        "economic_events": ["CPI YoY 2.9% vs 3.1% exp", "FOMC Meeting Minutes"]
    },
    "persona_post": {
        "x": "AAPL breaking out! Fed pivot incoming? Watch $185. #trading #stocks",
        "linkedin": "Market analysis for AAPL suggests strong bullish momentum..."
    }
};

// Share to X Function
function shareToX() {
    let xPost = currentPersonaPosts.x;
    
    if (!xPost && currentAnalysisData && currentAnalysisData.persona_post && currentAnalysisData.persona_post.x) {
        xPost = currentAnalysisData.persona_post.x;
        currentPersonaPosts.x = xPost;
    }
    
    if (!xPost) {
        alert('No X post available. Please run an analysis first.');
        return;
    }
    
    if (xPost.includes('[Error:') || xPost.startsWith('[Error')) {
        alert('PersonaAgent Error: ' + xPost);
        return;
    }
    
    navigator.clipboard.writeText(xPost).then(() => {
        alert('X Post Copied to Clipboard!');
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(xPost.replace(/'/g, "\\'").replace(/\n/g, ' ')), '_blank');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy post to clipboard');
    });
}

// Share to LinkedIn Function
function shareToLinkedIn() {
    let linkedinPost = currentPersonaPosts.linkedin;
    
    if (!linkedinPost && currentAnalysisData && currentAnalysisData.persona_post && currentAnalysisData.persona_post.linkedin) {
        linkedinPost = currentAnalysisData.persona_post.linkedin;
        currentPersonaPosts.linkedin = linkedinPost;
    }
    
    if (!linkedinPost) {
        alert('No LinkedIn post available. Please run an analysis first.');
        return;
    }
    
    if (linkedinPost.includes('[Error:') || linkedinPost.startsWith('[Error')) {
        alert('PersonaAgent Error: ' + linkedinPost);
        return;
    }
    
    navigator.clipboard.writeText(linkedinPost).then(() => {
        alert('LinkedIn Post Copied to Clipboard!');
        window.open('https://www.linkedin.com/feed/', '_blank');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy post to clipboard');
    });
}

// Download Summary Function
function downloadSummary() {
    if (!currentAnalysisData || !currentAnalysisData.market_analysis || !currentAnalysisData.market_analysis.council_opinions) {
        alert('No summary data available. Please run an analysis first.');
        return;
    }

    const data = currentAnalysisData;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const symbol = data.asset || data.symbol || 'ANALYSIS';
    
    let summaryContent = `# 5 LLM COUNCIL IN-DEPTH ANALYSIS SUMMARY\n`;
    summaryContent += `Generated: ${new Date().toLocaleString()}\n`;
    summaryContent += `Symbol: ${symbol}\n`;
    summaryContent += `Persona: ${data.persona_selected ? data.persona_selected.toUpperCase() : 'N/A'}\n`;
    summaryContent += `\n${'='.repeat(80)}\n\n`;
    
    summaryContent += `## 5 LLM COUNCIL OPINIONS\n\n`;
    const agentNames = ['Macro Hawk', 'Micro Forensic', 'Flow Detective', 'Tech Interpreter', 'Skeptic'];
    
    if (data.market_analysis.council_opinions) {
        data.market_analysis.council_opinions.forEach((opinion, index) => {
            summaryContent += `### ${agentNames[index]}\n`;
            summaryContent += `${opinion.replace(/^[^\s]+\s/, '')}\n\n`;
        });
    }
    
    if (data.market_analysis.consensus && data.market_analysis.consensus.length > 0) {
        summaryContent += `\n## CONSENSUS POINTS\n\n`;
        data.market_analysis.consensus.forEach((point, index) => {
            summaryContent += `${index + 1}. ${point}\n`;
        });
        summaryContent += `\n`;
    }
    
    if (data.narrative && (data.narrative.styled_message || data.narrative.summary || data.narrative.moderated_output)) {
        summaryContent += `\n## AI NARRATIVE (${data.persona_selected ? data.persona_selected.toUpperCase() : 'N/A'})\n\n`;
        const narrativeText = data.narrative.styled_message || data.narrative.summary || data.narrative.moderated_output || 'No narrative available';
        if (narrativeText && narrativeText.trim()) {
            summaryContent += `${narrativeText}\n\n`;
        }
    }
    
    if (data.trade_history) {
        const th = data.trade_history;
        summaryContent += `\n## TRADE STATISTICS\n\n`;
        summaryContent += `- Total Trades: ${th.total_trades || 0}\n`;
        summaryContent += `- Win Rate: ${th.win_rate !== undefined ? th.win_rate.toFixed(1) : '0.0'}%\n`;
        summaryContent += `- Total P&L: $${th.total_pnl !== undefined ? th.total_pnl.toFixed(2) : '0.00'}\n`;
    }
    
    if (data.behavioral_analysis && data.behavioral_analysis.flags && data.behavioral_analysis.flags.length > 0) {
        summaryContent += `\n## BEHAVIORAL FLAGS\n\n`;
        data.behavioral_analysis.flags.forEach(flag => {
            summaryContent += `[FLAG] ${flag}\n`;
        });
        summaryContent += `\n`;
    }
    
    if (data.economic_calendar && data.economic_calendar.summary) {
        summaryContent += `\n## MARKET CONTEXT\n\n${data.economic_calendar.summary}\n\n`;
    }
    
    const blob = new Blob([summaryContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TensorTrade_5LLM_Summary_${symbol}_${timestamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const app = document.getElementById('dashboard-container');
app.className = 'app-container';

const tvScript = document.createElement('script');
tvScript.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
document.head.appendChild(tvScript);

const header = document.createElement('header');
header.className = 'header';

const logoSection = document.createElement('div');
logoSection.style.display = 'flex';
logoSection.style.alignItems = 'center';
logoSection.style.gap = '20px';

const logo = document.createElement('div');
logo.className = 'header-logo';
logo.textContent = '[TENSOR]';

const title = document.createElement('div');
title.innerHTML = `
    <h1 style="margin: 0; font-size: 24px; font-weight: 800;">
        <span>TENSORTRADE</span>
        <span style="color: var(--text-color); font-size: 14px; font-weight: 400; margin-left: 10px;">INTELLIGENT TRADING ANALYST</span>
    </h1>
`;

logoSection.appendChild(logo);
logoSection.appendChild(title);

const statusIndicator = document.createElement('div');
statusIndicator.className = 'status-indicator';
statusIndicator.innerHTML = `
    <span class="status-dot"></span>
    LIVE MARKETS • REALTIME ANALYSIS
`;

header.appendChild(logoSection);
header.appendChild(statusIndicator);

const themeToggle = document.createElement('button');
themeToggle.className = 'theme-toggle';
themeToggle.style.marginLeft = '10px';
themeToggle.textContent = 'DARK MODE';
themeToggle.onclick = () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? 'LIGHT MODE' : 'DARK MODE';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = 'LIGHT MODE';
}

header.appendChild(themeToggle);

const dashboardGrid = document.createElement('div');
dashboardGrid.className = 'dashboard-grid';

const leftPanel = document.createElement('div');
leftPanel.style.display = 'flex';
leftPanel.style.flexDirection = 'column';
leftPanel.style.gap = '20px';

const createCard = (title, content, options = {}) => {
    const card = document.createElement('div');
    card.className = 'card';
    if (options.minHeight) card.style.minHeight = options.minHeight;
    if (options.height) card.style.height = options.height;
    if (options.padding) card.style.padding = options.padding;
    
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    
    const titleEl = document.createElement('h3');
    titleEl.className = 'card-title';
    titleEl.textContent = title;
    
    cardHeader.appendChild(titleEl);
    
    if (options.badge) {
        const badge = document.createElement('span');
        badge.style.border = '1px solid var(--text-color)';
        badge.style.padding = '2px 8px';
        badge.style.fontSize = '10px';
        badge.style.fontWeight = '700';
        badge.textContent = options.badge;
        cardHeader.appendChild(badge);
    }
    
    card.appendChild(cardHeader);
    card.appendChild(content);
    
    return card;
};

const assistantContent = document.createElement('div');
assistantContent.innerHTML = `
    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
        <div style="width: 48px; height: 48px; border: 2px solid var(--text-color); background: var(--bg-color); color: var(--text-color); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700;">
            [AI]
        </div>
        <div>
            <div style="font-size: 16px; font-weight: 600; color: var(--text-color);">AI ASSISTANT</div>
            <div id="assistant-status" style="font-size: 12px; color: var(--text-color);">READY FOR ANALYSIS</div>
        </div>
    </div>
    <div class="input-group">
        <div class="input-label">ASSET SYMBOL:</div>
        <input id="asset-input" type="text" class="input-field" placeholder="e.g. AAPL, SPY, TSLA" value="AAPL">
    </div>
    <div class="input-group">
        <div class="input-label">USER ID:</div>
        <input id="user-id-input" type="text" class="input-field" placeholder="e.g. trader_123" value="dashboard_user">
    </div>
    <div style="margin-bottom: 15px;">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="demo-mode-toggle" style="accent-color: var(--accent-color);">
            <span style="font-size: 13px; color: var(--text-color);">DEMO MODE (MOCK DATA)</span>
        </label>
    </div>
    <button id="analyze-btn" class="btn-primary" style="width: 100%; font-size: 1rem;">
        GENERATE REPORT
    </button>
`;

leftPanel.appendChild(createCard('ASSISTANT', assistantContent));

const analysisSetupContent = document.createElement('div');
analysisSetupContent.id = 'analysis-setup-content';
analysisSetupContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
        <div>
            <div style="font-size: 12px; margin-bottom: 8px;">MARKET REGIME</div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div id="market-regime-box" style="padding: 8px 16px; border: 1px solid var(--text-color);">
                    <div id="market-regime-text" style="font-size: 18px; font-weight: 700; color: var(--accent-color);">LOADING...</div>
                </div>
                <div id="vix-display" style="font-size: 12px; border: 1px solid var(--text-color); padding: 4px 10px;">VIX: --</div>
            </div>
        </div>
        
        <div>
            <div style="font-size: 12px; margin-bottom: 8px;">RISK INDEX</div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 12px;">CURRENT</span>
                        <span id="risk-index-value" style="font-size: 16px; font-weight: 700; color: var(--accent-color);">--/100</span>
                    </div>
                    <div class="risk-meter-container">
                        <div id="risk-index-bar" class="risk-meter-fill" style="width: 0%;"></div>
                    </div>
                </div>
            </div>
        </div>
        <div id="risk-level-badge" style="text-align: center; padding: 8px; border: 1px solid var(--text-color); font-size: 11px; font-weight: 600; display: none; margin-top: 10px;"></div>
    </div>
`;

leftPanel.appendChild(createCard('ANALYSIS SETUP', analysisSetupContent, { minHeight: '300px' }));

const centerPanel = document.createElement('div');
centerPanel.style.display = 'flex';
centerPanel.style.flexDirection = 'column';
centerPanel.style.gap = '20px';

const marketDriversContent = document.createElement('div');
marketDriversContent.id = 'market-drivers-content';
marketDriversContent.innerHTML = `
    <div id="council-opinions" style="display: grid; gap: 15px;">
        <div style="text-align: center; padding: 40px; color: var(--text-color);">
            <div style="font-size: 32px; margin-bottom: 15px;">[WAITING]</div>
            <div style="font-size: 16px; margin-bottom: 10px;">AWAITING ANALYSIS</div>
            <div style="font-size: 13px;">CLICK "GENERATE REPORT" TO RUN THE 5-AGENT COUNCIL</div>
        </div>
    </div>
`;

const marketDriversCard = createCard('KEY MARKET DRIVERS', marketDriversContent);
const marketDriversHeader = marketDriversCard.querySelector('.card-header');

const downloadBtn = document.createElement('button');
downloadBtn.id = 'download-summary-btn';
downloadBtn.className = 'btn-primary';
downloadBtn.style.padding = '4px 12px';
downloadBtn.style.fontSize = '12px';
downloadBtn.style.opacity = '0.5';
downloadBtn.style.pointerEvents = 'none';
downloadBtn.innerHTML = `<span>DOWNLOAD SUMMARY</span>`;
downloadBtn.onclick = downloadSummary;
marketDriversHeader.appendChild(downloadBtn);

centerPanel.appendChild(marketDriversCard);

const liveIntelligenceRow = document.createElement('div');
liveIntelligenceRow.style.display = 'grid';
liveIntelligenceRow.style.gridTemplateColumns = '1fr auto';
liveIntelligenceRow.style.gap = '20px';

const liveIntelContent = document.createElement('div');
liveIntelContent.id = 'live-intel-content';
liveIntelContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 14px; font-weight: 600;">LIVE MARKET INTELLIGENCE</div>
                <div style="font-size: 12px;">AI search for real-time news & data.</div>
            </div>
            <button class="btn-primary" style="padding: 8px 16px; font-size: 12px;">
                RUN LIVE ANALYSIS
            </button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
            <div style="border: 1px solid var(--text-color); padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="font-size: 16px; font-weight: 700;">SPX500</div>
                    <div style="font-size: 14px; color: var(--text-color);">+0.8%</div>
                </div>
                <div style="font-size: 13px; line-height: 1.5;">
                    Testing psychological 7,000 level.
                </div>
            </div>
            
            <div style="border: 1px solid var(--text-color); padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="font-size: 16px; font-weight: 700;">US100</div>
                    <div style="font-size: 14px; color: var(--accent-color);">-1.2%</div>
                </div>
                <div style="font-size: 13px; line-height: 1.5;">
                    Tech-heavy index under pressure.
                </div>
            </div>
        </div>
    </div>
`;

liveIntelligenceRow.appendChild(createCard('LIVE INTELLIGENCE', liveIntelContent));
centerPanel.appendChild(liveIntelligenceRow);

const rightPanel = document.createElement('div');
rightPanel.style.display = 'flex';
rightPanel.style.flexDirection = 'column';
rightPanel.style.gap = '20px';

function playNarrative() {
    if (!currentAnalysisData || !currentAnalysisData.narrative) return;
    const text = currentAnalysisData.narrative.styled_message || currentAnalysisData.narrative.summary;
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
}

const strategyContent = document.createElement('div');
strategyContent.id = 'strategy-content';
strategyContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
        <div id="narrative-output" style="border: 1px solid var(--text-color); padding: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 12px; height: 12px; background: var(--accent-color);"></div>
                    <div style="font-size: 14px; font-weight: 600;">AI NARRATIVE</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="playNarrative()" title="Listen" class="btn-primary" style="padding: 4px 10px; font-size: 12px;">[AUDIO]</button>
                    <button onclick="shareToX()" title="Share on X" class="btn-primary" style="padding: 4px 10px; font-size: 12px;">[X]</button>
                    <button onclick="shareToLinkedIn()" title="Share on LinkedIn" class="btn-primary" style="padding: 4px 10px; font-size: 12px;">[LINKEDIN]</button>
                </div>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                Awaiting analysis...
            </div>
        </div>
        
        <div id="consensus-section">
            <div style="font-size: 12px; margin-bottom: 15px;">CONSENSUS POINTS</div>
            <div id="consensus-list" style="font-size: 13px;">
                No consensus data available yet
            </div>
        </div>
    </div>
`;

rightPanel.appendChild(createCard('AI STRATEGY', strategyContent));

const matrixContent = document.createElement('div');
matrixContent.id = 'matrix-content';
matrixContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
        <div id="chart-container" style="height: 250px; width: 100%; border: 1px solid var(--text-color);"></div>

        <div id="market-context" style="font-size: 12px; margin-bottom: 5px;">
            MARKET CONTEXT - Awaiting data...
        </div>
        <div id="economic-events" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align: center; padding: 20px; font-size: 13px;">
                Economic calendar events will appear here after analysis
            </div>
        </div>
    </div>
`;

rightPanel.appendChild(createCard('ASSET IMPACT MATRIX', matrixContent, { minHeight: '400px' }));

let chart = null;
let candleSeries = null;

function initChart() {
    const container = document.getElementById('chart-container');
    if (!container || !window.LightweightCharts) return;

    container.innerHTML = '';

    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 250,
        layout: {
            background: { type: 'solid', color: '#ffffff' },
            textColor: '#000000',
        },
        grid: {
            vertLines: { color: '#e0e0e0' },
            horzLines: { color: '#e0e0e0' },
        },
        timeScale: { borderColor: '#000000' },
        rightPriceScale: { borderColor: '#000000' },
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#ffffff',
        downColor: '#ff0000',
        borderVisible: true,
        borderColor: '#000000',
        wickUpColor: '#000000',
        wickDownColor: '#ff0000',
    });

    const data = [];
    let price = 100;
    const now = new Date();
    for (let i = 0; i < 100; i++) {
        const time = new Date(now.getTime() - (100 - i) * 86400000);
        const open = price;
        const close = price + (Math.random() - 0.5) * 5;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;

        data.push({
            time: time.toISOString().split('T')[0],
            open: open,
            high: high,
            low: low,
            close: close
        });

        price = close;
    }

    candleSeries.setData(data);

    new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== container) { return; }
        const newRect = entries[0].contentRect;
        chart.applyOptions({ width: newRect.width, height: newRect.height });
    }).observe(container);
}

setTimeout(initChart, 1000);

const behavioralContent = document.createElement('div');
behavioralContent.id = 'behavioral-content';
behavioralContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
        <div id="risk-analysis-box" style="border: 1px solid var(--text-color); padding: 15px; display: none;">
            <div style="font-size: 12px; color: var(--text-color); margin-bottom: 5px;">RISK ANALYSIS</div>
            <div id="risk-metrics" style="font-size: 13px; margin-bottom: 8px;"></div>
            <div id="risk-verdict" style="font-size: 13px; font-weight: 700;"></div>
        </div>

        <div id="sentiment-analysis-box" style="border: 1px solid var(--text-color); padding: 15px; display: none;">
             <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div style="font-size: 12px; color: var(--text-color);">MARKET SENTIMENT</div>
                <div id="sentiment-score" style="font-size: 12px; font-weight: 700;"></div>
            </div>
            <div class="risk-meter-container" style="margin-bottom: 8px;">
                <div id="sentiment-bar" class="risk-meter-fill" style="width: 50%; background-color: var(--text-color);"></div>
            </div>
            <div id="sentiment-summary" style="font-size: 13px; line-height: 1.4;"></div>
        </div>

        <div id="behavioral-flags" style="border: 1px solid var(--text-color); padding: 15px;">
            <div style="font-size: 12px; color: var(--text-color); margin-bottom: 5px;">BEHAVIORAL FLAGS</div>
            <div style="font-size: 13px; line-height: 1.5;">
                No behavioral patterns detected yet.
            </div>
        </div>
        
        <div>
            <div style="font-size: 12px; margin-bottom: 10px;">TRADING STATISTICS</div>
            <div id="trade-stats" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div style="text-align: center; padding: 15px; border: 1px solid var(--text-color);">
                    <div style="font-size: 18px; font-weight: 700;">-</div>
                    <div style="font-size: 11px;">Total Trades</div>
                </div>
                <div style="text-align: center; padding: 15px; border: 1px solid var(--text-color);">
                    <div style="font-size: 18px; font-weight: 700;">-</div>
                    <div style="font-size: 11px;">Win Rate</div>
                </div>
                <div style="text-align: center; padding: 15px; border: 1px solid var(--text-color);">
                    <div style="font-size: 18px; font-weight: 700;">$-</div>
                    <div style="font-size: 11px;">Total P&L</div>
                </div>
                <div style="text-align: center; padding: 15px; border: 1px solid var(--text-color);">
                    <div style="font-size: 18px; font-weight: 700;">-</div>
                    <div style="font-size: 11px;">Persona</div>
                </div>
            </div>
        </div>
    </div>
`;

rightPanel.appendChild(createCard('BEHAVIORAL INSIGHTS', behavioralContent));

dashboardGrid.appendChild(leftPanel);
dashboardGrid.appendChild(centerPanel);
dashboardGrid.appendChild(rightPanel);

const footer = document.createElement('footer');
footer.className = 'footer';

const footerLeft = document.createElement('div');
footerLeft.innerHTML = `
    <div style="margin-bottom: 5px;">DERIV HACKATHON • INTELLIGENT TRADING ANALYST</div>
    <div>AI-powered market intelligence platform • Version 1.0</div>
`;

const footerRight = document.createElement('div');
footerRight.innerHTML = `
    <div style="text-align: right;">
        <div style="margin-bottom: 5px;">Data Sources: Bloomberg • Reuters • MarketWatch • TradingView</div>
        <div>Last Updated: ${new Date().toLocaleTimeString()}</div>
    </div>
`;

footer.appendChild(footerLeft);
footer.appendChild(footerRight);

app.appendChild(header);
app.appendChild(dashboardGrid);
app.appendChild(footer);

function updateMarketMetrics(metrics) {
    const regimeText = document.getElementById('market-regime-text');
    const regimeBox = document.getElementById('market-regime-box');
    const vixDisplay = document.getElementById('vix-display');
    const riskIndexValue = document.getElementById('risk-index-value');
    const riskIndexBar = document.getElementById('risk-index-bar');
    const riskLevelBadge = document.getElementById('risk-level-badge');
    
    if (regimeText && metrics.market_regime) {
        regimeText.textContent = metrics.market_regime;
    }
    
    if (vixDisplay && metrics.vix !== undefined) {
        vixDisplay.textContent = `VIX: ${metrics.vix}`;
    }
    
    if (riskIndexValue && metrics.risk_index !== undefined) {
        riskIndexValue.textContent = `${metrics.risk_index}/100`;
        if (riskIndexBar) {
            riskIndexBar.style.width = `${metrics.risk_index}%`;
        }
    }
    
    if (regimeBox && metrics.regime_color) {
        // Force brutalist colors
        const color = metrics.risk_index > 50 ? '#ff0000' : '#000000';
        regimeText.style.color = color;
    }
    
    if (riskLevelBadge && metrics.risk_level) {
        riskLevelBadge.style.display = 'block';
        riskLevelBadge.textContent = `RISK LEVEL: ${metrics.risk_level}`;
        
        if (metrics.risk_index < 40) {
            riskLevelBadge.style.background = '#ffffff';
            riskLevelBadge.style.color = '#000000';
        } else {
            riskLevelBadge.style.background = '#ff0000';
            riskLevelBadge.style.color = '#ffffff';
        }
    }
}

async function loadInitialMetrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            const regimeText = document.getElementById('market-regime-text');
            if (regimeText) {
                regimeText.textContent = 'AWAITING ANALYSIS';
                regimeText.style.color = '#000000';
            }
            const vixDisplay = document.getElementById('vix-display');
            if (vixDisplay) {
                vixDisplay.textContent = 'VIX: Run analysis';
            }
            const riskIndexValue = document.getElementById('risk-index-value');
            if (riskIndexValue) {
                riskIndexValue.textContent = '--/100';
            }
        }
    } catch (error) {
        console.log('Could not check API health');
    }
}

function renderLandingPage() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = `
        <h1 class="landing-title">TENSORTRADE<br>MARKET MAP</h1>
        <div class="landing-subtitle">MULTI-AGENT INTELLIGENCE NETWORK</div>

        <div class="market-map-container">
             <div id="market-map" class="market-map-grid"></div>
        </div>

        <div style="margin-top: 40px;">
            <button id="init-system-btn" class="btn-primary">ENTER DASHBOARD</button>
        </div>
    `;

    const mapGrid = document.getElementById('market-map');
    const symbols = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "BRK.B", "LLY", "AVGO",
        "V", "JPM", "XOM", "WMT", "UNH", "MA", "PG", "JNJ", "HD", "COST",
        "ABBV", "MRK", "KO", "PEP", "BAC", "CVX", "CRM", "AMD", "NFLX", "ADBE",
        "TMO", "CSCO", "ACN", "MCD", "LIN", "ABT", "DHR", "DIS", "PM", "INTC",
        "VZ", "INTU", "TXN", "CMCSA", "PFE", "AMGN", "IBM", "UBER", "NEE", "CAT"
    ];

    symbols.forEach(sym => {
        const change = (Math.random() * 6 - 3).toFixed(2);
        const isUp = change >= 0;

        const block = document.createElement('div');
        block.className = `map-block ${isUp ? 'up' : 'down'}`;
        block.innerHTML = `
            <div class="map-symbol">${sym}</div>
            <div class="map-change">${change > 0 ? '+' : ''}${change}%</div>
        `;

        block.onclick = () => {
            document.getElementById('asset-input').value = sym;
            landingPage.style.display = 'none';
            app.style.display = 'flex';
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);

            // Auto-start analysis if user clicks a block
            // Small delay to ensure UI is ready
            setTimeout(() => runAnalysis(), 500);
        };

        mapGrid.appendChild(block);
    });

    const initBtn = document.getElementById('init-system-btn');
    if (initBtn) {
        initBtn.addEventListener('click', () => {
            landingPage.style.display = 'none';
            app.style.display = 'flex';
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        });
    }
}

renderLandingPage();
setTimeout(loadInitialMetrics, 500);

async function runAnalysis() {
    if (isAnalyzing) return;
    
    const asset = document.getElementById('asset-input').value.trim();
    const userId = document.getElementById('user-id-input').value.trim() || 'dashboard_user';
    const isDemo = document.getElementById('demo-mode-toggle').checked;
    
    if (!asset) {
        alert('Please enter an asset symbol');
        return;
    }
    
    isAnalyzing = true;
    const analyzeBtn = document.getElementById('analyze-btn');
    const statusEl = document.getElementById('assistant-status');
    
    analyzeBtn.textContent = 'ANALYZING...';
    analyzeBtn.disabled = true;
    statusEl.textContent = 'INITIALIZING AGENTS...';
    
    document.getElementById('council-opinions').innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-color);">
            <div style="font-size: 32px; margin-bottom: 15px; animation: pulse 1s infinite;">[PROCESSING]</div>
            <div style="font-size: 16px;">PROCESSING REAL-TIME DATA...</div>
        </div>
    `;

    if (isDemo) {
        console.log("Running in DEMO MODE");
        statusEl.textContent = 'DEMO: SIMULATING ANALYSIS...';
        
        const steps = [
            "Fetching market data...",
            "Running Macro Hawk...",
            "Running Micro Forensic...",
            "Running Flow Detective...",
            "Running Tech Interpreter...",
            "Running Skeptic...",
            "Synthesizing Narrative..."
        ];

        for (const step of steps) {
            statusEl.textContent = step.toUpperCase();
            await new Promise(r => setTimeout(r, 800));
        }
        
        const demoData = JSON.parse(JSON.stringify(DEMO_DATA));
        demoData.asset = asset;
        currentAnalysisData = demoData;

        updateDashboard(demoData);
        statusEl.textContent = 'ANALYSIS COMPLETE [OK]';
        
        isAnalyzing = false;
        analyzeBtn.textContent = 'GENERATE REPORT';
        analyzeBtn.disabled = false;
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/analyze-asset-stream?asset=${encodeURIComponent(asset)}&user_id=${encodeURIComponent(userId)}`);
        
        if (!response.ok) {
             throw new Error(`API Error: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const event = JSON.parse(line);
                    handleStreamEvent(event, statusEl);
                } catch (e) {
                    console.error("Error parsing JSON stream:", e);
                }
            }
        }
        
        statusEl.textContent = 'ANALYSIS COMPLETE [OK]';
        
    } catch (error) {
        console.error('Analysis failed:', error);
        statusEl.textContent = 'ANALYSIS FAILED';
        alert(`Analysis failed: ${error.message}`);
    } finally {
        isAnalyzing = false;
        analyzeBtn.textContent = 'GENERATE REPORT';
        analyzeBtn.disabled = false;
    }
}

function handleStreamEvent(event, statusEl) {
    if (event.type === 'status') {
        statusEl.textContent = event.message.toUpperCase();
    }
    else if (event.type === 'agent_result') {
        addAgentOpinion(event.agent, event.data);
    }
    else if (event.type === 'complete' || event.type === 'final_result') {
        currentAnalysisData = event.data;
        updateDashboard(event.data);
        if (event.data.persona_post) {
            currentPersonaPosts = event.data.persona_post;
        }
    }
    else if (event.type === 'error') {
        statusEl.textContent = `ERROR: ${event.message}`;
    }
}

function addAgentOpinion(agentName, agentData) {
    const councilDiv = document.getElementById('council-opinions');

    if (councilDiv.innerHTML.includes('AWAITING ANALYSIS') || councilDiv.innerHTML.includes('PROCESSING')) {
        councilDiv.innerHTML = '';
    }

    const agentTags = {
        '🦅 Macro Hawk': '[HAWK]',
        '🔬 Micro Forensic': '[FORENSIC]',
        '💧 Flow Detective': '[FLOW]',
        '📊 Tech Interpreter': '[TECH]',
        '🤔 Skeptic': '[SKEPTIC]'
    };
    const tag = agentTags[agentName] || '[AGENT]';

    const div = document.createElement('div');
    div.className = 'opinion-item animate-fade-in';

    div.innerHTML = `
        <div style="font-size: 14px; font-weight: 700; min-width: 80px;">${tag}</div>
        <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 14px; font-weight: 600;">${agentName.replace(/^[^\s]+\s/, '')}</div>
                <div style="border: 1px solid var(--text-color); padding: 2px 8px; font-size: 10px; font-weight: 700;">
                    CONFIDENCE: ${agentData.confidence.toUpperCase()}
                </div>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">${agentData.thesis}</div>
        </div>
    `;

    councilDiv.appendChild(div);
}

function updateDashboard(data) {
    if (data.market_metrics) {
        updateMarketMetrics(data.market_metrics);
    }
    
    const downloadBtn = document.getElementById('download-summary-btn');
    if (downloadBtn && data.market_analysis && data.market_analysis.council_opinions) {
        downloadBtn.style.opacity = '1';
        downloadBtn.style.pointerEvents = 'auto';
    }
    
    const councilDiv = document.getElementById('council-opinions');
    if (data.market_analysis && data.market_analysis.council_opinions) {
        const opinions = data.market_analysis.council_opinions;
        councilDiv.innerHTML = opinions.map((opinion, index) => {
            const agentTags = ['[HAWK]', '[FORENSIC]', '[FLOW]', '[TECH]', '[SKEPTIC]'];
            const agentNames = ['Macro Hawk', 'Micro Forensic', 'Flow Detective', 'Tech Interpreter', 'Skeptic'];
            const cleanOpinion = opinion.replace(/^[^\s]+\s/, '');

            return `
                <div class="opinion-item animate-fade-in" style="animation-delay: ${index * 0.1}s;">
                    <div style="font-size: 14px; font-weight: 700; min-width: 80px;">${agentTags[index]}</div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="font-size: 14px; font-weight: 600;">${agentNames[index]}</div>
                            <div style="border: 1px solid var(--text-color); padding: 2px 8px; font-size: 10px; font-weight: 700;">
                                LLM COUNCIL
                            </div>
                        </div>
                        <div style="font-size: 13px; line-height: 1.6;">${cleanOpinion}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    const narrativeDiv = document.getElementById('narrative-output');
    if (data.narrative && data.narrative.styled_message) {
        narrativeDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 12px; height: 12px; background: var(--accent-color);"></div>
                    <div style="font-size: 14px; font-weight: 600;">AI NARRATIVE (${data.persona_selected.toUpperCase()})</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="playNarrative()" title="Listen" class="btn-primary" style="padding: 4px 10px; font-size: 12px;">[AUDIO]</button>
                    <button onclick="shareToX()" title="Share on X" class="btn-primary" style="padding: 4px 10px; font-size: 12px;">[X]</button>
                    <button onclick="shareToLinkedIn()" title="Share on LinkedIn" class="btn-primary" style="padding: 4px 10px; font-size: 12px;">[LINKEDIN]</button>
                </div>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                ${data.narrative.styled_message || data.narrative.summary || 'No narrative generated'}
            </div>
        `;
    }
    
    const consensusList = document.getElementById('consensus-list');
    if (data.market_analysis && data.market_analysis.consensus) {
        consensusList.innerHTML = data.market_analysis.consensus.map(point => `
            <div style="display: flex; gap: 10px; margin-bottom: 10px; padding: 10px; border: 1px solid var(--text-color);">
                <div style="font-weight: 700; font-size: 14px;">[OK]</div>
                <div style="font-size: 13px; line-height: 1.5;">${point}</div>
            </div>
        `).join('');
    }
    
    if (data.trade_history) {
        const th = data.trade_history;
        document.getElementById('trade-stats').innerHTML = `
            <div style="text-align: center; padding: 15px; border: 1px solid var(--text-color);">
                <div style="font-size: 18px; font-weight: 700;">${th.total_trades}</div>
                <div style="font-size: 11px;">Total Trades</div>
            </div>
            <div style="text-align: center; padding: 15px; border: 1px solid var(--text-color);">
                <div style="font-size: 18px; font-weight: 700;">${th.win_rate.toFixed(1)}%</div>
                <div style="font-size: 11px;">Win Rate</div>
            </div>
            <div style="text-align: center; padding: 15px; border: 1px solid var(--text-color);">
                <div style="font-size: 18px; font-weight: 700; color: ${th.total_pnl >= 0 ? '#000000' : '#ff0000'}">$${th.total_pnl.toFixed(2)}</div>
                <div style="font-size: 11px;">Total P&L</div>
            </div>
            <div style="text-align: center; padding: 15px; border: 1px solid var(--text-color);">
                <div style="font-size: 14px; font-weight: 700;">${data.persona_selected.toUpperCase()}</div>
                <div style="font-size: 11px;">Persona</div>
            </div>
        `;
    }
    
    const behavioralFlags = document.getElementById('behavioral-flags');
    if (data.behavioral_analysis && data.behavioral_analysis.flags) {
        const flags = data.behavioral_analysis.flags;
        if (flags.length > 0) {
            behavioralFlags.innerHTML = `
                <div style="font-size: 12px; margin-bottom: 10px;">BEHAVIORAL FLAGS (${flags.length})</div>
                ${flags.map(flag => `
                    <div style="margin-bottom: 10px; padding: 10px; border: 1px solid var(--accent-color);">
                        <div style="font-size: 12px; font-weight: 600; color: var(--accent-color); margin-bottom: 5px;">${flag.pattern || 'Pattern'}</div>
                        <div style="font-size: 13px; line-height: 1.5;">${flag.message || flag}</div>
                    </div>
                `).join('')}
            `;
        } else {
            behavioralFlags.innerHTML = `
                <div style="font-size: 12px; margin-bottom: 5px;">BEHAVIORAL FLAGS</div>
                <div style="font-size: 13px; line-height: 1.5;">[OK] No concerning patterns.</div>
            `;
        }
    }

    // New Agents: Risk & Sentiment
    const riskBox = document.getElementById('risk-analysis-box');
    const sentimentBox = document.getElementById('sentiment-analysis-box');

    if (data.risk_analysis && data.risk_analysis.metrics) {
        riskBox.style.display = 'block';
        const m = data.risk_analysis.metrics;
        const q = data.risk_analysis.qualitative || {};

        document.getElementById('risk-metrics').innerHTML = `
            VaR (95%): <span style="font-weight:700">${m.var_95}%</span> | Max DD: <span style="font-weight:700">${m.max_drawdown}%</span>
        `;
        document.getElementById('risk-verdict').innerHTML = `
            VERDICT: <span style="color: ${q.verdict === 'HIGH' || q.verdict === 'EXTREME' ? 'var(--accent-color)' : 'var(--text-color)'}">${q.verdict || 'N/A'}</span>
            <div style="font-weight:400; margin-top:4px;">${q.reasoning || ''}</div>
        `;
    }

    if (data.sentiment_analysis && data.sentiment_analysis.score !== undefined) {
        sentimentBox.style.display = 'block';
        const s = data.sentiment_analysis;
        const score = s.score || 0;
        // Map -1 to 1 range to 0 to 100%
        const pct = ((score + 1) / 2) * 100;

        document.getElementById('sentiment-score').textContent = s.label || 'NEUTRAL';
        document.getElementById('sentiment-bar').style.width = `${pct}%`;
        document.getElementById('sentiment-summary').textContent = s.summary || '';
    }

    // Compliance Check
    if (data.compliance_analysis && data.compliance_analysis.status) {
        const comp = data.compliance_analysis;
        const narrativesDiv = document.getElementById('narrative-output');
        const badge = document.createElement('div');
        badge.style.marginTop = '10px';
        badge.style.fontSize = '11px';
        badge.style.padding = '5px';
        badge.style.border = comp.status === 'FLAGGED' ? '1px solid var(--accent-color)' : '1px solid var(--text-color)';
        badge.innerHTML = `
            <b>COMPLIANCE:</b> ${comp.status}
            ${comp.notes ? ` - ${comp.notes}` : ''}
        `;
        narrativesDiv.appendChild(badge);
    }
    
    const marketContext = document.getElementById('market-context');
    const economicEvents = document.getElementById('economic-events');
    
    if (data.market_analysis && data.market_analysis.market_context) {
        const mc = data.market_analysis.market_context;
        marketContext.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 14px; font-weight: 600;">${data.asset}</div>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div style="font-size: 14px; color: ${mc.move_direction === 'UP' ? 'var(--text-color)' : 'var(--accent-color)'}; font-weight: 700;">
                        ${mc.move_direction === 'UP' ? 'UP' : 'DOWN'} ${mc.change_pct}%
                    </div>
                    <div style="font-size: 14px;">$${mc.price}</div>
                    <div style="font-size: 12px;">Vol: ${Number(mc.volume).toLocaleString()}</div>
                </div>
            </div>
        `;
    }
    
    if (data.economic_calendar && data.economic_calendar.economic_events) {
        economicEvents.innerHTML = data.economic_calendar.economic_events.map((event, index) => `
            <div style="padding: 12px; border: 1px solid var(--text-color); margin-bottom: 8px; animation: fadeIn 0.5s ease ${index * 0.1}s both;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 14px; font-weight: 700;">[DATE]</div>
                    <div style="font-size: 13px;">${event}</div>
                </div>
            </div>
        `).join('');
        
        if (data.economic_calendar.recent_news && data.economic_calendar.recent_news.length > 0) {
            economicEvents.innerHTML += `<div style="margin-top: 15px; font-size: 12px; margin-bottom: 10px;">RECENT NEWS</div>`;
            data.economic_calendar.recent_news.forEach((news, index) => {
                if (news.title) {
                    economicEvents.innerHTML += `
                        <div style="padding: 10px; border: 1px solid var(--text-color); margin-bottom: 8px; animation: fadeIn 0.5s ease ${(index + 3) * 0.1}s both;">
                            <div style="font-size: 12px; line-height: 1.5;">${news.title}</div>
                        </div>
                    `;
                }
            });
        }
    }
}

if (document.getElementById('analyze-btn')) {
    document.getElementById('analyze-btn').addEventListener('click', runAnalysis);
}
