import { diffString } from "json-diff";

type DiffStruct = {
  generatedJson: JSON;
  originalJson: JSON;
};

export function validateAllKeysMatch({
  generatedJson,
  originalJson,
}: DiffStruct) {
  const difference = diffString(originalJson, generatedJson, {
    keysOnly: true,
  });
  if (!difference) {
    return true;
  }
  return false;
}
