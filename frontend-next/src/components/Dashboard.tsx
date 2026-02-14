'use client';

import React, { useState, useEffect } from 'react';
import { Chart } from './Chart';
// import { CandlestickData } from 'lightweight-charts'; // Not used directly in this file but keep import if needed elsewhere

// API Configuration
const API_BASE_URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : '';

const DEMO_DATA = {
    "asset": "AAPL",
    "persona_selected": "Coach",
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
    },
    "shariah_compliance": {
        "compliant": true,
        "score": 95,
        "reason": "Core business (Technology) is Halal. Debt ratios are within acceptable limits (<30%).",
        "issues": []
    }
};

export default function Dashboard() {
    const [asset, setAsset] = useState('AAPL');
    const [userId, setUserId] = useState('dashboard_user');
    const [isDemo, setIsDemo] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('READY FOR ANALYSIS');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [analysisData, setAnalysisData] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [councilOpinions, setCouncilOpinions] = useState<any[]>([]);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [showLanding, setShowLanding] = useState(true);

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
        if (storedTheme) {
            setTheme(storedTheme);
            if (storedTheme === 'dark') document.body.classList.add('dark-mode');
        }
        loadInitialMetrics();
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.body.classList.toggle('dark-mode');
    };

    const loadInitialMetrics = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            if (response.ok) {
                // Initial check logic if needed
            }
        } catch {
            console.log('Could not check API health');
        }
    };

    const runAnalysis = async () => {
        if (isAnalyzing) return;
        if (!asset) {
            alert('Please enter an asset symbol');
            return;
        }

        setIsAnalyzing(true);
        setStatusMessage('INITIALIZING AGENTS...');
        setCouncilOpinions([]); // Clear previous opinions
        setAnalysisData(null); // Clear previous data

        if (isDemo) {
            console.log("Running in DEMO MODE");
            setStatusMessage('DEMO: SIMULATING ANALYSIS...');

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
                setStatusMessage(step.toUpperCase());
                await new Promise(r => setTimeout(r, 800));
            }

            const demoData = JSON.parse(JSON.stringify(DEMO_DATA));
            demoData.asset = asset;
            setAnalysisData(demoData);

            // Populate opinions for display
             if (demoData.market_analysis && demoData.market_analysis.council_opinions) {
                const opinions = demoData.market_analysis.council_opinions.map((op: string, idx: number) => {
                     const agentNames = ['Macro Hawk', 'Micro Forensic', 'Flow Detective', 'Tech Interpreter', 'Skeptic'];
                     return {
                         agentName: agentNames[idx],
                         thesis: op.replace(/^[^\s]+\s/, ''),
                         confidence: 'HIGH' // Mock confidence
                     };
                });
                setCouncilOpinions(opinions);
            }

            setStatusMessage('ANALYSIS COMPLETE [OK]');
            setIsAnalyzing(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/analyze-asset-stream?asset=${encodeURIComponent(asset)}&user_id=${encodeURIComponent(userId)}`);

            if (!response.ok) {
                 throw new Error(`API Error: ${response.status}`);
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);
                        handleStreamEvent(event);
                    } catch (e) {
                        console.error("Error parsing JSON stream:", e);
                    }
                }
            }

            setStatusMessage('ANALYSIS COMPLETE [OK]');

        } catch (error) {
            console.error('Analysis failed:', error);
            setStatusMessage('ANALYSIS FAILED');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            alert(`Analysis failed: ${(error as any).message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleStreamEvent = (event: any) => {
        if (event.type === 'status') {
            setStatusMessage(event.message.toUpperCase());
        }
        else if (event.type === 'agent_result') {
            // Not explicitly handled in original but good to have
        }
        else if (event.type === 'council_debate' || (event.type === 'debate_stream' && event.data)) { // Adjust based on actual API
             // The stream logic in main.py yields chunks.
        }
        else if (event.type === 'complete' || event.type === 'final_result') {
            setAnalysisData(event.data);
            if(event.data.market_analysis && event.data.market_analysis.council_opinions) {
                 const opinions = event.data.market_analysis.council_opinions.map((op: string, idx: number) => {
                     const agentNames = ['Macro Hawk', 'Micro Forensic', 'Flow Detective', 'Tech Interpreter', 'Skeptic'];
                     return {
                         agentName: agentNames[idx] || 'Agent',
                         thesis: op.replace(/^[^\s]+\s/, ''),
                         confidence: 'HIGH'
                     };
                });
                setCouncilOpinions(opinions);
            }
        }
        else if (event.type === 'error') {
            setStatusMessage(`ERROR: ${event.message}`);
        }
    };

    // Helper to download summary
    const downloadSummary = () => {
        if (!analysisData) return;
        const data = analysisData;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const symbol = data.asset || 'ANALYSIS';

        let summaryContent = `# 5 LLM COUNCIL IN-DEPTH ANALYSIS SUMMARY\n`;
        summaryContent += `Generated: ${new Date().toLocaleString()}\n`;
        summaryContent += `Symbol: ${symbol}\n`;
        summaryContent += `Persona: ${data.persona_selected ? data.persona_selected.toUpperCase() : 'N/A'}\n`;
        summaryContent += `\n${'='.repeat(80)}\n\n`;
        summaryContent += JSON.stringify(data, null, 2);

        const blob = new Blob([summaryContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TensorTrade_Summary_${symbol}_${timestamp}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const playNarrative = () => {
        if (!analysisData?.narrative) return;
        const text = analysisData.narrative.styled_message || analysisData.narrative.summary;
        if (!text) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    const shareToX = () => {
        const text = analysisData?.persona_post?.x || analysisData?.narrative?.styled_message;
        if(!text) return;
         window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
    };

    if (showLanding) {
        return (
            <div id="landing-page" className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] p-8">
                <div className="border-[6px] border-[var(--text-primary)] p-12 text-center bg-white dark:bg-black shadow-[12px_12px_0px_#000]">
                    <h1 className="text-6xl font-black mb-4 tracking-tighter uppercase font-mono">TensorTrade</h1>
                    <div className="text-xl font-bold mb-8 uppercase tracking-widest bg-[var(--text-primary)] text-[var(--bg-primary)] p-2">
                        Multi-Agent Intelligence Network
                    </div>

                    <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto my-8">
                        {["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "BRK.B", "LLY", "AVGO", "V", "JPM"].map(sym => {
                            const change = (Math.random() * 6 - 3).toFixed(2);
                            const isUp = parseFloat(change) >= 0;
                            return (
                                <div key={sym}
                                     className={`border-2 border-black p-4 cursor-pointer hover:bg-[var(--accent-neon)] hover:translate-y-[-4px] hover:shadow-[4px_4px_0px_black] transition-all bg-[var(--bg-secondary)] flex flex-col items-center justify-center aspect-square`}
                                     onClick={() => {
                                        setAsset(sym);
                                        setShowLanding(false);
                                    }}>
                                    <div className="font-black text-xl">{sym}</div>
                                    <div className={`text-sm font-bold ${isUp ? 'text-green-600' : 'text-red-600'}`}>{isUp ? '+' : ''}{change}%</div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        className="brutal-btn text-2xl px-12 py-4 mt-8 bg-[var(--accent-pink)] text-white hover:text-black border-4 border-black"
                        onClick={() => setShowLanding(false)}>
                        ENTER SYSTEM_
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div id="dashboard-container" className="min-h-screen p-4 md:p-8 font-mono bg-[var(--bg-primary)]">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center border-b-4 border-black pb-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="text-4xl font-black bg-black text-white p-2 border-2 border-white transform -rotate-2 shadow-[4px_4px_0px_black]">
                        [TENSOR]
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter m-0">
                            TENSORTRADE <span className="text-sm bg-[var(--accent-neon)] px-2 py-1 text-black font-bold ml-2">V3.0.0</span>
                        </h1>
                        <p className="text-xs uppercase tracking-widest font-bold">Intelligent Trading Analyst</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <div className="flex items-center gap-2 border-2 border-black px-4 py-2 bg-[var(--bg-secondary)] font-bold text-xs uppercase">
                        <span className={`w-3 h-3 ${isAnalyzing ? 'bg-[var(--accent-alert)] animate-pulse' : 'bg-[var(--accent-neon)]'} border border-black`}></span>
                        {statusMessage}
                    </div>
                    <button className="brutal-btn py-2 px-4 text-xs bg-white" onClick={toggleTheme}>
                        {theme === 'dark' ? 'LIGHT_MODE' : 'DARK_MODE'}
                    </button>
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Left Column: Controls */}
                <div className="col-span-1 md:col-span-3 flex flex-col gap-6">
                    {/* Assistant Card */}
                    <div className="brutal-card bg-[var(--bg-secondary)] relative">
                        <div className="absolute -top-3 -right-3 bg-black text-white px-2 py-1 text-xs font-bold transform rotate-3">
                            AI_CORE
                        </div>
                        <h3 className="brutal-header text-lg mb-4 p-2 bg-black text-white inline-block w-full text-center">
                            {'// SYSTEM_INPUT'}
                        </h3>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-2">
                                <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-black text-xl border-2 border-white">
                                    AI
                                </div>
                                <div className="text-xs font-bold leading-tight">
                                    STATUS: {statusMessage}<br/>
                                    ID: {userId}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold uppercase bg-[var(--accent-neon)] inline-block w-fit px-1 border border-black">Asset Symbol</label>
                                <input
                                    type="text"
                                    className="brutal-input text-xl font-bold uppercase tracking-widest text-center"
                                    placeholder="AAPL"
                                    value={asset}
                                    onChange={(e) => setAsset(e.target.value.toUpperCase())}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold uppercase bg-[var(--bg-primary)] inline-block w-fit px-1 border border-black">User ID</label>
                                <input
                                    type="text"
                                    className="brutal-input text-sm"
                                    placeholder="trader_123"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer border-2 border-black p-2 hover:bg-[var(--accent-neon)] transition-colors">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 border-2 border-black rounded-none appearance-none checked:bg-black"
                                    checked={isDemo}
                                    onChange={(e) => setIsDemo(e.target.checked)}
                                />
                                <span className="text-xs font-bold uppercase">Enable Demo Mode (Mock Data)</span>
                            </label>

                            <button
                                className="brutal-btn w-full bg-black text-white hover:bg-[var(--accent-pink)] hover:text-black border-white"
                                onClick={runAnalysis}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? 'PROCESSING...' : 'INITIATE_ANALYSIS()'}
                            </button>
                        </div>
                    </div>

                    {/* Metrics Card */}
                    <div className="brutal-card">
                        <h3 className="brutal-header text-sm p-1 bg-[var(--bg-secondary)] border border-black text-black w-full text-center mb-4">
                            METRICS_OVERVIEW
                        </h3>
                        <div className="flex flex-col gap-4">
                            <div className="border-2 border-black p-2 bg-[var(--bg-secondary)]">
                                <div className="text-[10px] font-bold uppercase mb-1">Market Regime</div>
                                <div className={`text-xl font-black uppercase ${analysisData?.market_metrics?.risk_index > 50 ? 'text-[var(--accent-alert)]' : 'text-black'}`}>
                                    {analysisData?.market_metrics?.market_regime || 'WAITING...'}
                                </div>
                            </div>

                            <div className="border-2 border-black p-2">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-[10px] font-bold uppercase">Risk Index</span>
                                    <span className="text-2xl font-black">{analysisData?.market_metrics?.risk_index || '00'}</span>
                                </div>
                                <div className="h-4 w-full border-2 border-black bg-white relative">
                                    <div
                                        className="h-full bg-[var(--accent-alert)] transition-all duration-500"
                                        style={{ width: `${analysisData?.market_metrics?.risk_index || 0}%` }}
                                    ></div>
                                </div>
                            </div>

                             <div className="grid grid-cols-2 gap-2">
                                <div className="border-2 border-black p-2 text-center bg-[var(--bg-secondary)]">
                                    <div className="text-2xl font-black">{analysisData?.market_metrics?.vix || '--'}</div>
                                    <div className="text-[10px] font-bold uppercase">VIX Score</div>
                                </div>
                                <div className="border-2 border-black p-2 text-center bg-[var(--bg-secondary)]">
                                    <div className="text-2xl font-black">{analysisData?.shariah_compliance?.score || '--'}</div>
                                    <div className="text-[10px] font-bold uppercase">Shariah</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center Column: Data Feed */}
                <div className="col-span-1 md:col-span-6 flex flex-col gap-6">
                    {/* Live Feed */}
                    <div className="brutal-card min-h-[400px]">
                        <div className="flex justify-between items-center border-b-4 border-black pb-2 mb-4">
                            <h3 className="text-xl font-black uppercase bg-[var(--accent-neon)] px-2 border-2 border-black shadow-[4px_4px_0px_black]">
                                AGENT_COUNCIL_FEED
                            </h3>
                            {analysisData && (
                                <button className="text-xs font-bold underline hover:bg-black hover:text-white px-2" onClick={downloadSummary}>
                                    [DOWNLOAD_LOGS]
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2">
                            {councilOpinions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-400 opacity-50">
                                    <div className="text-4xl font-black animate-pulse">[NO_DATA]</div>
                                    <div className="text-sm font-bold mt-2">AWAITING INPUT STREAM...</div>
                                </div>
                            ) : (
                                councilOpinions.map((op, idx) => {
                                    return (
                                        <div key={idx} className="border-2 border-black p-0 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] hover:translate-x-1 hover:shadow-none transition-all">
                                            <div className="flex justify-between items-center bg-black text-white p-2 border-b-2 border-black">
                                                <span className="font-bold text-xs uppercase tracking-widest">{op.agentName}</span>
                                                <span className="text-[10px] border border-white px-1">CONFIDENCE: {op.confidence || 'HIGH'}</span>
                                            </div>
                                            <div className="p-4 bg-white text-sm font-mono leading-relaxed">
                                                {op.thesis}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Chart Container */}
                     <div className="brutal-card p-0 overflow-hidden">
                        <div className="bg-black text-white p-2 text-xs font-bold flex justify-between items-center">
                            <span>ASSET_VISUALIZER_V1</span>
                            <span>{asset}</span>
                        </div>
                        <div className="border-b-2 border-black p-4 bg-[var(--bg-secondary)]">
                            <Chart />
                        </div>
                         {analysisData?.market_analysis?.market_context && (
                             <div className="p-2 text-xs font-mono bg-[var(--accent-neon)] text-black border-t-2 border-black flex justify-between">
                                <span>PRICE: ${analysisData.market_analysis.market_context.price}</span>
                                <span>VOL: {analysisData.market_analysis.market_context.volume}</span>
                                <span>DIR: {analysisData.market_analysis.market_context.move_direction}</span>
                            </div>
                         )}
                    </div>
                </div>

                {/* Right Column: Strategy & Insights */}
                <div className="col-span-1 md:col-span-3 flex flex-col gap-6">
                    {/* Narrative Card */}
                    <div className="brutal-card bg-[var(--accent-pink)] text-white border-black border-4 shadow-[8px_8px_0px_black]">
                        <h3 className="font-black text-2xl mb-2 bg-white text-black px-2 inline-block border-2 border-black transform -rotate-1">
                            STRATEGY_CORE
                        </h3>
                        <div className="bg-white text-black p-4 border-2 border-black text-sm font-bold leading-relaxed mb-4 min-h-[120px]">
                             {analysisData?.narrative?.styled_message || analysisData?.narrative?.summary || 'Initializing strategy module...'}
                        </div>
                        <div className="flex gap-2">
                             <button onClick={playNarrative} className="flex-1 bg-black text-white border-2 border-white hover:bg-white hover:text-black py-1 text-xs font-bold uppercase">
                                [AUDIO_PLAY]
                             </button>
                             <button onClick={shareToX} className="flex-1 bg-black text-white border-2 border-white hover:bg-white hover:text-black py-1 text-xs font-bold uppercase">
                                [X_POST]
                             </button>
                        </div>
                    </div>

                    {/* Behavioral Flags */}
                    <div className="brutal-card">
                        <h3 className="brutal-header text-center bg-transparent text-black border-b-4 border-black pb-2 mb-4">
                            PSYCH_FLAGS
                        </h3>
                        {analysisData?.behavioral_analysis?.flags?.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {analysisData.behavioral_analysis.flags.map((flag: any, idx: number) => (
                                    <div key={idx} className="bg-[var(--accent-alert)] text-white p-2 border-2 border-black shadow-[2px_2px_0px_black]">
                                        <div className="font-black text-xs uppercase border-b border-white pb-1 mb-1">⚠️ {flag.pattern || 'DETECTED'}</div>
                                        <div className="text-xs font-bold">{flag.message}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 border-2 border-black bg-[var(--accent-neon)] text-center text-xs font-black uppercase">
                                NO_FLAGS_DETECTED<br/>[SYSTEM_OPTIMAL]
                            </div>
                        )}
                    </div>

                     {/* Consensus */}
                    <div className="brutal-card bg-black text-white">
                        <h3 className="text-xs font-bold uppercase border-b border-white pb-2 mb-2 text-[var(--accent-neon)]">
                            &gt; CONSENSUS_POINTS
                        </h3>
                        <ul className="text-xs font-mono list-none p-0 m-0">
                             {analysisData?.market_analysis?.consensus ? analysisData.market_analysis.consensus.map((point: string, idx: number) => (
                                <li key={idx} className="mb-2 pl-4 relative before:content-['>'] before:absolute before:left-0 before:text-[var(--accent-pink)]">
                                    {point}
                                </li>
                            )) : <li className="text-gray-500">Waiting for consensus...</li>}
                        </ul>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <footer className="mt-12 border-t-4 border-black pt-4 flex flex-col md:flex-row justify-between items-center text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
                <div>
                    TENSORTRADE_SYSTEM // V3.0.0 // {new Date().getFullYear()}
                </div>
                <div className="mt-2 md:mt-0 text-right">
                    SECURE_CONNECTION: ENCRYPTED // NODE: US-EAST-1
                </div>
            </footer>
        </div>
    );
}
