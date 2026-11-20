import { render as testingLibraryRender } from "@testing-library/react";
import { DirectionProvider, MantineProvider } from "@mantine/core";
import { theme } from "@/app/theme";

export function render(ui: React.ReactNode) {
  return testingLibraryRender(<>{ui}</>, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <DirectionProvider detectDirection={true}>
        <MantineProvider env="test" theme={theme} withCssVariables>
          {children}
        </MantineProvider>
      </DirectionProvider>
    ),
  });
}

export * from "@testing-library/react";