import json
from typing import Optional, Protocol

from .config import Settings
from .schemas import ProductBrief, ProjectRead


class Strategist(Protocol):
    async def generate(self, project: ProjectRead, revision_instructions: Optional[str] = None) -> ProductBrief:
        ...


class DeterministicStrategist:
    """A predictable local provider used for development and automated tests."""

    async def generate(self, project: ProjectRead, revision_instructions: Optional[str] = None) -> ProductBrief:
        focus = f" The requested revision is: {revision_instructions}" if revision_instructions else ""
        return ProductBrief(
            product_definition=f"{project.name} is a {project.project_type.lower()} that turns a focused user need into an actionable workflow.{focus}",
            problem=f"The current experience behind this idea is fragmented and difficult to act on: {project.idea}",
            target_users=["Primary operator", "Operational decision-maker"],
            value_proposition="Move from scattered inputs to a clear, explainable recommendation in one controlled workflow.",
            mvp_features=[
                "Capture the minimum useful inputs",
                "Produce a clear and explainable output",
                "Recommend the next action",
                "Record feedback and decisions",
            ],
            non_goals=["Fully autonomous execution", "Enterprise-wide integrations in the first release"],
            assumptions=[
                "Users can provide the core inputs needed for an initial decision",
                "Human review remains required for consequential outputs",
            ],
            success_metrics=[
                "Time from input to decision",
                "Percentage of outputs accepted without revision",
                "Weekly active operators",
            ],
        )


class OpenAIStrategist:
    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("FORGE_OPENAI_API_KEY is required when FORGE_AGENT_PROVIDER=openai")
        from openai import AsyncOpenAI

        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    async def generate(self, project: ProjectRead, revision_instructions: Optional[str] = None) -> ProductBrief:
        schema = ProductBrief.model_json_schema()
        revision = revision_instructions or "No revision request. Create version 1."
        response = await self.client.responses.create(
            model=self.model,
            store=False,
            instructions=(
                "You are Forge's Product Strategist. Turn an ambiguous idea into a concise, implementation-ready "
                "product brief. Separate MVP scope from non-goals, state assumptions, and use measurable outcomes."
            ),
            input=(
                f"Project: {project.name}\nType: {project.project_type}\nGoal: {project.goal}\n"
                f"Idea: {project.idea}\nRevision instruction: {revision}"
            ),
            text={
                "format": {
                    "type": "json_schema",
                    "name": "forge_product_brief",
                    "strict": True,
                    "schema": schema,
                }
            },
        )
        return ProductBrief.model_validate(json.loads(response.output_text))


def get_strategist(settings: Settings) -> Strategist:
    if settings.agent_provider.lower() == "openai":
        return OpenAIStrategist(settings)
    return DeterministicStrategist()
