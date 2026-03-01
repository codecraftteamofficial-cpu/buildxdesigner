import { ArrowLeft, Link2Off, Lock, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";

interface GetOutProps {
  onBackToDashboard?: () => void;
}

export function GetOut({ onBackToDashboard }: GetOutProps) {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mb-5 flex items-center justify-center gap-3 text-muted-foreground">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          <Lock className="h-7 w-7" aria-hidden="true" />
          <Link2Off className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Private Project
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          This project is currently private and can’t be viewed from this link.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          To access it publicly, the project owner needs to change the link
          visibility to public.
        </p>

        <div className="mt-6 flex items-center justify-center">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleBackToDashboard}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
