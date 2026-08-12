"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useGameMessages } from "@/hooks/useGameMessages";

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
  const messages = useGameMessages();

  useEffect(() => {
    if (!lastActionError) return;

    toast({
      title: messages.tradeControls.actionFailedToastTitle,
      description: lastActionError,
      variant: "destructive",
    });

    clearLastActionError();
  }, [lastActionError, toast, clearLastActionError, messages]);
}
