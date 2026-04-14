import { ensureMeasurerStyles } from "./style-inject";
import { MESURER_STYLES } from "./styles.generated";

ensureMeasurerStyles(MESURER_STYLES);

export { default as Measurer } from "./measurer";
