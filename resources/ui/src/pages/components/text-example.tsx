import * as React from "react";
import Textarea from "@cloudscape-design/components/textarea";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import ColumnLayout from "@cloudscape-design/components/column-layout";

export default function TextExample() {
  const [value, setValue] = React.useState("");
  return (
    <Container header={<Header variant="h2">A text example</Header>}>
      <ColumnLayout columns={1} variant="text-grid">
        <Textarea
          onChange={({ detail }) => setValue(detail.value)}
          value={value}
          autoFocus
          placeholder="Example test"
          readOnly
          rows={0}
        />
      </ColumnLayout>
    </Container>
  );
}
