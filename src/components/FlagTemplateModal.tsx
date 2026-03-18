"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Flag, Loader2 } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ReportTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateName?: string;
  onSubmit?: (payload: {
    category: string;
    reason: string;
  }) => Promise<void> | void;
}

const concernOptions = [
  { value: "", label: "Select a concern" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "illegal", label: "Illegal or unsafe content" },
  { value: "spam", label: "Spam or misleading" },
  { value: "copyright", label: "Copyright or ownership issue" },
  { value: "harassment", label: "Harassment or hateful content" },
  { value: "adult", label: "Adult or sexual content" },
  { value: "violent", label: "Violent or disturbing content" },
  { value: "other", label: "Other" },
];

export function ReportTemplateModal({
  isOpen,
  onClose,
  templateName,
  onSubmit,
}: ReportTemplateModalProps) {
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCategory("");
      setReason("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const trimmedReason = reason.trim();
  const canSubmit =
    category.trim() !== "" && trimmedReason.length >= 10 && !isSubmitting;

  const helperText = useMemo(() => {
    if (!category) return "Choose the concern that best matches the issue.";
    if (trimmedReason.length < 10) {
      return "Please add a bit more detail so we can review it properly.";
    }
    return "Your report helps us review templates faster and more accurately.";
  }, [category, trimmedReason.length]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit?.({
        category,
        reason: trimmedReason,
      });
    } catch (error) {
      console.error("Failed to submit report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      {/* Increased max-w and ensured consistent horizontal and vertical padding throughout */}
      <DialogContent className="w-[calc(100%-9rem)] max-w-[900px] gap-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-xl mx-auto">
        {/* Header — px-10 py-8 for generous inset */}
        <div className="border-b border-border px-8 py-10">
          <DialogHeader className="space-y-0 text-left">
            <div className="flex items-start gap-4 pr-10">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                <Flag className="h-5 w-5" />
              </div>

              <div className="min-w-0 space-y-1.5">
                <DialogTitle className="text-[1.75rem] leading-none font-semibold text-foreground">
                  Report Template
                </DialogTitle>
{/*POTANGINA AYOKO NAAAAAAA*/ }
                <DialogDescription className="text-[15px] leading-7 text-muted-foreground">
                  Thanks for helping keep BuildX Designer safe and useful. Tell
                  us what seems wrong with{" "}
                  <span className="font-medium text-foreground">
                    {templateName || "this template"}
                  </span>
                  .
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Body — px-10 py-8 with space-y-7 between fields */}
        <div className="space-y-8 px-20 py-10">
          {/* Warning banner — px-6 py-5 so text never touches the border */}
          <div className="rounded-2xl border border-border bg-muted/30 px-12 py-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm leading-6 text-muted-foreground">
                Reports are reviewed manually. Please be as specific as possible
                so we can take the right action.
              </p>
            </div>
          </div>

          {/* Concern select */}
          <div className="space-y-2">
            <Label
              htmlFor="report-category"
              className="text-sm font-medium text-foreground"
            >
              Concern
            </Label>

            <select
              id="report-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl border border-input bg-background px-6 text-sm text-foreground outline-none transition-colors focus:border-blue-500"
            >
              {concernOptions.map((option) => (
                <option
                  key={option.value || "placeholder"}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Details textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="report-reason"
                className="text-sm font-medium text-foreground"
              >
                Details
              </Label>

              <span className="text-xs text-muted-foreground">
                {reason.length}/500
              </span>
            </div>

            <Textarea
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="Describe the issue here. Include what seems wrong, why it should be reviewed, and any important context."
              className="min-h-[160px] rounded-xl px-6 py-4 leading-7 resize-none"
              disabled={isSubmitting}
            />

            <p className="text-xs leading-6 text-muted-foreground">
              {helperText}
            </p>
          </div>
        </div>

        {/* Footer — px-10 py-7 to match body inset */}
        <div className="border-t border-border px-20 py-10">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                minWidth: "150px",
                height: "40px",
                borderRadius: "10px",
                padding: "0 20px",
                backgroundColor: canSubmit ? "#dc2626" : "#fca5a5",
                color: "#ffffff",
                border: "1px solid " + (canSubmit ? "#dc2626" : "#fca5a5"),
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "14px",
                fontWeight: 500,
                cursor: canSubmit ? "pointer" : "not-allowed",
                opacity: 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Flag className="mr-2 h-4 w-4" />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
