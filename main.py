from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, AsyncGenerator
import asyncio
import logging
import json
from datetime import datetime, timedelta

# Import agents
from agents.behaviour_agent import BehaviorMonitorAgent
from agents.narrator import NarratorAgent
from agents.persona import PersonaAgent
from agents.moderator import ModeratorAgent
from agents.risk_manager import RiskManagerAgent
from agents.sentiment_agent import SentimentAnalysisAgent
from agents.compliance_agent import ComplianceAgent

# Import LLM Council
from llm_council.services.debate_engine import get_council_analysis, get_council_analysis_stream

# Import services
from services.economic_calendar import EconomicCalendarService
from services.trade_history import get_trade_history_service
from services.market_metrics import get_market_metrics_service
from services.asset_validator import validate_asset_symbol, AssetValidationError
from services.self_improvement import SelfImprovementService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Multi-Agent Trading Psychology API")

# Simple in-memory cache
ANALYSIS_CACHE = {}
CACHE_TTL = timedelta(minutes=10)

# Initialize Self-Improvement Service
self_improvement_service = SelfImprovementService()

def get_cached_analysis(symbol: str) -> Optional[dict]:
    if symbol in ANALYSIS_CACHE:
        entry = ANALYSIS_CACHE[symbol]
        if datetime.utcnow() - entry['timestamp'] < CACHE_TTL:
            return entry['data']
        else:
            del ANALYSIS_CACHE[symbol]
    return None

def set_cached_analysis(symbol: str, data: dict):
    ANALYSIS_CACHE[symbol] = {
        'timestamp': datetime.utcnow(),
        'data': data
    }

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MarketWatcherAgent:
    """
    Market analysis using 5-agent LLM debate council.
    Provides diverse perspectives from macro, fundamental, flow, technical, and skeptic agents.
    """
    
    async def run_async(self, context: dict) -> dict:
        """Async version for LLM council integration."""
        try:
            # Extract asset symbol from market_event or context
            asset = context.get("asset", "AAPL")  # Default to AAPL if not specified
            
            # Validate asset symbol
            from services.asset_validator import validate_asset_symbol
            is_valid, error_msg = validate_asset_symbol(asset)
            if not is_valid:
                logger.error(f"Invalid asset symbol: {error_msg}")
                context["market_opinions"] = [f"Invalid asset symbol '{asset}': {error_msg}"]
                context["asset"] = asset
                context["price_change_pct"] = "0.0"
                return context
            
            asset = asset.strip().upper()
            context["asset"] = asset
            
            # Get economic calendar data
            try:
                economic_service = EconomicCalendarService()
                economic_data = economic_service.get_stock_events(asset)
                economic_summary = economic_service.get_market_summary(asset)
                
                # Add to context for downstream agents
                context["economic_calendar"] = economic_data
                context["economic_summary"] = economic_summary
                
                logger.info(f"Economic calendar: {economic_summary[:100]}...")
            except Exception as e:
                logger.warning(f"Could not fetch economic data: {e}")
                economic_summary = ""
            
            # Extract symbol if it's a derivative asset like "Boom 500"
            # For now, we'll use a mapping for synthetic indices
            symbol_mapping = {
                "Boom 500": "SPY",  # S&P 500 ETF as proxy
                "Boom 1000": "SPY",
                "Crash 500": "VIXY",  # Volatility ETF
                "Volatility 75": "VXX",
                "Step Index": "DIA",  # Dow Jones ETF
            }
            
            symbol = symbol_mapping.get(asset, asset)
            
            logger.info(f"Running LLM council analysis for {symbol}...")
            
            # Get 5-agent council debate with economic context
            debate_result = await get_council_analysis(symbol, economic_context=economic_summary)
            
            # Format market opinions from all 5 agents
            market_opinions = []
            for arg in debate_result["agent_arguments"]:
                opinion = f"{arg.agent_name} ({arg.confidence.value}): {arg.thesis}"
                market_opinions.append(opinion)
            
            # Add council results to context
            context["market_opinions"] = market_opinions
            context["council_debate"] = debate_result
            context["consensus_points"] = [cp.statement for cp in debate_result["consensus_points"]]
            context["disagreement_topics"] = [dp.topic for dp in debate_result["disagreement_points"]]
            context["judge_summary"] = debate_result["judge_summary"]
            
            # Extract market context
            mc = debate_result["market_context"]
            context["asset"] = symbol
            context["price_change_pct"] = f"{abs(mc['move_pct']):.2f}"
            context["move_direction"] = mc["move_direction"]
            context["current_price"] = mc["price"]
            context["volume"] = mc["volume"]
            
            logger.info(f"Council analysis complete: {len(market_opinions)} agents analyzed {symbol}")
            
        except Exception as e:
            logger.error(f"MarketWatcherAgent error: {e}")
            # Fallback to basic context
            context["market_opinions"] = [f"Error getting council analysis: {str(e)}"]
            context["asset"] = context.get("asset", "UNKNOWN")
            context["price_change_pct"] = "0.0"
        
        return context
    
    def run(self, context: dict) -> dict:
        """Sync wrapper for the async method."""
        return asyncio.run(self.run_async(context))


class Trade(BaseModel):
    timestamp: str
    symbol: str  
    action: str
    price: float
    pnl: float
    status: str


class RunAgentsRequest(BaseModel):
    market_event: str
    user_trades: List[Trade]
    persona_style: str = "professional"


@app.get("/analyze-asset-stream")
async def analyze_asset_stream(asset: str, user_id: Optional[str] = "default_user"):
    """
    Streaming endpoint for real-time analysis updates.
    Yields NDJSON (newline delimited JSON) events.
    """

    async def event_generator() -> AsyncGenerator[str, None]:
        nonlocal asset
        # Check cache first
        cached = get_cached_analysis(asset.upper())
        if cached:
            yield json.dumps({"type": "status", "message": "Using cached analysis (fast path)..."}) + "\n"
            await asyncio.sleep(0.5) # Simulate slight delay for UX
            yield json.dumps({"type": "complete", "data": cached}) + "\n"
            return

        yield json.dumps({"type": "status", "message": f"Validating symbol {asset}..."}) + "\n"

        # Validate asset
        is_valid, error_msg = validate_asset_symbol(asset)
        if not is_valid:
            yield json.dumps({"type": "error", "message": error_msg}) + "\n"
            return

        asset = asset.strip().upper()
        context = {"asset": asset, "user_id": user_id}

        try:
            # 1. Fetch Trade History
            yield json.dumps({"type": "status", "message": "Fetching trade history..."}) + "\n"
            trade_service = get_trade_history_service()
            trade_summary = trade_service.get_trading_summary(asset, user_id)
            user_trades = trade_summary["trades"]

            # Auto-select persona
            persona_style = trade_service.auto_select_persona(user_trades)
            context.update({
                "user_trades": user_trades,
                "trade_summary": trade_summary,
                "persona_style": persona_style
            })

            yield json.dumps({
                "type": "trade_history",
                "data": trade_summary,
                "persona": persona_style
            }) + "\n"

            # 2. Economic Calendar
            yield json.dumps({"type": "status", "message": "Scanning economic calendar..."}) + "\n"
            economic_service = EconomicCalendarService()
            economic_data = economic_service.get_stock_events(asset)
            economic_summary = economic_service.get_market_summary(asset)

            context.update({
                "economic_calendar": economic_data,
                "economic_summary": economic_summary
            })

            yield json.dumps({
                "type": "economic_data",
                "data": economic_data
            }) + "\n"

            # 3. Behavior Analysis
            yield json.dumps({"type": "status", "message": "Analyzing behavioral patterns..."}) + "\n"
            behavior_agent = BehaviorMonitorAgent()
            # Note: BehaviorMonitorAgent usually runs sync, but we can wrap it or just call it
            # The original code called it via run/run_async method of the agent instance
            # We'll re-use the agent interface if possible, or just call behavior agent methods
            # Let's assume standard agent interface:
            context = behavior_agent.run(context)

            yield json.dumps({
                "type": "behavior_analysis",
                "data": {
                    "flags": context.get("behavior_flags", []),
                    "insights": context.get("insights", [])
                }
            }) + "\n"

            # 4. LLM Council Debate (Streaming)
            yield json.dumps({"type": "status", "message": "Convening 5-agent LLM Council..."}) + "\n"

            council_debate_result = None
            market_opinions = []

            # Stream the debate
            async for chunk in get_council_analysis_stream(asset, economic_summary):
                if chunk["type"] == "debate_complete":
                    council_debate_result = chunk["data"]
                    # Extract opinions for next agents
                    for arg in council_debate_result["agent_arguments"]:
                        # Handle both dict and object
                        if isinstance(arg, dict):
                            opinion = f"{arg['agent_name']} ({arg['confidence']}): {arg['thesis']}"
                        else:
                            opinion = f"{arg.agent_name} ({arg.confidence.value}): {arg.thesis}"
                        market_opinions.append(opinion)

                # Forward the chunk to the client
                yield json.dumps(chunk) + "\n"

            if not council_debate_result:
                yield json.dumps({"type": "error", "message": "Council debate failed to return results"}) + "\n"
                return

            context["market_opinions"] = market_opinions
            context["council_debate"] = council_debate_result
            context["consensus_points"] = [cp['statement'] if isinstance(cp, dict) else cp.statement for cp in council_debate_result["consensus_points"]]
            context["disagreement_topics"] = [dp['topic'] if isinstance(dp, dict) else dp.topic for dp in council_debate_result["disagreement_points"]]
            context["judge_summary"] = council_debate_result["judge_summary"]

            mc = council_debate_result["market_context"]
            context["price_change_pct"] = f"{abs(mc['move_pct']):.2f}"
            context["move_direction"] = mc["move_direction"]
            context["current_price"] = mc["price"]
            context["volume"] = mc["volume"]

            # 5. Risk, Sentiment, Narrator, Persona, Moderator, Compliance
            yield json.dumps({"type": "status", "message": "Running advanced agents (Risk, Sentiment)..."}) + "\n"

            agent_flow = [
                ("SentimentAnalysisAgent", SentimentAnalysisAgent, True),
                ("RiskManagerAgent", RiskManagerAgent, True),
                ("NarratorAgent", NarratorAgent, False),
                ("PersonaAgent", PersonaAgent, False),
                ("ModeratorAgent", ModeratorAgent, False),
                ("ComplianceAgent", ComplianceAgent, True)
            ]

            for agent_name, agent_cls, is_async in agent_flow:
                try:
                    agent = agent_cls()
                    if is_async:
                        context = await agent.run_async(context)
                    else:
                        context = agent.run(context)
                except Exception as e:
                    logger.error(f"{agent_name} failed: {e}")

            # Record run for self-improvement
            try:
                # Extract agent outputs from debate result
                agent_outputs = {}
                if "council_debate" in context and "agent_arguments" in context["council_debate"]:
                    for arg in context["council_debate"]["agent_arguments"]:
                        # arg might be dict or object
                        name = arg.get("agent_name") if isinstance(arg, dict) else arg.agent_name
                        thesis = arg.get("thesis") if isinstance(arg, dict) else arg.thesis
                        agent_outputs[name] = thesis

                moderation = context.get("moderation", {})
                # Use X platform verdict as primary for now
                verdict = moderation.get("x", {})

                self_improvement_service.record_run(
                    asset=asset,
                    agent_outputs=agent_outputs,
                    moderator_verdict=verdict
                )
                yield json.dumps({"type": "status", "message": "Self-improvement cycle complete..."}) + "\n"
            except Exception as e:
                logger.error(f"Failed to record run: {e}")

            # 6. Calculate Metrics
            metrics_service = get_market_metrics_service()
            market_metrics = metrics_service.get_all_metrics(
                symbol=asset,
                agent_data={
                    "consensus_points": context.get("consensus_points", []),
                    "disagreement_topics": context.get("disagreement_topics", []),
                    "council_opinions": context.get("market_opinions", [])
                }
            )

            # 7. Final Response Construction
            final_response = {
                "asset": asset,
                "user_id": user_id,
                "analysis_type": "automated",
                "persona_selected": persona_style,
                "market_metrics": {
                    "vix": market_metrics["vix"],
                    "market_regime": market_metrics["market_regime"],
                    "risk_index": market_metrics["risk_index"],
                    "asset_volatility": market_metrics["asset_volatility"],
                    "risk_level": metrics_service.get_risk_level_description(market_metrics["risk_index"]),
                    "regime_color": metrics_service.get_regime_color(market_metrics["market_regime"])
                },
                "trade_history": {
                    "total_trades": trade_summary["total_trades"],
                    "total_pnl": trade_summary["total_pnl"],
                    "win_rate": trade_summary["win_rate"],
                    "last_trade": trade_summary.get("last_trade")
                },
                "economic_calendar": {
                    "earnings": economic_data.get("earnings_calendar", {}),
                    "recent_news": economic_data.get("recent_news", [])[:3],
                    "economic_events": economic_data.get("economic_events", []),
                    "summary": economic_summary
                },
                "behavioral_analysis": {
                    "flags": context.get("behavior_flags", []),
                    "insights": context.get("insights", [])
                },
                "market_analysis": {
                    "council_opinions": context.get("market_opinions", []),
                    "consensus": context.get("consensus_points", []),
                    "disagreements": context.get("disagreement_topics", []),
                    "judge_summary": context.get("judge_summary", ""),
                    "market_context": context["council_debate"]["market_context"]
                },
                "narrative": {
                    "summary": context.get("summary", ""),
                    "styled_message": context.get("final_message", ""),
                    "moderated_output": context.get("moderated_output", "")
                },
                "persona_post": context.get("persona_post", {"x": "", "linkedin": ""}),
                "risk_analysis": context.get("risk_analysis", {}),
                "sentiment_analysis": context.get("sentiment_analysis", {}),
                "compliance_analysis": context.get("compliance_analysis", {}),
                "timestamp": datetime.utcnow().isoformat()
            }

            # Cache the result
            set_cached_analysis(asset, final_response)

            yield json.dumps({"type": "complete", "data": final_response}) + "\n"

        except Exception as e:
            logger.error(f"Stream error: {e}", exc_info=True)
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


@app.post("/analyze-asset")
async def analyze_asset(asset: str, user_id: Optional[str] = "default_user"):
    """
    Simplified endpoint - only requires asset symbol.
    Automatically fetches trade history, economic calendar, and runs all agents.
    
    Args:
        asset: Stock symbol (e.g., "SPY", "AAPL", "TSLA")
        user_id: Optional user identifier for database lookup
        
    Returns:
        Complete multi-agent analysis with economic calendar impacts
    """
    # Validate asset symbol first
    is_valid, error_msg = validate_asset_symbol(asset)
    if not is_valid:
        logger.warning(f"Invalid asset symbol rejected: {asset} - {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Normalize symbol to uppercase
    asset = asset.strip().upper()
    logger.info(f"Starting automated analysis for {asset} (user: {user_id})")
    
    try:
        # 1. Fetch trade history from database (currently synthetic)
        trade_service = get_trade_history_service()
        trade_summary = trade_service.get_trading_summary(asset, user_id)
        user_trades = trade_summary["trades"]
        
        logger.info(f"Found {len(user_trades)} trades for {asset}")
        
        # 2. Get economic calendar and news
        economic_service = EconomicCalendarService()
        economic_data = economic_service.get_stock_events(asset)
        economic_summary = economic_service.get_market_summary(asset)
        
        logger.info(f"Economic events: {economic_summary[:100]}...")
        
        # 3. Auto-select persona based on trading performance
        persona_style = trade_service.auto_select_persona(user_trades)
        logger.info(f"Auto-selected persona: {persona_style}")
        
        # 4. Generate market event description
        market_event = f"{asset} analysis requested with economic calendar integration"
        
        # 5. Build context for agent pipeline
        context = {
            "market_event": market_event,
            "user_trades": user_trades,
            "persona_style": persona_style,
            "asset": asset,
            "user_id": user_id,
            "trade_summary": trade_summary,
            "economic_calendar": economic_data,
            "economic_summary": economic_summary,
            "auto_generated": True
        }
        
        # 6. Run agent pipeline
        agent_flow = [
            ("BehaviorMonitorAgent", BehaviorMonitorAgent, False),
            ("MarketWatcherAgent", MarketWatcherAgent, True),
            ("SentimentAnalysisAgent", SentimentAnalysisAgent, True),
            ("RiskManagerAgent", RiskManagerAgent, True),
            ("NarratorAgent", NarratorAgent, False),
            ("PersonaAgent", PersonaAgent, False),
            ("ModeratorAgent", ModeratorAgent, False),
            ("ComplianceAgent", ComplianceAgent, True)
        ]
        
        for agent_name, agent_cls, is_async in agent_flow:
            try:
                logger.info(f"Running {agent_name}...")
                agent = agent_cls ()
                
                if is_async:
                    context = await agent.run_async(context)
                else:
                    context = agent.run(context)
                    
                logger.info(f"✓ {agent_name} completed")
                
            except Exception as e:
                logger.error(f"✗ {agent_name} failed: {e}")
                context[f"{agent_name}_error"] = str(e)

        # Record run for self-improvement
        try:
            # Extract agent outputs from debate result
            agent_outputs = {}
            if "council_debate" in context and "agent_arguments" in context["council_debate"]:
                for arg in context["council_debate"]["agent_arguments"]:
                    # arg might be dict or object
                    name = arg.get("agent_name") if isinstance(arg, dict) else arg.agent_name
                    thesis = arg.get("thesis") if isinstance(arg, dict) else arg.thesis
                    agent_outputs[name] = thesis

            moderation = context.get("moderation", {})
            # Use X platform verdict as primary for now
            verdict = moderation.get("x", {})

            self_improvement_service.record_run(
                asset=asset,
                agent_outputs=agent_outputs,
                moderator_verdict=verdict
            )
        except Exception as e:
            logger.error(f"Failed to record run: {e}")
        
        # 7. Calculate market metrics (VIX, regime, risk index)
        metrics_service = get_market_metrics_service()
        market_metrics = metrics_service.get_all_metrics(
            symbol=asset,
            agent_data={
                "consensus_points": context.get("consensus_points", []),
                "disagreement_topics": context.get("disagreement_topics", []),
                "council_opinions": context.get("market_opinions", [])
            }
        )
        
        logger.info(f"Market metrics: VIX={market_metrics['vix']}, Regime={market_metrics['market_regime']}, Risk Index={market_metrics['risk_index']}")
        
        # 8. Format response
        response = {
            "asset": asset,
            "user_id": user_id,
            "analysis_type": "automated",
            "persona_selected": persona_style,
            
            # Market metrics (VIX, regime, risk index)
            "market_metrics": {
                "vix": market_metrics["vix"],
                "market_regime": market_metrics["market_regime"],
                "risk_index": market_metrics["risk_index"],
                "asset_volatility": market_metrics["asset_volatility"],
                "risk_level": metrics_service.get_risk_level_description(market_metrics["risk_index"]),
                "regime_color": metrics_service.get_regime_color(market_metrics["market_regime"])
            },
            
            # Trade summary
            "trade_history": {
                "total_trades": trade_summary["total_trades"],
                "total_pnl": trade_summary["total_pnl"],
                "win_rate": trade_summary["win_rate"],
                "last_trade": trade_summary.get("last_trade")
            },
            
            # Economic calendar impacts
            "economic_calendar": {
                "earnings": economic_data.get("earnings_calendar", {}),
                "recent_news": economic_data.get("recent_news", [])[:3],
                "economic_events": economic_data.get("economic_events", []),
                "summary": economic_summary
            },
            
            # Agent outputs
            "behavioral_analysis": {
                "flags": context.get("behavior_flags", []),
                "insights": context.get("insights", [])
            },
            
            "market_analysis": {
                "council_opinions": context.get("market_opinions", []),
                "consensus": context.get("consensus_points", []),
                "disagreements": context.get("disagreement_topics", []),
                "judge_summary": context.get("judge_summary", ""),
                "market_context": {
                    "price": context.get("current_price"),
                    "move_direction": context.get("move_direction"),
                    "change_pct": context.get("price_change_pct"),
                    "volume": context.get("volume")
                }
            },
            
            "narrative": {
                "summary": context.get("summary", ""),
                "styled_message": context.get("final_message", ""),
                "moderated_output": context.get("moderated_output", "")
            },
            
            "persona_post": context.get("persona_post", {"x": "", "linkedin": ""}),
            
            "risk_analysis": context.get("risk_analysis", {}),
            "sentiment_analysis": context.get("sentiment_analysis", {}),
            "compliance_analysis": context.get("compliance_analysis", {}),

            # Metadata
            "timestamp": economic_data.get("timestamp"),
            "errors": {k: v for k, v in context.items() if k.endswith("_error")}
        }
        
        logger.info(f"Analysis complete for {asset}")
        return response
        
    except ValueError as e:
        # Handle configuration errors (like missing API keys)
        error_msg = str(e)
        logger.error(f"Configuration error for {asset}: {error_msg}")
        
        if "API key" in error_msg or "LLM" in error_msg:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "LLM services unavailable",
                    "message": "The analysis system requires LLM API keys to function. Please contact the administrator.",
                    "technical_details": error_msg
                }
            )
        raise HTTPException(status_code=400, detail=error_msg)
        
    except Exception as e:
        logger.error(f"Analysis failed for {asset}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/run-agents")
async def run_agents(request: RunAgentsRequest):
    """
    LEGACY: Run the full multi-agent pipeline with custom inputs.
    For simplified usage, use /analyze-asset endpoint instead.
    
    Pipeline:
        1. BehaviorMonitorAgent - Detects trading psychology patterns
        2. MarketWatcherAgent - 5 LLM debate council (macro, fundamental, flow, technical, skeptic)
        3. NarratorAgent - Generates AI-powered session summary
        4. PersonaAgent - Applies personality styling
        5. ModeratorAgent - Final moderation and safety
    """
    
    logger.info(f"Starting agent pipeline for {request.market_event}")
    
    # Convert request to context dictionary
    context = {
        "market_event": request.market_event,
        "user_trades": [trade.model_dump() for trade in request.user_trades],
        "persona_style": request.persona_style
    }
    
    # Running agents in sequence
    agent_flow = [
        ("BehaviorMonitorAgent", BehaviorMonitorAgent, False),
        ("MarketWatcherAgent", MarketWatcherAgent, True),
        ("NarratorAgent", NarratorAgent, False),
        ("PersonaAgent", PersonaAgent, False),
        ("ModeratorAgent", ModeratorAgent, False)
    ]
    
    for agent_name, agent_cls, is_async in agent_flow:
        try:
            logger.info(f"Running {agent_name}...")
            agent = agent_cls()
            
            if is_async:
                context = await agent.run_async(context)
            else:
                context = agent.run(context)
                
            logger.info(f"✓ {agent_name} completed")
            
        except Exception as e:
            logger.error(f"✗ {agent_name} failed: {e}")
            context[f"{agent_name}_error"] = str(e)
    
    return {
        "message": "Multi-agent pipeline completed",
        "result": context,
        "agents_run": len(agent_flow)
    }


@app.get("/api")
def root():
    """Root API endpoint with API info."""
    return {
        "message": "Multi-Agent Trading Psychology API",
        "version": "2.0.0",
        "endpoints": {
            "/analyze-asset": "🚀 NEW - Simplified analysis (asset only)",
            "/run-agents": "Full agent pipeline (custom inputs)",
            "/health": "Health check",
            "/docs": "API documentation"
        },
        "agents": {
            "BehaviorMonitorAgent": "Detects 10 behavioral trading patterns",
            "MarketWatcherAgent": "5 LLM debate council (Macro, Fundamental, Flow, Technical, Skeptic)",
            "SentimentAnalysisAgent": "Analyzes market sentiment from news",
            "RiskManagerAgent": "Calculates VaR, Max Drawdown, and qualitative risk",
            "NarratorAgent": "AI-powered session summaries with trends",
            "PersonaAgent": "Personality styling",
            "ModeratorAgent": "Final moderation",
            "ComplianceAgent": "Checks for regulatory flags (SEC/FINRA)"
        },
        "features": {
            "economic_calendar": "Automated earnings and economic event tracking",
            "trade_history": "Automatic trade history fetching (DB integration ready)",
            "auto_persona": "Intelligent persona selection based on performance"
        }
    }


@app.get("/self-improvement/metrics")
def get_improvement_metrics():
    """Get self-improvement metrics."""
    return self_improvement_service.analyze_performance()

@app.get("/health")
def health_check():
    """Health check endpoint with environment diagnostics."""
    import os
    
    # Check API keys
    api_keys_status = {
        "groq": "✓" if os.getenv("GROQ_API_KEY") else "✗",
        "openrouter": "✓" if os.getenv("OPENROUTER_API_KEY") else "✗",
        "mistral": "✓" if os.getenv("MISTRAL_API_KEY") else "✗",
        "gemini": "✓" if os.getenv("GEMINI_API_KEY") else "✗"
    }
    
    # Check if at least one key is available
    has_llm_access = any(val == "✓" for val in api_keys_status.values())
    
    return {
        "status": "healthy" if has_llm_access else "degraded",
        "version": "2.0.0",
        "environment": {
            "api_keys": api_keys_status,
            "llm_available": has_llm_access,
            "warning": "Missing API keys - LLM features unavailable" if not has_llm_access else None
        },
        "services": {
            "behavior_monitor": "operational",
            "market_watcher": "operational (5 LLM council)" if has_llm_access else "degraded - no API keys",
            "narrator": "operational" if has_llm_access else "degraded - no API keys",
            "persona": "operational" if has_llm_access else "degraded - no API keys",
            "moderator": "operational",
            "economic_calendar": "operational",
            "trade_history": "operational (synthetic)"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
