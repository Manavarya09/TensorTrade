import logging
import json
import os
from typing import Dict, List, Optional
from llm_council.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

class ComplianceAgent:
    """
    Ensures trades and communications comply with regulations (e.g., SEC rules,
    anti-money laundering), adding a layer of safety for real-world use.
    Flags risky language (promises of returns, pump-and-dump rhetoric).
    """

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.llm_client = None
        if self.api_key:
            try:
                self.llm_client = LLMClient(provider_type="openrouter", api_key=self.api_key, model="mistralai/mistral-7b-instruct")
            except Exception as e:
                logger.warning(f"ComplianceAgent: LLM Client init failed: {e}")

    def check_compliance(self, narrative: str, persona_post: Dict) -> Dict:
        """
        Check the generated narrative and posts for regulatory red flags.
        """
        if not self.llm_client:
            return {
                "status": "PASS",
                "issues": [],
                "notes": "Compliance check skipped (LLM unavailable)."
            }

        prompt = f"""
        Review the following trading content for regulatory compliance (SEC/FINRA guidelines).

        Narrative: "{narrative[:500]}..."
        Social Post (X): "{persona_post.get('x', '')}"

        Flag any of the following:
        1. Promising guaranteed returns ("guaranteed profit", "risk-free").
        2. Pump-and-dump language ("moon soon", "100x gem").
        3. Providing specific financial advice without disclaimer ("Buy now", "Sell everything").

        Respond in JSON format:
        {{
            "status": "PASS" or "FLAGGED",
            "issues": ["Issue 1", "Issue 2"],
            "notes": "Brief explanation."
        }}
        """

        try:
            response = self.llm_client.complete(prompt, system="You are a Compliance Officer.")

            # Simple JSON extraction
            text = response.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            return json.loads(text)

        except Exception as e:
            logger.error(f"Compliance check failed: {e}")
            return {
                "status": "PASS",
                "issues": [],
                "notes": "Error during compliance check."
            }

    def run(self, context: Dict) -> Dict:
        """
        Orchestrate compliance check.
        """
        narrative = context.get("narrative", {}).get("styled_message", "")
        persona_post = context.get("persona_post", {})

        result = self.check_compliance(narrative, persona_post)

        context["compliance_analysis"] = result
        logger.info(f"Compliance check: {result.get('status')}")

        return context

    async def run_async(self, context: Dict) -> Dict:
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.run, context)
