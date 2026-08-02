import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [
      {
        id: "1",
        title: "Registration Successful",
        message: "You registered successfully.",
        type: "success",
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ],
    unreadCount: 3,
    loading: false,
    error: null,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    refetch: vi.fn(),
  }),
}));

describe("NotificationBell", () => {
  it("shows unread count and opens the notification drawer", async () => {
    render(<NotificationBell />);

    expect(screen.getByText("3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /toggle notifications/i }));

    expect(await screen.findByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("You have 3 unread notifications.")).toBeInTheDocument();
  });
});
