import Replicate from "replicate";

export const DEFAULT_REPLICATE_REMBG_MODEL =
  "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003";

type RemoveBackgroundInput = {
  sourceImageBytes: ArrayBuffer;
};

type ReplicateModelIdentifier = `${string}/${string}` | `${string}/${string}:${string}`;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function getSingleOutput(output: unknown): unknown {
  if (Array.isArray(output)) {
    return output[0];
  }

  return output;
}

function getReplicateModel(): ReplicateModelIdentifier {
  const model = process.env.REPLICATE_REMBG_MODEL?.trim() || DEFAULT_REPLICATE_REMBG_MODEL;
  if (!/^[^/\s]+\/[^:\s]+(?::[a-f0-9]+)?$/i.test(model)) {
    throw new Error(`Invalid REPLICATE_REMBG_MODEL value: ${model}`);
  }

  return model as ReplicateModelIdentifier;
}

async function outputToArrayBuffer(output: unknown): Promise<ArrayBuffer> {
  const fileOutput = getSingleOutput(output);

  if (!fileOutput) {
    throw new Error("Replicate returned an empty background-removal output.");
  }

  if (typeof fileOutput === "string") {
    const response = await fetch(fileOutput, {
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Could not download Replicate output (${response.status}): ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  if (fileOutput instanceof Blob) {
    return fileOutput.arrayBuffer();
  }

  if (fileOutput instanceof ArrayBuffer) {
    return fileOutput;
  }

  if (fileOutput instanceof Uint8Array) {
    const copy = new Uint8Array(fileOutput.byteLength);
    copy.set(fileOutput);
    return copy.buffer;
  }

  if (
    typeof fileOutput === "object" &&
    fileOutput !== null &&
    "blob" in fileOutput &&
    typeof fileOutput.blob === "function"
  ) {
    const blob = await fileOutput.blob();
    if (blob instanceof Blob) {
      return blob.arrayBuffer();
    }
  }

  if (
    typeof fileOutput === "object" &&
    fileOutput !== null &&
    "url" in fileOutput &&
    typeof fileOutput.url === "function"
  ) {
    const outputUrl = String(fileOutput.url());
    const response = await fetch(outputUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Could not download Replicate output (${response.status}): ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  if (fileOutput instanceof ReadableStream) {
    return new Response(fileOutput).arrayBuffer();
  }

  throw new Error(`Unsupported Replicate output type: ${typeof fileOutput}`);
}

export async function removeImageBackground(input: RemoveBackgroundInput): Promise<ArrayBuffer> {
  const provider = getRequiredEnv("BG_REMOVAL_PROVIDER");
  if (provider !== "replicate") {
    throw new Error(`Unsupported BG_REMOVAL_PROVIDER: ${provider}. Expected "replicate".`);
  }

  const model = getReplicateModel();
  const replicate = new Replicate({
    auth: getRequiredEnv("REPLICATE_API_TOKEN"),
  });

  console.log(`Background removal provider: ${provider}`);
  console.log(`Background removal model: ${model}`);

  const output = await replicate.run(model, {
    input: {
      image: Buffer.from(input.sourceImageBytes),
    },
  });

  return outputToArrayBuffer(output);
}
