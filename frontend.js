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
        "regime_color": "#ffbb44"
    },
    "market_analysis": {
        "council_opinions": [
            "🦅 Macro Hawk (High): Fed pivot priced in, yield curve steepening favors growth.",
            "🔬 Micro Forensic (Moderate): Margins compressing but services revenue +12% YoY.",
            "💧 Flow Detective (High): Massive call gamma squeeze at $180 strike.",
            "📊 Tech Interpreter (Moderate): Bull flag breakout on 4H chart targeting $185.",
            "🤔 Skeptic (Low): Valuation stretched at 32x PE, watch for rug pull."
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
        "x": "AAPL breaking out! 🚀 Fed pivot incoming? Watch $185. #trading #stocks",
        "linkedin": "Market analysis for AAPL suggests strong bullish momentum..."
    }
};

// Share to X Function
function shareToX() {
    // Try to get the post from multiple sources
    let xPost = currentPersonaPosts.x;
    
    // Fallback: check if analysis data has persona_post
    if (!xPost && currentAnalysisData && currentAnalysisData.persona_post && currentAnalysisData.persona_post.x) {
        xPost = currentAnalysisData.persona_post.x;
        currentPersonaPosts.x = xPost; // Update the cache
    }
    
    if (!xPost) {
        console.error('No X post found. Current state:', {
            currentPersonaPosts,
            hasAnalysisData: !!currentAnalysisData,
            personaPostInData: currentAnalysisData?.persona_post
        });
        alert('No X post available. Please run an analysis first.\n\nIf you just ran an analysis, the PersonaAgent may not have generated content yet.');
        return;
    }
    
    // Check if the post is an error message
    if (xPost.includes('[Error:') || xPost.startsWith('[Error')) {
        alert('PersonaAgent Error: ' + xPost + '\n\nThe AI service may be rate limited. Please try again in a few moments.');
        return;
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(xPost).then(() => {
        // Create a modal/notification
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(29, 161, 242, 0.95);
            padding: 30px 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            z-index: 1000;
            animation: fadeIn 0.3s ease;
            max-width: 500px;
        `;
        
        modal.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <div style="font-size: 18px; font-weight: 600; color: white;">X Post Copied!</div>
                <div style="font-size: 14px; color: rgba(255, 255, 255, 0.9); text-align: center; line-height: 1.5; max-height: 200px; overflow-y: auto; padding: 15px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; width: 100%;">${xPost}</div>
                <button onclick="window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('${xPost.replace(/'/g, "\\'").replace(/\n/g, ' ')}'), '_blank'); this.parentElement.parentElement.remove();" style="background: white; color: #1DA1F2; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">Open X to Post</button>
                <button onclick="this.parentElement.parentElement.remove();" style="background: transparent; color: white; border: 1px solid white; padding: 10px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 10000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy post to clipboard');
    });
}

// Share to LinkedIn Function
function shareToLinkedIn() {
    // Try to get the post from multiple sources
    let linkedinPost = currentPersonaPosts.linkedin;
    
    // Fallback: check if analysis data has persona_post
    if (!linkedinPost && currentAnalysisData && currentAnalysisData.persona_post && currentAnalysisData.persona_post.linkedin) {
        linkedinPost = currentAnalysisData.persona_post.linkedin;
        currentPersonaPosts.linkedin = linkedinPost; // Update the cache
    }
    
    if (!linkedinPost) {
        console.error('No LinkedIn post found. Current state:', {
            currentPersonaPosts,
            hasAnalysisData: !!currentAnalysisData,
            personaPostInData: currentAnalysisData?.persona_post
        });
        alert('No LinkedIn post available. Please run an analysis first.\n\nIf you just ran an analysis, the PersonaAgent may not have generated content yet.');
        return;
    }
    
    // Check if the post is an error message
    if (linkedinPost.includes('[Error:') || linkedinPost.startsWith('[Error')) {
        alert('PersonaAgent Error: ' + linkedinPost + '\n\nThe AI service may be rate limited. Please try again in a few moments.');
        return;
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(linkedinPost).then(() => {
        // Create a modal/notification
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 119, 181, 0.95);
            padding: 30px 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            z-index: 1000;
            animation: fadeIn 0.3s ease;
            max-width: 500px;
        `;
        
        modal.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <div style="font-size: 18px; font-weight: 600; color: white;">LinkedIn Post Copied!</div>
                <div style="font-size: 14px; color: rgba(255, 255, 255, 0.9); text-align: center; line-height: 1.5; max-height: 200px; overflow-y: auto; padding: 15px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; width: 100%;">${linkedinPost}</div>
                <button onclick="window.open('https://www.linkedin.com/feed/', '_blank'); this.parentElement.parentElement.remove();" style="background: white; color: #0077b5; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">Open LinkedIn to Post</button>
                <button onclick="this.parentElement.parentElement.remove();" style="background: transparent; color: white; border: 1px solid white; padding: 10px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 10000);
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
    
    // Create formatted summary content
    let summaryContent = `# 5 LLM COUNCIL IN-DEPTH ANALYSIS SUMMARY\n`;
    summaryContent += `Generated: ${new Date().toLocaleString()}\n`;
    summaryContent += `Symbol: ${symbol}\n`;
    summaryContent += `Persona: ${data.persona_selected ? data.persona_selected.toUpperCase() : 'N/A'}\n`;
    summaryContent += `\n${'='.repeat(80)}\n\n`;
    
    // Add 5 LLM Council Opinions
    summaryContent += `## 5 LLM COUNCIL OPINIONS\n\n`;
    const agentNames = ['🦅 Macro Hawk', '🔬 Micro Forensic', '💧 Flow Detective', '📊 Tech Interpreter', '🤔 Skeptic'];
    
    if (data.market_analysis.council_opinions) {
        data.market_analysis.council_opinions.forEach((opinion, index) => {
            summaryContent += `### ${agentNames[index]}\n`;
            summaryContent += `${opinion}\n\n`;
        });
    }
    
    // Add Consensus Points
    if (data.market_analysis.consensus && data.market_analysis.consensus.length > 0) {
        summaryContent += `\n## CONSENSUS POINTS\n\n`;
        data.market_analysis.consensus.forEach((point, index) => {
            summaryContent += `${index + 1}. ${point}\n`;
        });
        summaryContent += `\n`;
    }
    
    // Add AI Narrative
    if (data.narrative && (data.narrative.styled_message || data.narrative.summary || data.narrative.moderated_output)) {
        summaryContent += `\n## AI NARRATIVE (${data.persona_selected ? data.persona_selected.toUpperCase() : 'N/A'})\n\n`;
        const narrativeText = data.narrative.styled_message || data.narrative.summary || data.narrative.moderated_output || 'No narrative available';
        if (narrativeText && narrativeText.trim()) {
            summaryContent += `${narrativeText}\n\n`;
        }
    }
    
    // Add Trade Statistics
    if (data.trade_history) {
        const th = data.trade_history;
        summaryContent += `\n## TRADE STATISTICS\n\n`;
        summaryContent += `- Total Trades: ${th.total_trades || 0}\n`;
        summaryContent += `- Win Rate: ${th.win_rate !== undefined ? th.win_rate.toFixed(1) : '0.0'}%\n`;
        summaryContent += `- Total P&L: $${th.total_pnl !== undefined ? th.total_pnl.toFixed(2) : '0.00'}\n`;
        if (th.avg_pnl !== undefined) {
            summaryContent += `- Average P&L: $${th.avg_pnl.toFixed(2)}\n`;
        } else if (th.total_trades > 0 && th.total_pnl !== undefined) {
            summaryContent += `- Average P&L: $${(th.total_pnl / th.total_trades).toFixed(2)}\n`;
        }
        if (th.last_trade) {
            summaryContent += `- Last Trade: ${th.last_trade}\n`;
        }
        summaryContent += `\n`;
    }
    
    // Add Behavioral Analysis
    if (data.behavioral_analysis && data.behavioral_analysis.flags && data.behavioral_analysis.flags.length > 0) {
        summaryContent += `\n## BEHAVIORAL FLAGS\n\n`;
        data.behavioral_analysis.flags.forEach(flag => {
            summaryContent += `⚠️ ${flag}\n`;
        });
        summaryContent += `\n`;
    }
    
    // Add Market Context
    if (data.economic_calendar && data.economic_calendar.summary) {
        summaryContent += `\n## MARKET CONTEXT\n\n${data.economic_calendar.summary}\n\n`;
    }
    
    // Add Economic Events
    if (data.economic_calendar && data.economic_calendar.economic_events && data.economic_calendar.economic_events.length > 0) {
        summaryContent += `\n## UPCOMING ECONOMIC EVENTS\n\n`;
        data.economic_calendar.economic_events.forEach(event => {
            // Handle both string and object formats
            if (typeof event === 'string') {
                summaryContent += `- ${event}\n`;
            } else if (typeof event === 'object' && event !== null) {
                const eventTitle = event.title || event.event || event.name || JSON.stringify(event);
                summaryContent += `### ${eventTitle}\n`;
                if (event.time || event.date) {
                    summaryContent += `- Time: ${event.time || event.date}\n`;
                }
                if (event.impact) {
                    summaryContent += `- Impact: ${event.impact}\n`;
                }
                if (event.description) {
                    summaryContent += `- Description: ${event.description}\n`;
                }
                summaryContent += `\n`;
            }
        });
    }
    
    // Add Recent News
    if (data.economic_calendar && data.economic_calendar.recent_news && data.economic_calendar.recent_news.length > 0) {
        summaryContent += `\n## RECENT NEWS\n\n`;
        data.economic_calendar.recent_news.forEach((news, index) => {
            if (news) {
                // Handle both string and object formats
                if (typeof news === 'string') {
                    summaryContent += `${index + 1}. ${news}\n`;
                } else if (typeof news === 'object' && news !== null) {
                    const newsText = news.headline || news.title || news.description || news.text || JSON.stringify(news);
                    summaryContent += `${index + 1}. ${newsText}\n`;
                    if (news.url || news.link) {
                        summaryContent += `   Source: ${news.url || news.link}\n`;
                    }
                }
            }
        });
        summaryContent += `\n`;
    }
    
    summaryContent += `\n${'='.repeat(80)}\n`;
    summaryContent += `\nReport generated by TensorTrade AI Trading Analyst\n`;
    summaryContent += `Powered by 5-Agent LLM Council\n`;
    
    // Create blob and download
    const blob = new Blob([summaryContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TensorTrade_5LLM_Summary_${symbol}_${timestamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Summary downloaded successfully');
}

const app = document.createElement('div');
app.id = 'deriv-ai-dashboard';
app.style.cssText = `
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0a0b12;
    color: #ffffff;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
`;

// Add global styles
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.6; }
        100% { opacity: 1; }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .gradient-text {
        background: linear-gradient(90deg, #ff4444, #ff8888);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    
    .card {
        background: rgba(18, 20, 30, 0.9);
        border: 1px solid rgba(255, 68, 68, 0.15);
        backdrop-filter: blur(10px);
    }
    
    .risk-high { color: #ff4444; }
    .risk-medium { color: #ffbb44; }
    .risk-low { color: #44ff88; }
    
    .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 6px;
    }
    
    .status-live { background: #ff4444; animation: pulse 2s infinite; }
    .status-active { background: #44ff88; }
    .status-neutral { background: #ffbb44; }
    
    ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }
    
    ::-webkit-scrollbar-track {
        background: rgba(255, 68, 68, 0.1);
        border-radius: 3px;
    }
    
    ::-webkit-scrollbar-thumb {
        background: #ff4444;
        border-radius: 3px;
    }
`;

// Load TradingView Lightweight Charts
const tvScript = document.createElement('script');
tvScript.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
document.head.appendChild(tvScript);

document.head.appendChild(style);

// Header
const header = document.createElement('header');
header.style.cssText = `
    background: rgba(10, 11, 18, 0.95);
    border-bottom: 1px solid rgba(255, 68, 68, 0.2);
    padding: 20px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    backdrop-filter: blur(10px);
    position: sticky;
    top: 0;
    z-index: 100;
`;

const logoSection = document.createElement('div');
logoSection.style.cssText = `
    display: flex;
    align-items: center;
    gap: 20px;
`;

const logo = document.createElement('div');
logo.innerHTML = `
    <div style="font-size: 48px; line-height: 1; display: flex; align-items: center; justify-content: center;">🎢</div>
`;

const title = document.createElement('div');
title.innerHTML = `
    <h1 style="margin: 0; font-size: 24px; font-weight: 800;">
        <span class="gradient-text">🎢 TENSORTRADE</span>
        <span style="color: #8899aa; font-size: 14px; font-weight: 400; margin-left: 10px;">INTELLIGENT TRADING ANALYST</span>
    </h1>
`;

logoSection.appendChild(logo);
logoSection.appendChild(title);

const statusIndicator = document.createElement('div');
statusIndicator.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #44ff88;
    background: rgba(68, 255, 136, 0.1);
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid rgba(68, 255, 136, 0.2);
`;

statusIndicator.innerHTML = `
    <span class="status-indicator status-live"></span>
    LIVE MARKETS • REALTIME ANALYSIS
`;

header.appendChild(logoSection);
header.appendChild(statusIndicator);

// Main Dashboard Grid
const dashboardGrid = document.createElement('div');
dashboardGrid.style.cssText = `
    display: grid;
    grid-template-columns: 300px 1fr 400px;
    gap: 20px;
    padding: 30px;
    flex: 1;
    max-width: 1920px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
`;

// Left Panel - Analysis Setup
const leftPanel = document.createElement('div');
leftPanel.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const createCard = (title, content, options = {}) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = `
        border-radius: 12px;
        padding: ${options.padding || '24px'};
        animation: fadeIn 0.5s ease;
        ${options.minHeight ? `min-height: ${options.minHeight};` : ''}
        ${options.height ? `height: ${options.height};` : ''}
    `;
    
    const cardHeader = document.createElement('div');
    cardHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 1px solid rgba(255, 68, 68, 0.1);
        padding-bottom: 12px;
    `;
    
    const titleEl = document.createElement('h3');
    titleEl.style.cssText = `
        margin: 0;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #ff8888;
        font-weight: 600;
    `;
    titleEl.textContent = title;
    
    cardHeader.appendChild(titleEl);
    
    if (options.badge) {
        const badge = document.createElement('span');
        badge.style.cssText = `
            background: rgba(255, 68, 68, 0.2);
            color: #ff8888;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            border: 1px solid rgba(255, 68, 68, 0.3);
        `;
        badge.textContent = options.badge;
        cardHeader.appendChild(badge);
    }
    
    card.appendChild(cardHeader);
    card.appendChild(content);
    
    return card;
};

// Assistant Card
const assistantContent = document.createElement('div');
assistantContent.innerHTML = `
    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #ff0000); display: flex; align-items: center; justify-content: center; font-size: 28px;">
            🤖
        </div>
        <div>
            <div style="font-size: 16px; font-weight: 600; color: #ffffff;">AI Assistant</div>
            <div id="assistant-status" style="font-size: 12px; color: #8899aa;">Ready for Analysis</div>
        </div>
    </div>
    <div style="background: rgba(255, 68, 68, 0.05); border-radius: 8px; padding: 15px; margin-bottom: 15px; border: 1px solid rgba(255, 68, 68, 0.1);">
        <div style="font-size: 12px; color: #ff8888; margin-bottom: 5px;">Asset Symbol:</div>
        <input id="asset-input" type="text" placeholder="e.g. AAPL, SPY, TSLA" style="width: 100%; padding: 10px; background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.2); border-radius: 6px; color: #ffffff; font-size: 13px; margin-bottom: 10px;" value="AAPL">
        <div style="font-size: 12px; color: #ff8888; margin-bottom: 5px;">User ID (optional):</div>
        <input id="user-id-input" type="text" placeholder="e.g. trader_123" style="width: 100%; padding: 10px; background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.2); border-radius: 6px; color: #ffffff; font-size: 13px; margin-bottom: 15px;" value="dashboard_user">

        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="demo-mode-toggle" style="accent-color: #ff4444;">
            <span style="font-size: 13px; color: #8899aa;">Demo Mode (Mock Data)</span>
        </label>
    </div>
    <button id="analyze-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #ff4444, #ff0000); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
        GENERATE ANALYSIS REPORT
    </button>
`;

leftPanel.appendChild(createCard('ASSISTANT', assistantContent));

// Analysis Setup Card (will be updated dynamically)
const analysisSetupContent = document.createElement('div');
analysisSetupContent.id = 'analysis-setup-content';
analysisSetupContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
        <div>
            <div style="font-size: 12px; color: #8899aa; margin-bottom: 8px;">MARKET REGIME</div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div id="market-regime-box" style="padding: 8px 16px; background: rgba(255, 68, 68, 0.2); border-radius: 8px; border: 1px solid rgba(255, 68, 68, 0.3);">
                    <div id="market-regime-text" style="font-size: 18px; font-weight: 700; color: #ff4444;">LOADING...</div>
                </div>
                <div id="vix-display" style="font-size: 12px; color: #8899aa; background: rgba(136, 153, 170, 0.1); padding: 4px 10px; border-radius: 6px;">VIX: --</div>
            </div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #8899aa; margin-bottom: 8px;">RISK INDEX</div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 12px; color: #8899aa;">Current</span>
                        <span id="risk-index-value" style="font-size: 16px; font-weight: 700; color: #ff4444;">--/100</span>
                    </div>
                    <div style="height: 8px; background: rgba(255, 68, 68, 0.1); border-radius: 4px; overflow: hidden;">
                        <div id="risk-index-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #ff4444, #ff8888); border-radius: 4px; transition: width 0.5s ease;"></div>
                    </div>
                </div>
            </div>
        </div>
        <div id="risk-level-badge" style="text-align: center; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: 600; display: none;"></div>
    </div>
`;

leftPanel.appendChild(createCard('ANALYSIS SETUP', analysisSetupContent, { minHeight: '300px' }));

// Center Panel - Main Analysis
const centerPanel = document.createElement('div');
centerPanel.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

// Market Drivers Card (5 LLM Council Opinions)
const marketDriversContent = document.createElement('div');
marketDriversContent.id = 'market-drivers-content';
marketDriversContent.innerHTML = `
    <div id="council-opinions" style="display: grid; gap: 15px;">
        <div style="text-align: center; padding: 40px; color: #8899aa;">
            <div style="font-size: 48px; margin-bottom: 15px;">🤖</div>
            <div style="font-size: 16px; margin-bottom: 10px;">Awaiting Analysis</div>
            <div style="font-size: 13px;">Click "GENERATE ANALYSIS REPORT" to run the 5-agent LLM council</div>
        </div>
    </div>
`;

// Create market drivers card with download button
const marketDriversCard = createCard('KEY MARKET DRIVERS', marketDriversContent);
const marketDriversHeader = marketDriversCard.querySelector('h3').parentElement;

// Add download button to the header
const downloadBtn = document.createElement('button');
downloadBtn.id = 'download-summary-btn';
downloadBtn.style.cssText = `
    background: linear-gradient(135deg, #44ff88, #00cc66);
    border: none;
    border-radius: 8px;
    color: #0a0b12;
    padding: 8px 16px;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.3s ease;
    opacity: 0.5;
    pointer-events: none;
`;
downloadBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    <span>DOWNLOAD SUMMARY</span>
`;
downloadBtn.onclick = downloadSummary;
marketDriversHeader.appendChild(downloadBtn);

centerPanel.appendChild(marketDriversCard);

// Live Intelligence Row (Economic Calendar & Behavioral Analysis)
const liveIntelligenceRow = document.createElement('div');
liveIntelligenceRow.style.cssText = `
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 20px;
`;

const liveIntelContent = document.createElement('div');
liveIntelContent.id = 'live-intel-content';
liveIntelContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 14px; font-weight: 600; color: #ffffff;">Live Market Intelligence</div>
                <div style="font-size: 12px; color: #8899aa;">AI will automatically search for real-time news, sentiment, and fundamental data for selected assets.</div>
            </div>
            <button style="background: linear-gradient(135deg, #ff4444, #ff0000); border: none; border-radius: 8px; color: white; padding: 10px 24px; font-weight: 600; cursor: pointer; font-size: 12px;">
                RUN LIVE ANALYSIS
            </button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
            <div style="background: rgba(255, 68, 68, 0.05); border: 1px solid rgba(255, 68, 68, 0.1); border-radius: 8px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="font-size: 16px; font-weight: 700; color: #ffffff;">SPX500</div>
                    <div style="font-size: 14px; color: #44ff88;">+0.8%</div>
                </div>
                <div style="font-size: 13px; color: #8899aa; line-height: 1.5;">
                    The index is testing the psychological 7,000 level but faces a DeMARK 'Bar 9' exhaustion signal.
                </div>
                <div style="margin-top: 15px; padding: 10px; background: rgba(255, 68, 68, 0.1); border-radius: 6px;">
                    <div style="font-size: 11px; color: #ff8888; margin-bottom: 5px;">PRESSURE GAUGE</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="flex: 1; height: 6px; background: rgba(255, 68, 68, 0.2); border-radius: 3px; overflow: hidden;">
                            <div style="width: 58%; height: 100%; background: linear-gradient(90deg, #ff4444, #ff8888);"></div>
                        </div>
                        <div style="font-size: 14px; font-weight: 700; color: #ff4444;">58</div>
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(68, 136, 255, 0.05); border: 1px solid rgba(68, 136, 255, 0.1); border-radius: 8px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="font-size: 16px; font-weight: 700; color: #ffffff;">US100</div>
                    <div style="font-size: 14px; color: #ff4444;">-1.2%</div>
                </div>
                <div style="font-size: 13px; color: #8899aa; line-height: 1.5;">
                    Tech-heavy index under pressure with institutional rotation towards value-oriented cyclicals.
                </div>
                <div style="margin-top: 15px; padding: 10px; background: rgba(68, 136, 255, 0.1); border-radius: 6px;">
                    <div style="font-size: 11px; color: #44aaff; margin-bottom: 5px;">TECHNICAL EXHAUSTION</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="flex: 1; height: 6px; background: rgba(68, 136, 255, 0.2); border-radius: 3px; overflow: hidden;">
                            <div style="width: 72%; height: 100%; background: linear-gradient(90deg, #44aaff, #4488ff);"></div>
                        </div>
                        <div style="font-size: 14px; font-weight: 700; color: #44aaff;">72</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

liveIntelligenceRow.appendChild(createCard('LIVE INTELLIGENCE', liveIntelContent));

centerPanel.appendChild(liveIntelligenceRow);

// Right Panel - Strategy & Matrix
const rightPanel = document.createElement('div');
rightPanel.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

// Play Narrative Audio
function playNarrative() {
    if (!currentAnalysisData || !currentAnalysisData.narrative) return;

    const text = currentAnalysisData.narrative.styled_message || currentAnalysisData.narrative.summary;
    if (!text) return;

    // Stop existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
}

// AI Strategy Card (Narrative & Summary)
const strategyContent = document.createElement('div');
strategyContent.id = 'strategy-content';
strategyContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
        <div id="narrative-output" style="background: rgba(255, 68, 68, 0.05); border: 1px solid rgba(255, 68, 68, 0.1); border-radius: 8px; padding: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: #ff4444;"></div>
                    <div style="font-size: 14px; font-weight: 600; color: #ffffff;">AI NARRATIVE</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="playNarrative()" title="Listen" style="background: rgba(0, 0, 0, 0.8); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; padding: 6px 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255, 255, 255, 0.1)';" onmouseout="this.style.background='rgba(0, 0, 0, 0.8)';">
                        <span style="font-size: 14px;">🔊</span>
                    </button>
                    <button onclick="shareToX()" title="Share on X" style="background: rgba(0, 0, 0, 0.8); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; padding: 6px 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(29, 161, 242, 0.2)';" onmouseout="this.style.background='rgba(0, 0, 0, 0.8)';">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DA1F2">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span style="font-size: 12px; color: #ffffff; font-weight: 600;">X</span>
                    </button>
                    <button onclick="shareToLinkedIn()" title="Share on LinkedIn" style="background: rgba(0, 119, 181, 0.2); border: 1px solid rgba(0, 119, 181, 0.4); border-radius: 6px; padding: 6px 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(0, 119, 181, 0.4)';" onmouseout="this.style.background='rgba(0, 119, 181, 0.2)';">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077b5">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        <span style="font-size: 12px; color: #ffffff; font-weight: 600;">LinkedIn</span>
                    </button>
                </div>
            </div>
            <div style="font-size: 13px; color: #8899aa; line-height: 1.6;">
                Awaiting analysis... The AI will generate a personalized trading narrative based on your history and market conditions.
            </div>
        </div>
        
        <div id="consensus-section">
            <div style="font-size: 12px; color: #8899aa; margin-bottom: 15px;">CONSENSUS POINTS</div>
            <div id="consensus-list" style="color: #8899aa; font-size: 13px;">
                No consensus data available yet
            </div>
        </div>
    </div>
`;

rightPanel.appendChild(createCard('AI STRATEGY', strategyContent));

// Asset Impact Matrix (Market Context & Chart)
const matrixContent = document.createElement('div');
matrixContent.id = 'matrix-content';
matrixContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
        <div id="chart-container" style="height: 250px; width: 100%; background: rgba(0,0,0,0.2); border-radius: 8px;"></div>

        <div id="market-context" style="font-size: 12px; color: #8899aa; margin-bottom: 5px;">
            MARKET CONTEXT - Awaiting data...
        </div>
        <div id="economic-events" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align: center; padding: 20px; color: #8899aa; font-size: 13px;">
                Economic calendar events will appear here after analysis
            </div>
        </div>
    </div>
`;

rightPanel.appendChild(createCard('ASSET IMPACT MATRIX', matrixContent, { minHeight: '400px' }));

// Chart initialization function
let chart = null;
let candleSeries = null;

function initChart() {
    const container = document.getElementById('chart-container');
    if (!container || !window.LightweightCharts) return;

    // Clean up previous chart
    container.innerHTML = '';

    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 250,
        layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: '#8899aa',
        },
        grid: {
            vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
            horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
        },
        timeScale: {
            borderColor: 'rgba(42, 46, 57, 0.6)',
        },
        rightPriceScale: {
            borderColor: 'rgba(42, 46, 57, 0.6)',
        },
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#44ff88',
        downColor: '#ff4444',
        borderVisible: false,
        wickUpColor: '#44ff88',
        wickDownColor: '#ff4444',
    });

    // Generate dummy data for visual effect
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

    // Responsive resize
    new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== container) { return; }
        const newRect = entries[0].contentRect;
        chart.applyOptions({ width: newRect.width, height: newRect.height });
    }).observe(container);
}

// Call initChart after DOM load
setTimeout(initChart, 1000);

// Behavioral Insights Card (Trade History & Behavioral Flags)
const behavioralContent = document.createElement('div');
behavioralContent.id = 'behavioral-content';
behavioralContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
        <div id="behavioral-flags" style="background: rgba(68, 136, 255, 0.05); border: 1px solid rgba(68, 136, 255, 0.1); border-radius: 8px; padding: 15px;">
            <div style="font-size: 12px; color: #44aaff; margin-bottom: 5px;">BEHAVIORAL FLAGS</div>
            <div style="font-size: 13px; color: #ffffff; line-height: 1.5;">
                No behavioral patterns detected yet. Analysis will identify trading psychology issues.
            </div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #8899aa; margin-bottom: 10px;">TRADING STATISTICS</div>
            <div id="trade-stats" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div style="text-align: center; padding: 15px; background: rgba(255, 68, 68, 0.05); border-radius: 8px;">
                    <div style="font-size: 18px; font-weight: 700; color: #ff4444;">-</div>
                    <div style="font-size: 11px; color: #8899aa;">Total Trades</div>
                </div>
                <div style="text-align: center; padding: 15px; background: rgba(68, 255, 136, 0.05); border-radius: 8px;">
                    <div style="font-size: 18px; font-weight: 700; color: #44ff88;">-</div>
                    <div style="font-size: 11px; color: #8899aa;">Win Rate</div>
                </div>
                <div style="text-align: center; padding: 15px; background: rgba(255, 187, 68, 0.05); border-radius: 8px;">
                    <div style="font-size: 18px; font-weight: 700; color: #ffbb44;">$-</div>
                    <div style="font-size: 11px; color: #8899aa;">Total P&L</div>
                </div>
                <div style="text-align: center; padding: 15px; background: rgba(136, 68, 255, 0.05); border-radius: 8px;">
                    <div style="font-size: 18px; font-weight: 700; color: #8844ff;">-</div>
                    <div style="font-size: 11px; color: #8899aa;">Persona</div>
                </div>
            </div>
        </div>
    </div>
`;

rightPanel.appendChild(createCard('BEHAVIORAL INSIGHTS', behavioralContent));

// Assemble dashboard
dashboardGrid.appendChild(leftPanel);
dashboardGrid.appendChild(centerPanel);
dashboardGrid.appendChild(rightPanel);

// Footer
const footer = document.createElement('footer');
footer.style.cssText = `
    background: rgba(10, 11, 18, 0.95);
    border-top: 1px solid rgba(255, 68, 68, 0.2);
    padding: 20px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #8899aa;
    backdrop-filter: blur(10px);
`;

const footerLeft = document.createElement('div');
footerLeft.innerHTML = `
    <div style="margin-bottom: 5px;">DERIV HACKATHON • INTELLIGENT TRADING ANALYST</div>
    <div>AI-powered market intelligence platform • Version 1.0</div>
`;

const footerRight = document.createElement('div');
footerRight.innerHTML = `
    <div style="text-align: right;">
        <div style="margin-bottom: 5px;">Data Sources: Bloomberg • Reuters • MarketWatch • TradingView</div>
        <div>Last Updated: ${new Date().toLocaleTimeString()} • Next Analysis: 15s</div>
    </div>
`;

footer.appendChild(footerLeft);
footer.appendChild(footerRight);

// Build app
app.appendChild(header);
app.appendChild(dashboardGrid);
app.appendChild(footer);

// Function to update market metrics dynamically
function updateMarketMetrics(metrics) {
    console.log('Updating market metrics:', metrics);
    
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
        
        // Update risk bar width with animation
        if (riskIndexBar) {
            riskIndexBar.style.width = `${metrics.risk_index}%`;
        }
    }
    
    // Color coding based on regime
    if (regimeBox && metrics.regime_color) {
        const color = metrics.regime_color;
        regimeBox.style.background = `${color}20`;
        regimeBox.style.borderColor = `${color}40`;
        if (regimeText) {
            regimeText.style.color = color;
        }
    }
    
    // Update risk level badge
    if (riskLevelBadge && metrics.risk_level) {
        riskLevelBadge.style.display = 'block';
        riskLevelBadge.textContent = `RISK LEVEL: ${metrics.risk_level}`;
        
        // Color based on risk level
        if (metrics.risk_index < 40) {
            riskLevelBadge.style.background = 'rgba(68, 255, 136, 0.2)';
            riskLevelBadge.style.border = '1px solid rgba(68, 255, 136, 0.4)';
            riskLevelBadge.style.color = '#44ff88';
        } else if (metrics.risk_index < 70) {
            riskLevelBadge.style.background = 'rgba(255, 215, 0, 0.2)';
            riskLevelBadge.style.border = '1px solid rgba(255, 215, 0, 0.4)';
            riskLevelBadge.style.color = '#ffd700';
        } else {
            riskLevelBadge.style.background = 'rgba(255, 68, 68, 0.2)';
            riskLevelBadge.style.border = '1px solid rgba(255, 68, 68, 0.4)';
            riskLevelBadge.style.color = '#ff4444';
        }
    }
}

// Load initial VIX on page load (optional - can fetch from a simple endpoint)
async function loadInitialMetrics() {
    try {
        // Try to fetch initial metrics without asset (can show generic market metrics)
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            const healthData = await response.json();
            console.log('API is healthy:', healthData);
            
            // Set initial loading state
            const regimeText = document.getElementById('market-regime-text');
            if (regimeText) {
                regimeText.textContent = 'AWAITING ANALYSIS';
                regimeText.style.color = '#8899aa';
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
        console.log('Could not check API health (normal if server is not running)');
    }
}

// Initialize
document.body.style.cssText = 'margin: 0; padding: 0; background: #0a0b12;';
document.body.appendChild(app);

// Load initial metrics
setTimeout(loadInitialMetrics, 500);

// API Integration Functions
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
    
    // Update UI to show loading state
    analyzeBtn.textContent = 'ANALYZING...';
    analyzeBtn.disabled = true;
    analyzeBtn.style.opacity = '0.6';
    statusEl.textContent = 'Initializing agents...';
    statusEl.style.color = '#ff8888';
    
    // Reset council opinions
    document.getElementById('council-opinions').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #8899aa;">
            <div style="font-size: 48px; margin-bottom: 15px; animation: pulse 1s infinite;">🤖</div>
            <div style="font-size: 16px;">Processing real-time data...</div>
        </div>
    `;

    // DEMO MODE HANDLER
    if (isDemo) {
        console.log("Running in DEMO MODE");
        statusEl.textContent = 'DEMO: Simulating analysis...';
        
        // Simulate streaming delays
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
            statusEl.textContent = step;
            await new Promise(r => setTimeout(r, 800)); // 800ms delay per step
        }
        
        const demoData = JSON.parse(JSON.stringify(DEMO_DATA));
        demoData.asset = asset; // Use entered asset
        currentAnalysisData = demoData;

        updateDashboard(demoData);
        statusEl.textContent = 'Analysis Complete ✓';
        statusEl.style.color = '#44ff88';
        
        isAnalyzing = false;
        analyzeBtn.textContent = 'GENERATE ANALYSIS REPORT';
        analyzeBtn.disabled = false;
        analyzeBtn.style.opacity = '1';
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
            buffer = lines.pop(); // Keep incomplete line in buffer

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
        
        statusEl.textContent = 'Analysis Complete ✓';
        statusEl.style.color = '#44ff88';
        
    } catch (error) {
        console.error('Analysis failed:', error);
        statusEl.textContent = 'Analysis Failed';
        statusEl.style.color = '#ff4444';
        alert(`Analysis failed: ${error.message}`);
    } finally {
        isAnalyzing = false;
        analyzeBtn.textContent = 'GENERATE ANALYSIS REPORT';
        analyzeBtn.disabled = false;
        analyzeBtn.style.opacity = '1';
    }
}

function handleStreamEvent(event, statusEl) {
    console.log("Stream Event:", event);

    if (event.type === 'status') {
        statusEl.textContent = event.message;
    }
    else if (event.type === 'agent_result') {
        // Light up an agent in the council view
        addAgentOpinion(event.agent, event.data);
    }
    else if (event.type === 'trade_history') {
        // Update trade stats partially
        // (optional: could implement partial UI updates)
    }
    else if (event.type === 'complete' || event.type === 'final_result') {
        currentAnalysisData = event.data;
        updateDashboard(event.data);

        // Cache persona posts
        if (event.data.persona_post) {
            currentPersonaPosts = event.data.persona_post;
        }
    }
    else if (event.type === 'error') {
        statusEl.textContent = `Error: ${event.message}`;
        statusEl.style.color = '#ff4444';
    }
}

function addAgentOpinion(agentName, agentData) {
    const councilDiv = document.getElementById('council-opinions');

    // Clear waiting message if it's the first agent
    if (councilDiv.innerHTML.includes('Awaiting Analysis') || councilDiv.innerHTML.includes('Processing real-time')) {
        councilDiv.innerHTML = '';
    }

    const agentEmojis = {'🦅 Macro Hawk': '🦅', '🔬 Micro Forensic': '🔬', '💧 Flow Detective': '💧', '📊 Tech Interpreter': '📊', '🤔 Skeptic': '🤔'};
    const emoji = agentEmojis[agentName] || '🤖';

    const div = document.createElement('div');
    div.style.cssText = `
        display: flex;
        gap: 15px;
        padding: 15px;
        background: rgba(255, 68, 68, 0.03);
        border-radius: 8px;
        border: 1px solid rgba(255, 68, 68, 0.1);
        animation: fadeIn 0.5s ease;
        margin-bottom: 15px;
    `;

    div.innerHTML = `
        <div style="font-size: 32px; min-width: 50px;">${emoji}</div>
        <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 14px; font-weight: 600; color: #44aaff;">${agentName}</div>
                <div style="background: rgba(68, 170, 255, 0.1); color: #44aaff; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid rgba(68, 170, 255, 0.2);">
                    CONFIDENCE: ${agentData.confidence.toUpperCase()}
                </div>
            </div>
            <div style="font-size: 13px; color: #ffffff; line-height: 1.6;">${agentData.thesis}</div>
        </div>
    `;

    councilDiv.appendChild(div);
}

function updateDashboard(data) {
    console.log('Updating dashboard with:', data);
    
    // Update Market Metrics (VIX, Market Regime, Risk Index)
    if (data.market_metrics) {
        updateMarketMetrics(data.market_metrics);
    }
    
    // Enable download button
    const downloadBtn = document.getElementById('download-summary-btn');
    if (downloadBtn && data.market_analysis && data.market_analysis.council_opinions) {
        downloadBtn.style.opacity = '1';
        downloadBtn.style.pointerEvents = 'auto';
        downloadBtn.onmouseover = function() {
            this.style.background = 'linear-gradient(135deg, #33dd77, #00aa55)';
            this.style.transform = 'translateY(-2px)';
        };
        downloadBtn.onmouseout = function() {
            this.style.background = 'linear-gradient(135deg, #44ff88, #00cc66)';
            this.style.transform = 'translateY(0)';
        };
    }
    
    // Update 5 LLM Council Opinions
    const councilDiv = document.getElementById('council-opinions');
    if (data.market_analysis && data.market_analysis.council_opinions) {
        const opinions = data.market_analysis.council_opinions;
        councilDiv.innerHTML = opinions.map((opinion, index) => {
            const agentEmojis = ['🦅', '🔬', '💧', '📊', '🤔'];
            const agentColors = ['#ff4444', '#44aaff', '#44ff88', '#ffbb44', '#8844ff'];
            const agentNames = ['Macro Hawk', 'Micro Forensic', 'Flow Detective', 'Tech Interpreter', 'Skeptic'];
            return `
                <div style="display: flex; gap: 15px; padding: 15px; background: rgba(255, 68, 68, 0.03); border-radius: 8px; border: 1px solid rgba(255, 68, 68, 0.1); animation: fadeIn 0.5s ease ${index * 0.1}s both;">
                    <div style="font-size: 32px; min-width: 50px;">${agentEmojis[index]}</div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="font-size: 14px; font-weight: 600; color: ${agentColors[index]};">${agentNames[index]}</div>
                            <div style="background: ${agentColors[index]}20; color: ${agentColors[index]}; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid ${agentColors[index]}40;">
                                LLM COUNCIL
                            </div>
                        </div>
                        <div style="font-size: 13px; color: #ffffff; line-height: 1.6;">${opinion}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Update Narrative
    const narrativeDiv = document.getElementById('narrative-output');
    if (data.narrative && data.narrative.styled_message) {
        narrativeDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: #44ff88;"></div>
                    <div style="font-size: 14px; font-weight: 600; color: #ffffff;">AI NARRATIVE (${data.persona_selected.toUpperCase()})</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="playNarrative()" title="Listen" style="background: rgba(0, 0, 0, 0.8); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; padding: 6px 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255, 255, 255, 0.1)';" onmouseout="this.style.background='rgba(0, 0, 0, 0.8)';">
                        <span style="font-size: 14px;">🔊</span>
                    </button>
                    <button onclick="shareToX()" title="Share on X" style="background: rgba(0, 0, 0, 0.8); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; padding: 6px 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(29, 161, 242, 0.2)';" onmouseout="this.style.background='rgba(0, 0, 0, 0.8)';">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DA1F2">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span style="font-size: 12px; color: #ffffff; font-weight: 600;">X</span>
                    </button>
                    <button onclick="shareToLinkedIn()" title="Share on LinkedIn" style="background: rgba(0, 119, 181, 0.2); border: 1px solid rgba(0, 119, 181, 0.4); border-radius: 6px; padding: 6px 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(0, 119, 181, 0.4)';" onmouseout="this.style.background='rgba(0, 119, 181, 0.2)';">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077b5">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        <span style="font-size: 12px; color: #ffffff; font-weight: 600;">LinkedIn</span>
                    </button>
                </div>
            </div>
            <div style="font-size: 13px; color: #ffffff; line-height: 1.6;">
                ${data.narrative.styled_message || data.narrative.summary || 'No narrative generated'}
            </div>
        `;
    }
    
    // Update Consensus Points
    const consensusList = document.getElementById('consensus-list');
    if (data.market_analysis && data.market_analysis.consensus) {
        consensusList.innerHTML = data.market_analysis.consensus.map(point => `
            <div style="display: flex; gap: 10px; margin-bottom: 10px; padding: 10px; background: rgba(68, 255, 136, 0.05); border-radius: 6px; border: 1px solid rgba(68, 255, 136, 0.1);">
                <div style="color: #44ff88; font-size: 16px;">✓</div>
                <div style="font-size: 13px; color: #ffffff; line-height: 1.5;">${point}</div>
            </div>
        `).join('');
    }
    
    // Update Trade Statistics
    if (data.trade_history) {
        const th = data.trade_history;
        document.getElementById('trade-stats').innerHTML = `
            <div style="text-align: center; padding: 15px; background: rgba(255, 68, 68, 0.05); border-radius: 8px;">
                <div style="font-size: 18px; font-weight: 700; color: #ff4444;">${th.total_trades}</div>
                <div style="font-size: 11px; color: #8899aa;">Total Trades</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(68, 255, 136, 0.05); border-radius: 8px;">
                <div style="font-size: 18px; font-weight: 700; color: #44ff88;">${th.win_rate.toFixed(1)}%</div>
                <div style="font-size: 11px; color: #8899aa;">Win Rate</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(255, 187, 68, 0.05); border-radius: 8px;">
                <div style="font-size: 18px; font-weight: 700; color: ${th.total_pnl >= 0 ? '#44ff88' : '#ff4444'}">$${th.total_pnl.toFixed(2)}</div>
                <div style="font-size: 11px; color: #8899aa;">Total P&L</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(136, 68, 255, 0.05); border-radius: 8px;">
                <div style="font-size: 14px; font-weight: 700; color: #8844ff;">${data.persona_selected.toUpperCase()}</div>
                <div style="font-size: 11px; color: #8899aa;">Persona</div>
            </div>
        `;
    }
    
    // Update Behavioral Flags
    const behavioralFlags = document.getElementById('behavioral-flags');
    if (data.behavioral_analysis && data.behavioral_analysis.flags) {
        const flags = data.behavioral_analysis.flags;
        if (flags.length > 0) {
            behavioralFlags.innerHTML = `
                <div style="font-size: 12px; color: #44aaff; margin-bottom: 10px;">BEHAVIORAL FLAGS (${flags.length})</div>
                ${flags.map(flag => `
                    <div style="margin-bottom: 10px; padding: 10px; background: rgba(255, 68, 68, 0.1); border-radius: 6px; border: 1px solid rgba(255, 68, 68, 0.2);">
                        <div style="font-size: 12px; font-weight: 600; color: #ff8888; margin-bottom: 5px;">${flag.pattern || 'Behavioral Pattern'}</div>
                        <div style="font-size: 13px; color: #ffffff; line-height: 1.5;">${flag.message || flag}</div>
                    </div>
                `).join('')}
            `;
        } else {
            behavioralFlags.innerHTML = `
                <div style="font-size: 12px; color: #44aaff; margin-bottom: 5px;">BEHAVIORAL FLAGS</div>
                <div style="font-size: 13px; color: #44ff88; line-height: 1.5;">✓ No concerning behavioral patterns detected</div>
            `;
        }
    }
    
    // Update Market Context and Economic Events
    const marketContext = document.getElementById('market-context');
    const economicEvents = document.getElementById('economic-events');
    
    if (data.market_analysis && data.market_analysis.market_context) {
        const mc = data.market_analysis.market_context;
        marketContext.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 14px; font-weight: 600; color: #ffffff;">${data.asset}</div>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div style="font-size: 14px; color: ${mc.move_direction === 'UP' ? '#44ff88' : '#ff4444'};">
                        ${mc.move_direction === 'UP' ? '↗' : '↘'} ${mc.change_pct}%
                    </div>
                    <div style="font-size: 14px; color: #8899aa;">$${mc.price}</div>
                    <div style="font-size: 12px; color: #8899aa;">Vol: ${Number(mc.volume).toLocaleString()}</div>
                </div>
            </div>
        `;
    }
    
    if (data.economic_calendar && data.economic_calendar.economic_events) {
        economicEvents.innerHTML = data.economic_calendar.economic_events.map((event, index) => `
            <div style="padding: 12px; background: rgba(255, 187, 68, 0.05); border-radius: 8px; border: 1px solid rgba(255, 187, 68, 0.1); animation: fadeIn 0.5s ease ${index * 0.1}s both;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 18px;">📅</div>
                    <div style="font-size: 13px; color: #ffffff;">${event}</div>
                </div>
            </div>
        `).join('');
        
        // Add recent news if available
        if (data.economic_calendar.recent_news && data.economic_calendar.recent_news.length > 0) {
            economicEvents.innerHTML += `<div style="margin-top: 15px; font-size: 12px; color: #8899aa; margin-bottom: 10px;">RECENT NEWS</div>`;
            data.economic_calendar.recent_news.forEach((news, index) => {
                if (news.title) {
                    economicEvents.innerHTML += `
                        <div style="padding: 10px; background: rgba(68, 136, 255, 0.05); border-radius: 8px; border: 1px solid rgba(68, 136, 255, 0.1); margin-bottom: 8px; animation: fadeIn 0.5s ease ${(index + 3) * 0.1}s both;">
                            <div style="font-size: 12px; color: #44aaff; line-height: 1.5;">${news.title}</div>
                        </div>
                    `;
                }
            });
        }
    }
}

// Attach event listener to analyze button
setTimeout(() => {
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', runAnalysis);
    }
}, 100);

// Simulate live updates
setInterval(() => {
    const pressureElements = document.querySelectorAll('[data-pressure]');
    pressureElements.forEach(el => {
        const current = parseInt(el.textContent);
        const change = Math.floor(Math.random() * 5) - 2;
        const newValue = Math.max(0, Math.min(100, current + change));
        el.textContent = newValue;
        
        // Update progress bar width
        const bar = el.parentElement?.querySelector('.progress-bar');
        if (bar) {
            bar.style.width = `${newValue}%`;
        }
    });
}, 5000);