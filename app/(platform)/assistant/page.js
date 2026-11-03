import AssistantChat from "@/components/assistant/AssistantChat";

export const metadata = {
  title: "Allison, AI Event Assistant | GatorAid",
  description: "Ask Allison to find, summarize and compare SFSU campus events.",
};

export default function Page() {
  return <AssistantChat />;
}
