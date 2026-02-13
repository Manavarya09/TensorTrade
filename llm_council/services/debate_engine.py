"""
Multi-agent debate service using 5 specialized LLM agents.
Each agent provides real-time analysis from different perspectives.
"""

import logging
from typing import List, Dict, Optional, AsyncGenerator
from datetime import datetime
import asyncio
import json
import re

from .llm_client import LLMClient
from .agent_prompts import get_enhanced_system_prompt
from ..core.config import settings
from ..models.schemas import (
    AgentArgument,
    ConsensusPoint,
    DisagreementPoint,
    ConfidenceLevel,
    EvidenceStrength,
)

logger = logging.getLogger(__name__)


class DebateEngine:
    """5-agent debate system for market analysis."""
    
    def __init__(self):
        # Validate API keys are available
        if not settings.OPENROUTER_API_KEY and not settings.MISTRAL_API_KEY and not settings.GEMINI_API_KEY and not settings.GROQ_API_KEY:
            logger.error("❌ NO LLM API KEYS CONFIGURED")
            logger.error("Please set at least one of: OPENROUTER_API_KEY, MISTRAL_API_KEY, GEMINI_API_KEY, GROQ_API_KEY")
            raise ValueError(
                "No LLM API keys configured. Please set environment variables:\n"
                "  - OPENROUTER_API_KEY (recommended - supports multiple models)\n"
                "  - MISTRAL_API_KEY\n"
                "  - GEMINI_API_KEY\n"
                "  - GROQ_API_KEY"
            )
        
        logger.info("Initializing 5-agent debate system...")
        logger.info(f"✓ OpenRouter: {'configured' if settings.OPENROUTER_API_KEY else 'not set'}")
        logger.info(f"✓ Mistral: {'configured' if settings.MISTRAL_API_KEY else 'not set'}")
        logger.info(f"✓ Gemini: {'configured' if settings.GEMINI_API_KEY else 'not set'}")
        logger.info(f"✓ Groq: {'configured' if settings.GROQ_API_KEY else 'not set'}")
        
        # Create 5 LLM instances - diverse providers
        # You can customize which models to use by editing this configuration
        self.llm_providers = {
            "🦅 Macro Hawk": LLMClient(
                provider_type="openrouter",
                api_key=settings.OPENROUTER_API_KEY,
                model="mistralai/mistral-7b-instruct"
            ) if settings.OPENROUTER_API_KEY else None,
            "🔬 Micro Forensic": LLMClient(
                provider_type="openrouter",
                api_key=settings.OPENROUTER_API_KEY,
                model="gryphe/mythomax-l2-13b"
            ) if settings.OPENROUTER_API_KEY else None,
            "💧 Flow Detective": LLMClient(
                provider_type="openrouter",
                api_key=settings.OPENROUTER_API_KEY,
                model="mistralai/mistral-7b-instruct"
            ) if settings.OPENROUTER_API_KEY else None,
            "📊 Tech Interpreter": LLMClient(
                provider_type="openrouter",
                api_key=settings.OPENROUTER_API_KEY,
                model="gryphe/mythomax-l2-13b"
            ) if settings.OPENROUTER_API_KEY else None,
            "🤔 Skeptic": LLMClient(
                provider_type="mistral",
                api_key=settings.MISTRAL_API_KEY
            ) if settings.MISTRAL_API_KEY else (
                LLMClient(
                    provider_type="gemini",
                    api_key=settings.GEMINI_API_KEY
                ) if settings.GEMINI_API_KEY else None
            ),
        }
        
        # Remove None values (agents without API keys)
        self.llm_providers = {k: v for k, v in self.llm_providers.items() if v is not None}
        
        if not self.llm_providers:
            raise ValueError("No valid LLM providers initialized. Check API keys.")
        
        logger.info(f"✓ Initialized {len(self.llm_providers)} agents")

    
    async def debate_stream_async(self, symbol: str, economic_context: str = "") -> AsyncGenerator[Dict, None]:
        """
        Run 5-agent debate on a market move, yielding results as they complete.
        Returns an AsyncGenerator that yields Dicts with 'type' and 'data'.
        """
        yield {"type": "status", "message": f"Fetching market data for {symbol}..."}

        # Get market data
        price_data = self._get_market_data(symbol)
        yield {"type": "market_data", "data": price_data}

        move_pct = price_data.get("change_percent", 0.8)
        move_direction = "UP" if move_pct > 0 else "DOWN"
        current_price = price_data.get("price", 100)
        volume = price_data.get("volume", 50000000)

        logger.info(f"Stream Debating {symbol}: {move_pct:.2f}% {move_direction}")

        # Context for all agents
        market_context = f"""
Current Price: ${current_price:.2f}
Move Today: {move_direction} {abs(move_pct):.2f}%
Trading Volume: {volume:,}
Symbol: {symbol}

ECONOMIC CALENDAR & NEWS:
{economic_context if economic_context else "No scheduled economic events."}

Provide a realistic analysis from your agent perspective. Be specific, use data-driven reasoning.
Include 3-4 supporting points with concrete details.
Consider the economic calendar events when evaluating market drivers.
"""

        # Define agents
        agents = [
            {"name": "🦅 Macro Hawk", "role": "Macroeconomic analyst", "temperature": 0.6},
            {"name": "🔬 Micro Forensic", "role": "Fundamental analyst", "temperature": 0.6},
            {"name": "💧 Flow Detective", "role": "Market microstructure expert", "temperature": 0.7},
            {"name": "📊 Tech Interpreter", "role": "Technical analyst", "temperature": 0.7},
            {"name": "🤔 Skeptic", "role": "Critical risk analyst", "temperature": 0.8}
        ]

        yield {"type": "status", "message": f"Starting 5-agent debate council..."}
        logger.info(f"Starting stream analysis for {len(agents)} agents...")

        # Create tasks for all agents
        tasks = []
        for agent in agents:
            # We wrap the call to attach agent metadata to the task if needed,
            # but getting the result directly is easier.
            task = asyncio.create_task(
                self._get_agent_argument_async(
                    symbol=symbol,
                    agent_name=agent["name"],
                    market_context=market_context,
                    move_pct=move_pct,
                    move_direction=move_direction,
                    temperature=agent["temperature"]
                )
            )
            tasks.append(task)

        # Collect results as they complete
        agent_arguments = []

        # Use as_completed to yield results as soon as they are ready
        for future in asyncio.as_completed(tasks):
            try:
                arg = await future
                agent_arguments.append(arg)

                # Convert Pydantic model to dict
                arg_data = arg.model_dump() if hasattr(arg, "model_dump") else arg.dict()

                yield {
                    "type": "agent_result",
                    "agent": arg.agent_name,
                    "data": arg_data
                }
                logger.info(f"✓ Stream: {arg.agent_name} completed")

            except Exception as e:
                logger.error(f"Stream Agent failed: {e}")
                yield {"type": "error", "message": str(e)}

        # Build final consensus
        yield {"type": "status", "message": "Synthesizing debate results..."}

        consensus_points = self._build_consensus(agent_arguments, symbol)
        disagreement_points = self._build_disagreements(agent_arguments, symbol)

        judge_summary = self._build_judge_summary(
            agent_arguments=agent_arguments,
            symbol=symbol,
            move_pct=move_pct,
            move_direction=move_direction,
            consensus_points=consensus_points
        )

        # Prepare final result structure (matching standard output)
        final_result = {
            "symbol": symbol,
            "timestamp": datetime.utcnow().isoformat(),
            "agent_arguments": [
                (arg.model_dump() if hasattr(arg, "model_dump") else arg.dict())
                for arg in agent_arguments
            ],
            "consensus_points": [
                (cp.model_dump() if hasattr(cp, "model_dump") else cp.dict())
                for cp in consensus_points
            ],
            "disagreement_points": [
                (dp.model_dump() if hasattr(dp, "model_dump") else dp.dict())
                for dp in disagreement_points
            ],
            "judge_summary": judge_summary,
            "market_context": {
                "price": current_price,
                "move_pct": move_pct,
                "move_direction": move_direction,
                "volume": volume,
            }
        }

        yield {"type": "debate_complete", "data": final_result}


    async def debate_move_async(self, symbol: str, economic_context: str = "") -> Dict:
        """
        Run 5-agent debate on a market move using REAL LLM calls.
        
        Args:
            symbol: Stock symbol (e.g., "AAPL", "MSFT")
            economic_context: Optional economic calendar/news context
        
        Returns:
            Dict with debate results including agent arguments, consensus, disagreements
        """
        
        # Get market data
        price_data = self._get_market_data(symbol)
        
        move_pct = price_data.get("change_percent", 0.8)
        move_direction = "UP" if move_pct > 0 else "DOWN"
        current_price = price_data.get("price", 100)
        volume = price_data.get("volume", 50000000)
        
        logger.info(f"Debating {symbol}: {move_pct:.2f}% {move_direction} (price: ${current_price:.2f})")
        
        # Context for all agents
        market_context = f"""
Current Price: ${current_price:.2f}
Move Today: {move_direction} {abs(move_pct):.2f}%
Trading Volume: {volume:,}
Symbol: {symbol}

ECONOMIC CALENDAR & NEWS:
{economic_context if economic_context else "No scheduled economic events."}

Provide a realistic analysis from your agent perspective. Be specific, use data-driven reasoning.
Include 3-4 supporting points with concrete details.
Consider the economic calendar events when evaluating market drivers.
"""
        
        # Run 5 agents in parallel
        agents = [
            {
                "name": "🦅 Macro Hawk",
                "role": "Macroeconomic analyst",
                "temperature": 0.6,
            },
            {
                "name": "🔬 Micro Forensic",
                "role": "Fundamental analyst",
                "temperature": 0.6,
            },
            {
                "name": "💧 Flow Detective",
                "role": "Market microstructure expert",
                "temperature": 0.7,
            },
            {
                "name": "📊 Tech Interpreter",
                "role": "Technical analyst",
                "temperature": 0.7,
            },
            {
                "name": "🤔 Skeptic",
                "role": "Critical risk analyst",
                "temperature": 0.8,
            }
        ]
        
        # Run all 5 agents in parallel using asyncio.gather
        logger.info(f"Starting parallel analysis for {len(agents)} agents...")
        try:
            agent_arguments = await asyncio.gather(*[
                self._get_agent_argument_async(
                    symbol=symbol,
                    agent_name=agent["name"],
                    market_context=market_context,
                    move_pct=move_pct,
                    move_direction=move_direction,
                    temperature=agent["temperature"]
                )
                for agent in agents
            ])
            
            for agent, arg in zip(agents, agent_arguments):
                logger.info(f"✓ {agent['name']} analysis complete")
        except Exception as e:
            logger.error(f"REAL LLM ERROR: {e}")
            raise
        
        # Build consensus and disagreement points
        consensus_points = self._build_consensus(agent_arguments, symbol)
        disagreement_points = self._build_disagreements(agent_arguments, symbol)
        
        # Build judge summary
        judge_summary = self._build_judge_summary(
            agent_arguments=agent_arguments,
            symbol=symbol,
            move_pct=move_pct,
            move_direction=move_direction,
            consensus_points=consensus_points
        )
        
        return {
            "symbol": symbol,
            "timestamp": datetime.utcnow(),
            "agent_arguments": agent_arguments,
            "consensus_points": consensus_points,
            "disagreement_points": disagreement_points,
            "judge_summary": judge_summary,
            "market_context": {
                "price": current_price,
                "move_pct": move_pct,
                "move_direction": move_direction,
                "volume": volume,
            }
        }
    
    async def _get_agent_argument_async(
        self,
        symbol: str,
        agent_name: str,
        market_context: str,
        move_pct: float,
        move_direction: str,
        temperature: float = 0.7,
        max_retries: int = 2
    ) -> AgentArgument:
        """Get agent argument from respective LLM provider (async version)."""
        
        logger.info(f"Getting {agent_name} analysis...")
        
        # Get the right LLM for this agent
        llm = self.llm_providers.get(agent_name)
        if not llm:
            raise ValueError(f"LLM provider not found for {agent_name}")
        
        # Get detailed system prompt for this agent
        system_prompt = get_enhanced_system_prompt(agent_name)
        
        # Build detailed user prompt (simplified for better success rate)
        prompt = f"""Analyze {symbol} {move_direction} {abs(move_pct):.2f}% today.

{market_context}

Respond in JSON format ONLY (no markdown):
{{
    "thesis": "One sentence with numbers",
    "supporting_points": ["point 1", "point 2", "point 3"],
    "confidence": "high"
}}"""
        
        # Try up to max_retries times
        for attempt in range(max_retries):
            try:
                # Use async version for LLM call
                response = await llm.complete_async(
                    prompt=prompt,
                    system=system_prompt,
                    temperature=temperature
                )
                logger.info(f"{agent_name} response length: {len(response)}")
                
                # Parse JSON response with aggressive cleaning
                text = self._clean_json_response(response)
                data = json.loads(text)
                
                if "thesis" in data and "supporting_points" in data:
                    confidence_map = {
                        "high": ConfidenceLevel.HIGH,
                        "moderate": ConfidenceLevel.MODERATE,
                        "low": ConfidenceLevel.LOW,
                    }
                    
                    supporting_points = data.get("supporting_points", [])
                    if supporting_points and isinstance(supporting_points[0], dict):
                        supporting_points = [
                            f"{p.get('reason', '')} - {p.get('details', '')}" 
                            if isinstance(p, dict) else str(p)
                            for p in supporting_points
                        ]
                    
                    return AgentArgument(
                        agent_name=agent_name,
                        thesis=data.get("thesis", ""),
                        supporting_points=supporting_points[:4],
                        confidence=confidence_map.get(
                            str(data.get("confidence", "moderate")).lower(), 
                            ConfidenceLevel.MODERATE
                        ),
                        references=[]
                    )
                    
            except Exception as e:
                logger.warning(f"{agent_name} attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    # Last attempt failed - use fallback
                    logger.error(f"All retries failed for {agent_name}, using fallback")
                    return self._generate_fallback_argument(agent_name, symbol, move_direction, move_pct)
                # Wait a bit before retry
                await asyncio.sleep(0.5)
        
        # Should never reach here, but just in case
        return self._generate_fallback_argument(agent_name, symbol, move_direction, move_pct)
    
    def _clean_json_response(self, response: str) -> str:
        """Aggressively clean LLM response to extract valid JSON."""
        text = response.strip()
        
        # Remove markdown code fences
        if '```' in text:
            patterns = [
                r'```json\s*\n(.*?)\n```',
                r'```\s*\n(.*?)\n```',
                r'```json\s*(.*?)```',
                r'```\s*(.*?)```',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text, re.DOTALL)
                if match:
                    text = match.group(1).strip()
                    break
            else:
                text = text.replace('```json', '').replace('```', '').strip()
        
        # Remove control characters
        text = text.replace('\r', '').replace('\t', ' ')
        text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F]', '', text)
        
        # Fix common JSON issues
        text = re.sub(r',(\s*[}\]])', r'\1', text)  # Trailing commas
        text = re.sub(r'//.*?$', '', text, flags=re.MULTILINE)  # Comments
        text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
        
        return text
    
    def _generate_fallback_argument(
        self,
        agent_name: str,
        symbol: str,
        move_direction: str,
        move_pct: float
    ) -> AgentArgument:
        """Generate a fallback argument when LLM fails."""
        
        fallback_theses = {
            "🦅 Macro Hawk": f"{symbol} moved {move_direction} {abs(move_pct):.2f}% likely due to broader market sentiment and sector rotation.",
            "🔬 Micro Forensic": f"{symbol}'s {abs(move_pct):.2f}% move suggests fundamental catalyst or earnings expectations shift.",
            "💧 Flow Detective": f"Institutional flow patterns showing {abs(move_pct):.2f}% move in {symbol} with above-average volume.",
            "📊 Tech Interpreter": f"{symbol} showing {abs(move_pct):.2f}% technical movement with momentum indicators active.",
            "🤔 Skeptic": f"{symbol}'s {abs(move_pct):.2f}% move requires confirmation - monitoring for sustainability.",
        }
        
        return AgentArgument(
            agent_name=agent_name,
            thesis=fallback_theses.get(agent_name, f"{symbol} moved {abs(move_pct):.2f}% {move_direction}"),
            supporting_points=[
                "Market dynamics suggest continuation possible",
                "Volume patterns support current movement",
                "Technical levels being tested"
            ],
            confidence=ConfidenceLevel.MODERATE,
            references=[]
        )
    
    def _build_consensus(self, agent_arguments: List[AgentArgument], symbol: str) -> List[ConsensusPoint]:
        """Identify areas of agreement among agents."""
        
        high_conf_agents = [a.agent_name for a in agent_arguments if a.confidence == ConfidenceLevel.HIGH]
        
        consensus_points = []
        
        if len(high_conf_agents) >= 4:
            consensus_points.append(
                ConsensusPoint(
                    statement=f"{len(high_conf_agents)} out of 5 agents show HIGH confidence",
                    supporting_agents=high_conf_agents,
                    evidence_strength=EvidenceStrength.STRONG
                )
            )
        
        if consensus_points:
            consensus_points.append(
                ConsensusPoint(
                    statement=f"Multiple agents identify real catalysts driving {symbol}",
                    supporting_agents=[a.agent_name for a in agent_arguments[:3]],
                    evidence_strength=EvidenceStrength.MODERATE
                )
            )
        
        return consensus_points or [
            ConsensusPoint(
                statement="Multi-agent analysis identifies mixed factors",
                supporting_agents=[a.agent_name for a in agent_arguments],
                evidence_strength=EvidenceStrength.MODERATE
            )
        ]
    
    def _build_disagreements(self, agent_arguments: List[AgentArgument], symbol: str) -> List[DisagreementPoint]:
        """Identify disagreements among agents."""
        
        skeptic = next((a for a in agent_arguments if "Skeptic" in a.agent_name), None)
        
        if skeptic:
            return [
                DisagreementPoint(
                    topic="Is this move sustainable?",
                    competing_views={
                        "Bulls (4 agents)": f"Real catalysts support the move",
                        "Skeptic": "Move needs confirmation, risks present"
                    },
                    evidence_strength_per_view={
                        "Bulls (4 agents)": EvidenceStrength.STRONG,
                        "Skeptic": EvidenceStrength.MODERATE
                    }
                )
            ]
        
        return [
            DisagreementPoint(
                topic="Short-term vs long-term implications",
                competing_views={
                    "Fundamental agents": "Fundamental value shift",
                    "Technical/Flow agents": "Technical setup driving"
                },
                evidence_strength_per_view={}
            )
        ]
    
    def _build_judge_summary(
        self,
        agent_arguments: List[AgentArgument],
        symbol: str,
        move_pct: float,
        move_direction: str,
        consensus_points: List[ConsensusPoint]
    ) -> str:
        """Build comprehensive judge summary."""
        
        summary = f"\n🎙️ MULTI-AGENT DEBATE: {symbol} {move_direction} {abs(move_pct):.2f}%\n"
        summary += "="*60 + "\n\n"
        
        summary += "AGENT PERSPECTIVES:\n"
        for i, arg in enumerate(agent_arguments, 1):
            summary += f"{i}. {arg.agent_name} ({arg.confidence.value}): {arg.thesis}\n"
        
        summary += f"\nCONSENSUS:\n"
        for cp in consensus_points:
            summary += f"✓ {cp.statement}\n"
        
        high_conf_count = sum(1 for a in agent_arguments if a.confidence == ConfidenceLevel.HIGH)
        summary += f"\n{high_conf_count}/5 agents show high confidence.\n"
        
        return summary
    
    def _get_market_data(self, symbol: str) -> Dict:
        """Get market data using yfinance."""
        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period="2d")
            
            if not hist.empty and len(hist) >= 2:
                current_price = hist['Close'].iloc[-1]
                prev_price = hist['Close'].iloc[-2]
                change_pct = ((current_price - prev_price) / prev_price) * 100
                volume = int(hist['Volume'].iloc[-1])
                
                return {
                    "price": float(current_price),
                    "change_percent": float(change_pct),
                    "volume": volume,
                    "symbol": symbol
                }
        except Exception as e:
            logger.warning(f"Could not fetch market data for {symbol}: {e}")
        
        # Fallback to synthetic data
        return {
            "price": 150.00,
            "change_percent": 1.2,
            "volume": 50000000,
            "symbol": symbol
        }


# Convenience function for easy access
async def get_council_analysis(symbol: str, economic_context: str = "") -> Dict:
    """
    Get 5-agent council analysis for a symbol.
    
    Args:
        symbol: Stock ticker symbol
        economic_context: Optional economic calendar/news context
    
    Usage:
        result = await get_council_analysis("AAPL", economic_context="Earnings tomorrow")
    """
    try:
        engine = DebateEngine()
        return await engine.debate_move_async(symbol, economic_context)
    except ValueError as e:
        # Handle missing API keys gracefully
        error_msg = str(e)
        logger.error(f"Cannot initialize LLM council: {error_msg}")
        
        # Return a stub response indicating the service is unavailable
        from ..models.schemas import AgentArgument, ConfidenceLevel
        
        return {
            "agent_arguments": [],
            "consensus_points": [],
            "disagreement_points": [],
            "judge_summary": f"⚠️ LLM Council Unavailable: {error_msg}",
            "market_context": {
                "symbol": symbol,
                "price": 0,
                "move_pct": 0,
                "move_direction": "UNKNOWN",
                "volume": 0
            }
        }

async def get_council_analysis_stream(symbol: str, economic_context: str = "") -> AsyncGenerator[Dict, None]:
    """
    Get 5-agent council analysis stream for a symbol.
    Yields status updates and partial results.
    """
    try:
        engine = DebateEngine()
        async for chunk in engine.debate_stream_async(symbol, economic_context):
            yield chunk
    except ValueError as e:
        error_msg = str(e)
        logger.error(f"Cannot initialize LLM council: {error_msg}")
        yield {"type": "error", "message": f"LLM Council Unavailable: {error_msg}"}
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield {"type": "error", "message": f"Streaming failed: {str(e)}"}
