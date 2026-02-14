import logging
import json
import os
from typing import Dict, List, Optional
from llm_council.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

class ShariahComplianceAgent:
    """
    Evaluates assets and trades for Shariah compliance based on Islamic finance principles.
    Checks business activity (Haram industries) and financial ratios (Debt, Interest).
    """

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.llm_client = None
        if self.api_key:
            try:
                # Using a model suitable for reasoning, like Mistral or Llama
                self.llm_client = LLMClient(provider_type="openrouter", api_key=self.api_key, model="mistralai/mistral-7b-instruct")
            except Exception as e:
                logger.warning(f"ShariahComplianceAgent: LLM Client init failed: {e}")

    def check_asset_compliance(self, asset: str, sector: str = "", description: str = "") -> Dict:
        """
        Check if an asset is Shariah-compliant.
        """
        if not self.llm_client:
            return {
                "compliant": False,
                "score": 0,
                "reason": "Compliance check skipped (LLM unavailable).",
                "issues": ["LLM Unavailable"]
            }

        prompt = f"""
        Act as a Shariah Compliance Officer for an Islamic investment firm.
        Evaluate the following asset for Shariah compliance based on AAOIFI standards.

        Asset: {asset}
        Sector: {sector}
        Description: {description}

        Criteria:
        1. Business Activity Screening: ensure the core business is not Haram (e.g., Alcohol, Gambling, Pork, Interest-based Finance, Adult Entertainment).
        2. Financial Ratio Screening (Approximate):
           - Total Debt / Market Cap < 33%
           - Cash + Interest Bearing Securities / Market Cap < 33%
           - Accounts Receivables / Market Cap < 33%

        If you don't have real-time financial data, use your knowledge base to estimate based on the company's typical profile.

        Respond in JSON format:
        {{
            "compliant": true/false,
            "score": 0-100 (100 is fully compliant, 0 is haram),
            "reason": "Brief explanation of the verdict.",
            "issues": ["List of specific concerns if any, e.g., 'High Debt', 'Involved in Alcohol'"]
        }}
        """

        try:
            response = self.llm_client.complete(prompt, system="You are a Shariah Compliance Officer.")

            # Simple JSON extraction
            text = response.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            return json.loads(text)

        except Exception as e:
            logger.error(f"Shariah compliance check failed: {e}")
            return {
                "compliant": False,
                "score": 0,
                "reason": f"Error during compliance check: {str(e)}",
                "issues": ["Error"]
            }

    def run(self, context: Dict) -> Dict:
        """
        Orchestrate Shariah compliance check.
        """
        asset = context.get("asset", "Unknown")
        # Try to get sector/description if available in context, otherwise empty
        sector = context.get("sector", "")
        description = context.get("description", "")

        logger.info(f"Running Shariah compliance check for {asset}...")
        result = self.check_asset_compliance(asset, sector, description)

        context["shariah_compliance"] = result
        logger.info(f"Shariah compliance check for {asset}: {result.get('compliant')} (Score: {result.get('score')})")

        return context

    async def run_async(self, context: Dict) -> Dict:
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.run, context)
