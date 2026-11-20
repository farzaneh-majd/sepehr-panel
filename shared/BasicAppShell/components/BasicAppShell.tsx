"use client";
import React from "react";
import { AppShell, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

interface Props {
  children: React.ReactNode;
}

const BasicAppShell = ({ children }: Props) => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      padding="md"
      header={{ height: 54 }}
      navbar={{
        width: 316,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      styles={{
        main: {
          backgroundColor: "var(--mantine-color-gray-0)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
      }}
      withBorder
    >
      <AppShell.Header px="md">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
      </AppShell.Header>

      <AppShell.Main
        pl={35}
        pt={80}
        pr={335}
        pb={30}
        style={{
          height: "100vh",
          overflowY: "auto",
        }}
        className="custom-scroll"
      >
        {children}
      </AppShell.Main>

      <AppShell.Navbar>
        <AppShell.Section grow></AppShell.Section>
      </AppShell.Navbar>
    </AppShell>
  );
};

export default BasicAppShell;
