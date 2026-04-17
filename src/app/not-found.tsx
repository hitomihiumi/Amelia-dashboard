import { Background, Button, Column, Flex, Heading, Row, Text } from "@once-ui-system/core";

export default function NotFound() {
  return (
    <Column as="section" fill center>
      <Column radius={"xl"} overflow={"hidden"} minWidth={"m"}>
        <Background
          fill
          gradient={{
            display: true,
            opacity: 100,
            x: 50,
            y: 0,
            colorStart: "accent-background-strong",
            colorEnd: "static-transparent",
          }}
          position={"absolute"}
        />
        <Background
          fill
          dots={{
            display: true,
            opacity: 60,
            size: "8",
            color: "brand-background-strong",
          }}
          position={"absolute"}
        />
        <Column zIndex={"9"} padding={"xl"}>
          <Text marginBottom="s" variant="display-strong-xl">
            404
          </Text>
          <Heading marginBottom="xs" variant="display-default-xs">
            Page Not Found
          </Heading>
          <Text onBackground="neutral-weak" marginBottom="m">
            The page you are looking for does not exist.
          </Text>
          <Button href={"/"}>Back to Home</Button>
        </Column>
      </Column>
    </Column>
  );
}
