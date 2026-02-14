import yfinance as yf
import numpy as np
import logging
from typing import Dict, List, Optional
from datetime import datetime
import os
from llm_council.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

class RiskManagerAgent:
    """
    Dynamically assesses and manages trading risk in real-time.
    Calculates metrics like Value at Risk (VaR), Max Drawdown, and provides a qualitative risk verdict.
    """

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.llm_client = None
        if self.api_key:
            try:
                self.llm_client = LLMClient(provider_type="openrouter", api_key=self.api_key, model="mistralai/mistral-7b-instruct")
            except Exception as e:
                logger.warning(f"RiskManager: LLM Client init failed: {e}")

    def calculate_risk_metrics(self, symbol: str) -> Dict:
        """
        Calculate quantitative risk metrics using historical data.
        """
        try:
            ticker = yf.Ticker(symbol)
            # Fetch 1 year of data for robust metrics
            hist = ticker.history(period="1y")

            if hist.empty:
                return {"var_95": 0.0, "max_drawdown": 0.0, "volatility": 0.0}

            # Daily returns
            returns = hist['Close'].pct_change().dropna()

            # Value at Risk (VaR) - 95% confidence
            # VaR is the loss level that will not be exceeded with 95% confidence
            var_95 = np.percentile(returns, 5) * 100  # Convert to percentage (negative value)

            # Max Drawdown
            # Calculate cumulative returns
            cum_returns = (1 + returns).cumprod()
            # Calculate running maximum
            running_max = cum_returns.cummax()
            # Calculate drawdown
            drawdown = (cum_returns - running_max) / running_max
            max_drawdown = drawdown.min() * 100 # Convert to percentage (negative value)

            # Volatility (Annualized)
            volatility = returns.std() * np.sqrt(252) * 100

            return {
                "var_95": round(var_95, 2),
                "max_drawdown": round(max_drawdown, 2),
                "volatility": round(volatility, 2)
            }
        except Exception as e:
            logger.error(f"Risk metric calculation failed for {symbol}: {e}")
            return {"var_95": 0.0, "max_drawdown": 0.0, "volatility": 0.0}

    def analyze_qualitative_risk(self, symbol: str, council_debate: Dict, metrics: Dict) -> Dict:
        """
        Use LLM to provide a qualitative risk assessment based on council debate and metrics.
        """
        if not self.llm_client:
            return {
                "risk_score": 50,
                "verdict": "MODERATE",
                "reasoning": "LLM unavailable. Based on default metrics."
            }

        try:
            # Extract key points from council debate
            consensus = council_debate.get("consensus_points", [])
            disagreements = council_debate.get("disagreement_points", [])

            consensus_text = "\n".join([f"- {p.statement if hasattr(p, 'statement') else p.get('statement')}" for p in consensus])
            disagreement_text = "\n".join([f"- {p.topic if hasattr(p, 'topic') else p.get('topic')}" for p in disagreements])

            prompt = f"""
            Analyze the risk profile for {symbol}.

            Quantitative Metrics:
            - VaR (95%): {metrics['var_95']}%
            - Max Drawdown (1Y): {metrics['max_drawdown']}%
            - Volatility (Ann.): {metrics['volatility']}%

            Council Consensus:
            {consensus_text}

            Council Disagreements:
            {disagreement_text}

            Assess the risk level (LOW, MODERATE, HIGH, EXTREME).
            Provide a short reasoning (max 2 sentences).
            Provide a risk score (0-100, where 100 is extreme risk).

            Respond in JSON format:
            {{
                "risk_score": 75,
                "verdict": "HIGH",
                "reasoning": "High volatility and significant disagreement among analysts suggest uncertainty."
            }}
            """

            response = self.llm_client.complete(prompt, system="You are a professional Risk Manager.")

            # Simple JSON extraction (reuse logic if possible, or simple strip)
            import json
            import re

            text = response.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            return json.loads(text)

        except Exception as e:
            logger.error(f"Qualitative risk analysis failed: {e}")
            return {
                "risk_score": 50,
                "verdict": "MODERATE",
                "reasoning": "Error in risk analysis. Proceed with caution."
            }

    def run(self, context: Dict) -> Dict:
        """
        Orchestrate the risk analysis.
        """
        symbol = context.get("asset", "SPY")
        council_debate = context.get("council_debate", {})

        # 1. Calculate metrics
        metrics = self.calculate_risk_metrics(symbol)

        # 2. Qualitative analysis
        qualitative = self.analyze_qualitative_risk(symbol, council_debate, metrics)

        # 3. Combine
        risk_analysis = {
            "metrics": metrics,
            "qualitative": qualitative,
            "timestamp": datetime.utcnow().isoformat()
        }

        context["risk_analysis"] = risk_analysis
        logger.info(f"Risk Manager completed for {symbol}: {qualitative.get('verdict')}")
        return context

    async def run_async(self, context: Dict) -> Dict:
        """Async wrapper."""
        # For now, just run sync method as yfinance is sync
        # In a real async app, we'd run yfinance in an executor
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.run, context)
