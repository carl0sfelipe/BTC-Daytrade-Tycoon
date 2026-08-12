import { describe, expect, it } from "vitest";
import { DAILY_MISSIONS } from "@/lib/missions/daily-missions";
import { enGameMessages } from "./messages/en";
import { ptBrGameMessages } from "./messages/pt-br";
import { resolveMissionCopy } from "./mission-copy";

const serverSniperMission = {
  id: "daily-called-shots",
  title: "Sniper",
  description: "Hit 2 called shots today",
};

// Simulates a mission the server shipped before the catalogs learned it.
const unknownServerMission = {
  id: "daily-mystery",
  title: "Mystery Mission",
  description: "Do the mysterious thing today",
};

describe("resolveMissionCopy", () => {
  it("returns the pt-BR catalog copy for a known mission id", () => {
    const copy = resolveMissionCopy(
      { id: "daily-run", title: "Close the Day", description: "Complete 1 run today" },
      ptBrGameMessages
    );
    expect(copy).toEqual({ title: "Feche o Dia", description: "Complete 1 run hoje" });
  });

  it("keeps the English server copy when resolving with the EN catalog", () => {
    const copy = resolveMissionCopy(serverSniperMission, enGameMessages);
    expect(copy).toEqual({ title: "Sniper", description: "Hit 2 called shots today" });
  });

  it("falls back to the server copy for an unknown mission id", () => {
    const copy = resolveMissionCopy(unknownServerMission, ptBrGameMessages);
    expect(copy).toEqual({
      title: "Mystery Mission",
      description: "Do the mysterious thing today",
    });
  });

  type KnownMissionId = keyof typeof enGameMessages.missions.definitions;

  it("covers every server mission id in both catalogs (no silent EN leak)", () => {
    for (const mission of DAILY_MISSIONS) {
      const id = mission.id as KnownMissionId;
      expect(enGameMessages.missions.definitions[id]).toBeDefined();
      expect(ptBrGameMessages.missions.definitions[id]).toBeDefined();
    }
  });

  // Tripwire (audit 2026-08-12): the EN catalog shadows the server copy for
  // known ids, so a server-side copy edit would be silently ignored unless
  // this stays in lockstep.
  it("keeps the EN catalog byte-identical to the server DAILY_MISSIONS copy", () => {
    for (const mission of DAILY_MISSIONS) {
      expect(enGameMessages.missions.definitions[mission.id as KnownMissionId]).toEqual({
        title: mission.title,
        description: mission.description,
      });
    }
  });
});
