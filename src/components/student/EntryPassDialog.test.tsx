import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EntryPassDialog } from "./EntryPassDialog";
import "@testing-library/jest-dom/vitest";

describe("EntryPassDialog", () => {
  it("renders the event pass details", () => {
    render(
      <EntryPassDialog
        open
        onClose={() => undefined}
        registrationId="reg-123"
        eventId="event-123"
        eventTitle="Design Sprint"
        eventDate="2026-08-10T10:00:00.000Z"
        eventVenue="Innovation Hall"
      />
    );

    expect(screen.getByText("ENTRY PASS")).toBeInTheDocument();
    expect(screen.getByText("Design Sprint")).toBeInTheDocument();
    expect(screen.getByText("Innovation Hall")).toBeInTheDocument();
  });
});
