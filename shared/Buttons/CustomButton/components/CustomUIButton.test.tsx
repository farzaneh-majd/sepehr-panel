import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { CustomUIButton } from "./CustomUIButton";
import { theme } from "@/app/theme";

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider theme={theme}>{ui}</MantineProvider>);
};

describe("CustomUIButton", () => {
  it("renders the button with correct text", () => {
    renderWithProvider(<CustomUIButton>Click Me</CustomUIButton>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("applies the custom CSS class", () => {
    renderWithProvider(<CustomUIButton>Test Style</CustomUIButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass(/primaryButton/i);
  });
});
