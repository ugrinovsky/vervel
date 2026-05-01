/** Минимальные поля payload/tooltip Recharts без `any`. */
export type RechartsTooltipPayloadEntry = {
  name?: string;
  value?: string | number;
  color?: string;
  fill?: string;
  stroke?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
};

export type RechartsTooltipContentProps = {
  active?: boolean;
  label?: string | number;
  payload?: RechartsTooltipPayloadEntry[];
};
