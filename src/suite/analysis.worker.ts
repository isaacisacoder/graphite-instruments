import { analyze, type AnalysisRequest } from "./analysis";
self.onmessage = (e: MessageEvent<AnalysisRequest>) => {
  try {
    self.postMessage({ id: e.data.id, result: analyze(e.data) });
  } catch (error) {
    self.postMessage({
      id: e.data.id,
      error: error instanceof Error ? error.message : "Analysis failed",
    });
  }
};
