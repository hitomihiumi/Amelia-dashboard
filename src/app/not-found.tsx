import { Column } from "@once-ui-system/core";
import { NotFoundCapsule } from "@/components/layout/NotFoundCapsule";

export default function NotFound() {
  return (
    <Column as="section" fill center paddingX={'s'}>
        <NotFoundCapsule/>
    </Column>
  );
}
