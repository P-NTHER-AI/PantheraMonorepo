import { useLocation, useParams } from "react-router-dom";
import { useAgentDetails } from "../hooks/useAgents";
import AgentChat from "./AgentChat";

export function AgentChatRoute() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = (location.state || {}) as { agentName?: string; agentInstructions?: string };
  const { agent } = useAgentDetails(id);

  const agentName = state.agentName || (agent as any)?.name || agent?.tokenName || (agent as any)?.metadata?.name || "Agent";

  const agentInstructions = state.agentInstructions || agent?.agentInfo?.instructions || agent?.description || "";

  return (
    <AgentChat
      agentAddress={agent?.address || id || ""}
      agentName={agentName}
      agentInstructions={agentInstructions}
      isOpen={true}
      onClose={() => window.history.back()}
    />
  );
}
