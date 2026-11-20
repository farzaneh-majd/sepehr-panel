import { Button } from "@mantine/core";
import styles from "./CustomUIButton.module.css";
import { CustomUIButtonProps } from "../types/type";


export function CustomUIButton({ children, ...props }: CustomUIButtonProps) {
  return (
    <Button {...props} classNames={{ root: styles.primaryButton }}>
      {children}
    </Button>
  );
}
