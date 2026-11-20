import type { Meta, StoryObj } from "@storybook/nextjs";
import { CustomUIButton } from "./CustomUIButton";

const meta = {
  title: "Shared/Buttons/CustomUIButton",
  component: CustomUIButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    children: { control: "text" },
  },
} satisfies Meta<typeof CustomUIButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Gradient Action",
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled Button",
    disabled: true,
  },
};
