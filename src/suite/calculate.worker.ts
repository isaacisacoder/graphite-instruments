import { calculate } from "./engine";
import type { ToolResult } from "./numeric";
export interface CalculationRequest {
  id: string;
  tool: string;
  operation: string;
  fields: Record<string, string>;
}
export interface CalculationResponse {
  id: string;
  result?: ToolResult;
  error?: string;
}
self.onmessage = async (event: MessageEvent<CalculationRequest>) => {
  const { id, tool, operation, fields } = event.data;
  try {
    const result = await calculate(tool, operation, fields);
    self.postMessage({ id, result } satisfies CalculationResponse);
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : "Unable to calculate",
    } satisfies CalculationResponse);
  }
};
