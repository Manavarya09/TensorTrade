import logging
import json
import os
from typing import Dict, List, Optional
from llm_council.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

class SentimentAnalysisAgent:
    """
    Analyzes market sentiment from news and social media to gauge bullish/bearish trends.
    Complements MarketWatcher with data-driven opinions.
    """

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.llm_client = None
        if self.api_key:
            try:
                self.llm_client = LLMClient(provider_type="openrouter", api_key=self.api_key, model="mistralai/mistral-7b-instruct")
            except Exception as e:
                logger.warning(f"SentimentAgent: LLM Client init failed: {e}")

    def fetch_sentiment(self, symbol: str, economic_calendar: Dict) -> List[str]:
        """
        Gathers recent news headlines from economic calendar or mocks if empty.
        """
        # 1. Use existing economic calendar news
        news = economic_calendar.get("recent_news", [])
        headlines = []

        for item in news:
            if isinstance(item, dict):
                headlines.append(item.get("title", ""))
            else:
                headlines.append(str(item))

        # 2. If no news, generate generic "market chatter" based on recent price move (mock)
        if not headlines:
            headlines = [
                f"{symbol} sees increased social volume ahead of earnings.",
                f"Traders discussing {symbol} support levels on Twitter.",
                f"Analyst upgrades for {symbol} circulating on forums."
            ]

        return headlines

    def analyze_sentiment(self, symbol: str, headlines: List[str]) -> Dict:
        """
        Use LLM to score sentiment from headlines (-1 to 1).
        """
        if not self.llm_client:
            return {
                "score": 0.0,
                "label": "NEUTRAL",
                "summary": "LLM unavailable for sentiment analysis."
            }

        prompt = f"""
        Analyze the sentiment for {symbol} based on these headlines:

        {json.dumps(headlines)}

        Provide a sentiment score from -1.0 (Very Bearish) to 1.0 (Very Bullish).
        Provide a label (BEARISH, NEUTRAL, BULLISH).
        Provide a short summary of the mood.

        Respond in JSON format:
        {{
            "score": 0.65,
            "label": "BULLISH",
            "summary": "Optimism surrounding upcoming product launch."
        }}
        """

        try:
            response = self.llm_client.complete(prompt, system="You are a Sentiment Analysis AI.")

            # Simple JSON extraction
            import re
            text = response.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            return json.loads(text)

        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return {
                "score": 0.0,
                "label": "NEUTRAL",
                "summary": "Error analyzing sentiment."
            }

    def run(self, context: Dict) -> Dict:
        """
        Orchestrate sentiment analysis.
        """
        symbol = context.get("asset", "SPY")
        economic_calendar = context.get("economic_calendar", {})

        # 1. Gather data
        headlines = self.fetch_sentiment(symbol, economic_calendar)

        # 2. Analyze
        sentiment = self.analyze_sentiment(symbol, headlines)

        # 3. Add to context
        context["sentiment_analysis"] = sentiment
        logger.info(f"Sentiment analysis for {symbol}: {sentiment.get('label')} ({sentiment.get('score')})")

        return context

    async def run_async(self, context: Dict) -> Dict:
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.run, context)
