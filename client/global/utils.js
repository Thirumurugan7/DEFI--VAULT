import { Buffer } from "buffer";
export function feltToString(felt) {
  const newStrB = Buffer.from(felt.toString(16), "hex");
  return newStrB.toString();
}
export function stringToFelt(str) {
  return "0x" + Buffer.from(str).toString("hex");
}

export function toBN(value) {
  try {
    return BigInt(value);
  } catch (e) {
    console.error("Invalid input for toBN:", value);
    throw e;
  }
}
