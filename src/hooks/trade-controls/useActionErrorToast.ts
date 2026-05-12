"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Displays trading action errors as toast notifications.
 *
 * Automatically clears the error after displaying it.
 */
export function useActionErrorToast(
  lastActionError: string | null,
  clearLastActionError: () => void
) {
  const { toast } = useToast();

  useEffect(() => {
    if (!lastActionError) return;

    toast({
      title: "⚠️ Action Failed",
      description: lastActionError,
      variant: "destructive",
    });

    clearLastActionError();
  }, [lastActionError, toast, clearLastActionError]);
}
