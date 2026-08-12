import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthPage from "./AuthPage";
import { useTradingStore } from "@/store/tradingStore";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function submitSignupForm() {
  const submitButton = screen
    .getAllByRole("button", { name: /Criar Conta/ })
    .find((button) => button.getAttribute("type") === "submit");
  fireEvent.click(submitButton!);
}

describe("AuthPage pt-BR", () => {
  beforeEach(() => {
    useTradingStore.setState({ gameLocale: "pt-BR" });
  });

  afterEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("renders signup labels and placeholders in Portuguese", () => {
    render(<AuthPage mode="signup" />);

    expect(screen.getByText("Crie sua conta grátis")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Seu apelido")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("seu@email.com")).toBeInTheDocument();
    expect(screen.getByText("Confirmar Senha")).toBeInTheDocument();
    expect(screen.getByText("Continuar como Convidado (Demo)")).toBeInTheDocument();
  });

  it("shows validateAuthForm errors in Portuguese", () => {
    render(<AuthPage mode="signup" />);

    submitSignupForm();

    expect(
      screen.getByText("O nome de usuário precisa ter pelo menos 3 caracteres")
    ).toBeInTheDocument();
  });
});
