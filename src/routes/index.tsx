import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useSession } from "@/store/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IntervAI — AI Mock Interview Platform" },
      { name: "description", content: "Practice technical interviews with AI. Voice + text. DSA, Spring Boot, System Design, LLD." },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useSession();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-[var(--cyan)] cursor-blink">initializing</div>
      </div>
    );
  }
  return <Navigate to={session ? "/dashboard" : "/login"} />;
}
