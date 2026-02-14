import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Switch, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Chart from './Chart';

// API Configuration
const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

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
    "risk_analysis": {
        "metrics": { "var_95": 2.4, "max_drawdown": 15.2 },
        "qualitative": { "verdict": "HIGH", "reasoning": "Elevated VIX and gamma exposure." }
    },
    "sentiment_analysis": {
        "score": 0.6,
        "label": "BULLISH",
        "summary": "News sentiment is positive on earnings beat."
    }
};

export default function DashboardScreen() {
    const [asset, setAsset] = useState('AAPL');
    const [userId, setUserId] = useState('mobile_user');
    const [isDemo, setIsDemo] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('READY');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [analysisData, setAnalysisData] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [councilOpinions, setCouncilOpinions] = useState<any[]>([]);

    const runAnalysis = async () => {
        if (isAnalyzing) return;
        if (!asset) {
            Alert.alert('Error', 'Please enter an asset symbol');
            return;
        }

        setIsAnalyzing(true);
        setStatusMessage('INITIALIZING...');
        setCouncilOpinions([]);
        setAnalysisData(null);

        if (isDemo) {
            setStatusMessage('DEMO: SIMULATING...');
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

            if (demoData.market_analysis && demoData.market_analysis.council_opinions) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const opinions = demoData.market_analysis.council_opinions.map((op: string, idx: number) => {
                     const agentNames = ['Macro Hawk', 'Micro Forensic', 'Flow Detective', 'Tech Interpreter', 'Skeptic'];
                     return {
                         agentName: agentNames[idx],
                         thesis: op.replace(/^[^\s]+\s/, ''),
                         confidence: 'HIGH'
                     };
                });
                setCouncilOpinions(opinions);
            }

            setStatusMessage('COMPLETE');
            setIsAnalyzing(false);
            return;
        }

        try {
            setStatusMessage('REQUESTING ANALYSIS...');
            const response = await fetch(`${API_BASE_URL}/analyze-asset?asset=${encodeURIComponent(asset)}&user_id=${encodeURIComponent(userId)}`, {
                method: 'POST'
            });

            if (!response.ok) {
                 throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            setAnalysisData(data);
             if (data.market_analysis && data.market_analysis.council_opinions) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const opinions = data.market_analysis.council_opinions.map((op: string, idx: number) => {
                     const agentNames = ['Macro Hawk', 'Micro Forensic', 'Flow Detective', 'Tech Interpreter', 'Skeptic'];
                     return {
                         agentName: agentNames[idx] || 'Agent',
                         thesis: op.replace(/^[^\s]+\s/, ''),
                         confidence: 'HIGH'
                     };
                });
                setCouncilOpinions(opinions);
            }
            setStatusMessage('COMPLETE');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Analysis failed:', error);
            setStatusMessage('FAILED');
            Alert.alert('Analysis Failed', error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoBox}>
                    <Text style={styles.logoText}>[TENSOR]</Text>
                </View>
                <View style={{flex: 1, marginLeft: 15}}>
                    <Text style={styles.headerTitle}>TENSORTRADE</Text>
                    <Text style={styles.headerSubtitle}>INTELLIGENT TRADING ANALYST</Text>
                </View>
            </View>

            <View style={styles.statusContainer}>
                <View style={[styles.statusDot, { backgroundColor: isAnalyzing ? '#ff0000' : '#00ff41' }]} />
                <Text style={styles.statusText}>STATUS: {statusMessage}</Text>
            </View>

            {/* Input Section */}
            <View style={styles.brutalCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{'// SYSTEM_INPUT'}</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ASSET_SYMBOL</Text>
                    <TextInput
                        style={styles.brutalInput}
                        value={asset}
                        onChangeText={t => setAsset(t.toUpperCase())}
                        placeholder="AAPL"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.row}>
                     <Text style={styles.label}>DEMO_MODE</Text>
                    <Switch
                        value={isDemo}
                        onValueChange={setIsDemo}
                        trackColor={{ false: "#ccc", true: "#00ff41" }}
                        thumbColor={isDemo ? "#000" : "#fff"}
                    />
                </View>

                <TouchableOpacity style={styles.brutalButton} onPress={runAnalysis} disabled={isAnalyzing}>
                    <Text style={styles.buttonText}>{isAnalyzing ? 'PROCESSING...' : 'INITIATE_ANALYSIS()'}</Text>
                </TouchableOpacity>
            </View>

            {/* Analysis Data */}
            {analysisData && (
                <>
                    <View style={styles.brutalCard}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>METRICS_OVERVIEW</Text>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.metricBox}>
                                <Text style={styles.metricLabel}>REGIME</Text>
                                <Text style={[styles.metricValue, { color: analysisData.market_metrics.risk_index > 50 ? 'red' : 'black' }]}>
                                    {analysisData.market_metrics.market_regime}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.metricBarContainer}>
                            <Text style={styles.metricLabel}>RISK INDEX: {analysisData.market_metrics.risk_index}/100</Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${analysisData.market_metrics.risk_index}%` }]} />
                            </View>
                        </View>
                    </View>

                    <View style={[styles.brutalCard, {padding: 0}]}>
                        <View style={[styles.cardHeader, {margin: 10}]}>
                            <Text style={styles.cardTitle}>ASSET_VISUALIZER</Text>
                        </View>
                        <View style={{height: 250, backgroundColor: '#eee', borderBottomWidth: 3, borderColor: '#000'}}>
                             <Chart />
                        </View>
                         {analysisData.market_analysis && analysisData.market_analysis.market_context && (
                             <View style={styles.contextBar}>
                                <Text style={styles.contextText}>
                                    {analysisData.market_analysis.market_context.move_direction} {analysisData.market_analysis.market_context.change_pct}% | Vol: {analysisData.market_analysis.market_context.volume}
                                </Text>
                             </View>
                         )}
                    </View>

                    <View style={styles.brutalCard}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>COUNCIL_FEED</Text>
                        </View>
                        {councilOpinions.map((op, idx) => (
                            <View key={idx} style={styles.opinionItem}>
                                <View style={styles.opinionHeader}>
                                    <Text style={styles.agentName}>{op.agentName}</Text>
                                    <Text style={styles.confidence}>CONF: {op.confidence || 'HIGH'}</Text>
                                </View>
                                <Text style={styles.thesis}>{op.thesis}</Text>
                            </View>
                        ))}
                    </View>

                     <View style={[styles.brutalCard, { backgroundColor: '#ff00ff', borderColor: '#000' }]}>
                        <View style={[styles.cardHeader, { backgroundColor: '#fff', alignSelf: 'flex-start', transform: [{rotate: '-2deg'}] }]}>
                            <Text style={styles.cardTitle}>STRATEGY_CORE</Text>
                        </View>
                        <View style={styles.narrativeBox}>
                            <Text style={styles.narrativeText}>
                                {analysisData.narrative?.styled_message || analysisData.narrative?.summary}
                            </Text>
                        </View>
                    </View>
                </>
            )}

            <View style={styles.footer}>
                <Text style={styles.footerText}>TENSORTRADE // V3.0.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 3,
        borderColor: '#000',
        marginTop: Platform.OS === 'ios' ? 40 : 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoBox: {
        backgroundColor: '#000',
        padding: 10,
        transform: [{rotate: '-3deg'}],
        borderWidth: 2,
        borderColor: '#00ff41',
    },
    logoText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 18,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#000',
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#000',
        letterSpacing: 2,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#eee',
        borderBottomWidth: 3,
        borderColor: '#000',
    },
    statusDot: {
        width: 15,
        height: 15,
        borderWidth: 2,
        borderColor: '#000',
        marginRight: 10,
    },
    statusText: {
        fontSize: 12,
        color: '#000',
        fontWeight: '900',
    },
    brutalCard: {
        backgroundColor: '#fff',
        margin: 15,
        marginBottom: 5,
        padding: 15,
        borderWidth: 3,
        borderColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
    },
    cardHeader: {
        backgroundColor: '#000',
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginBottom: 15,
        alignSelf: 'flex-start',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#fff',
        textTransform: 'uppercase',
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 5,
        color: '#000',
        backgroundColor: '#00ff41',
        alignSelf: 'flex-start',
        paddingHorizontal: 5,
        borderWidth: 1,
        borderColor: '#000',
    },
    brutalInput: {
        borderWidth: 3,
        borderColor: '#000',
        padding: 15,
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        backgroundColor: '#f0f0f0',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    brutalButton: {
        backgroundColor: '#000',
        padding: 15,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#000',
        shadowColor: '#00ff41', // Using neon green shadow for button
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        textTransform: 'uppercase',
    },
    metricBox: {
        flex: 1,
        borderWidth: 2,
        borderColor: '#000',
        padding: 10,
        backgroundColor: '#fff',
    },
    metricLabel: {
        fontSize: 10,
        color: '#000',
        fontWeight: '900',
        marginBottom: 5,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '900',
    },
    metricBarContainer: {
        marginTop: 10,
    },
    progressBar: {
        height: 20,
        borderWidth: 2,
        borderColor: '#000',
        marginTop: 5,
        backgroundColor: '#fff',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#ff0000',
    },
    contextBar: {
        backgroundColor: '#00ff41',
        padding: 10,
        borderTopWidth: 3,
        borderColor: '#000',
    },
    contextText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
    },
    opinionItem: {
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    opinionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#000',
        padding: 5,
    },
    agentName: {
        fontSize: 12,
        fontWeight: '900',
        color: '#fff',
    },
    confidence: {
        fontSize: 10,
        fontWeight: '700',
        color: '#00ff41',
    },
    thesis: {
        fontSize: 14,
        color: '#000',
        padding: 10,
        backgroundColor: '#fff',
        lineHeight: 20,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    narrativeBox: {
        backgroundColor: '#fff',
        borderWidth: 3,
        borderColor: '#000',
        padding: 15,
        marginTop: 10,
    },
    narrativeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
        lineHeight: 22,
    },
    footer: {
        padding: 20,
        alignItems: 'center',
        opacity: 0.5,
    },
    footerText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#000',
    }
});
