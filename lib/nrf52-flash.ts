import { enterDfuMode, performDfu } from "nrfutil-web";
import type { ProgressCallback, SerialPortLike } from "nrfutil-web";
import type { SetupDeviceId } from "@/lib/setup-devices";

export type NrfFlashProgress = {
  percent: number;
  message: string;
};

export type PortStatusCallback = (message: string) => void;

export class SerialPortSelectionRequiredError extends Error {
  readonly prompt: string;

  constructor(prompt: string) {
    super(prompt);
    this.name = "SerialPortSelectionRequiredError";
    this.prompt = prompt;
  }
}

type NavigatorWithSerial = Navigator & {
  serial: {
    requestPort: () => Promise<SerialPortLike>;
    getPorts: () => Promise<SerialPortLike[]>;
  };
};

type SerialPortWithConnection = SerialPortLike & {
  connected?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

type PortReadyOptions = {
  timeoutMs?: number;
  settleMs?: number;
  openAttempts?: number;
  openRetryDelayMs?: number;
  prompt?: string;
  onStatus?: PortStatusCallback;
};

const DFU_OPEN_BAUD_RATE = 115200;
const DEFAULT_CONNECT_TIMEOUT_MS = 8000;
const DEFAULT_SETTLE_MS = 500;
const DEFAULT_OPEN_ATTEMPTS = 8;
const DEFAULT_OPEN_RETRY_DELAY_MS = 750;
const DFU_TOUCH_WAIT_MS = 1500;

function getSerialApi(): NavigatorWithSerial["serial"] {
  if (!("serial" in navigator)) {
    throw new Error("Web Serial is not available in this browser.");
  }
  return (navigator as NavigatorWithSerial).serial;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isOpenFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to open serial port|open serial port/i.test(message);
}

function isPortConnected(port: SerialPortWithConnection): boolean {
  if (typeof port.connected === "boolean") {
    return port.connected;
  }
  return Boolean(port.readable || port.writable);
}

async function waitForPortConnect(port: SerialPortWithConnection, timeoutMs: number): Promise<void> {
  if (isPortConnected(port)) return;

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new SerialPortSelectionRequiredError("Timed out waiting for the serial port to reconnect."));
    }, timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      port.removeEventListener?.("connect", onConnect);
    };

    port.addEventListener?.("connect", onConnect);
  });
}

async function ensureSerialPortClosed(port: SerialPortLike): Promise<void> {
  if (!port.readable && !port.writable) return;
  try {
    await port.close();
  } catch {
    // Ignore close errors during handoff between flash stages.
  }
}

async function probePortOpen(port: SerialPortLike): Promise<boolean> {
  await ensureSerialPortClosed(port);
  try {
    await port.open({ baudRate: DFU_OPEN_BAUD_RATE });
    await ensureSerialPortClosed(port);
    return true;
  } catch {
    await ensureSerialPortClosed(port);
    return false;
  }
}

export async function waitForPortReady(
  port: SerialPortLike,
  options?: PortReadyOptions,
): Promise<SerialPortLike> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const settleMs = options?.settleMs ?? DEFAULT_SETTLE_MS;
  const openAttempts = options?.openAttempts ?? DEFAULT_OPEN_ATTEMPTS;
  const openRetryDelayMs = options?.openRetryDelayMs ?? DEFAULT_OPEN_RETRY_DELAY_MS;
  const prompt = options?.prompt ?? "Select the serial port to continue.";
  const onStatus = options?.onStatus;

  const connectionAwarePort = port as SerialPortWithConnection;
  await ensureSerialPortClosed(connectionAwarePort);
  await waitForPortConnect(connectionAwarePort, timeoutMs);

  if (settleMs > 0) {
    await sleep(settleMs);
  }

  onStatus?.("Waiting for DFU port to become ready…");

  for (let attempt = 1; attempt <= openAttempts; attempt++) {
    if (await probePortOpen(connectionAwarePort)) {
      return connectionAwarePort;
    }

    if (attempt < openAttempts) {
      await sleep(openRetryDelayMs);
    }
  }

  throw new SerialPortSelectionRequiredError(prompt);
}

export async function getGrantedSerialPorts(): Promise<SerialPortLike[]> {
  return getSerialApi().getPorts();
}

function orderGrantedPorts(
  granted: SerialPortLike[],
  preferredPort?: SerialPortLike | null,
): SerialPortLike[] {
  if (!preferredPort) return granted;
  const others = granted.filter((port) => port !== preferredPort);
  return granted.includes(preferredPort) ? [preferredPort, ...others] : granted;
}

async function tryReadyPort(
  port: SerialPortLike,
  options: PortReadyOptions,
): Promise<SerialPortLike | null> {
  try {
    return await waitForPortReady(port, options);
  } catch (err) {
    if (err instanceof SerialPortSelectionRequiredError) {
      return null;
    }
    throw err;
  }
}

async function tryGrantedPorts(
  granted: SerialPortLike[],
  options: PortReadyOptions,
  preferredPort?: SerialPortLike | null,
): Promise<SerialPortLike | null> {
  for (const port of orderGrantedPorts(granted, preferredPort)) {
    const readyPort = await tryReadyPort(port, options);
    if (readyPort) return readyPort;
  }
  return null;
}

export async function reconnectSerialPort(
  preferredPort: SerialPortLike | null | undefined,
  options?: PortReadyOptions,
): Promise<SerialPortLike> {
  const prompt = options?.prompt ?? "Select the serial port to continue.";

  if (!preferredPort) {
    throw new SerialPortSelectionRequiredError(prompt);
  }

  const granted = await getGrantedSerialPorts();
  if (!granted.includes(preferredPort)) {
    throw new SerialPortSelectionRequiredError(prompt);
  }

  return waitForPortReady(preferredPort, { ...options, prompt });
}

export async function acquireSerialPort(options: {
  prompt: string;
  preferredPort?: SerialPortLike | null;
  timeoutMs?: number;
  onStatus?: PortStatusCallback;
}): Promise<SerialPortLike> {
  if (options.preferredPort) {
    return reconnectSerialPort(options.preferredPort, {
      timeoutMs: options.timeoutMs,
      prompt: options.prompt,
      onStatus: options.onStatus,
    });
  }

  return getSerialApi().requestPort();
}

export async function acquireReadySerialPort(options: {
  prompt: string;
  preferredPort?: SerialPortLike | null;
  appPortFallback?: SerialPortLike | null;
  timeoutMs?: number;
  onStatus?: PortStatusCallback;
}): Promise<SerialPortLike> {
  const readyOptions: PortReadyOptions = {
    timeoutMs: options.timeoutMs,
    prompt: options.prompt,
    onStatus: options.onStatus,
  };

  const attemptAcquire = async (): Promise<SerialPortLike | null> => {
    if (options.preferredPort) {
      const preferredReady = await tryReadyPort(options.preferredPort, readyOptions);
      if (preferredReady) return preferredReady;
    }

    const granted = await getGrantedSerialPorts();
    return tryGrantedPorts(granted, readyOptions, options.preferredPort);
  };

  let readyPort = await attemptAcquire();
  if (readyPort) return readyPort;

  if (options.appPortFallback) {
    const granted = await getGrantedSerialPorts();
    if (granted.includes(options.appPortFallback)) {
      options.onStatus?.("Re-entering DFU mode from application port…");
      try {
        await enterNrfDfu(options.appPortFallback);
      } finally {
        await closeSerialPort(options.appPortFallback);
      }
      await sleep(DFU_TOUCH_WAIT_MS);
      readyPort = await attemptAcquire();
      if (readyPort) return readyPort;
    }
  }

  throw new SerialPortSelectionRequiredError(options.prompt);
}

export async function enterNrfDfu(port: SerialPortLike): Promise<void> {
  await ensureSerialPortClosed(port);
  await enterDfuMode(port);
}

export async function flashNrfPackage(
  port: SerialPortLike,
  zipData: ArrayBuffer,
  onProgress?: (progress: NrfFlashProgress) => void,
  options?: { onStatus?: PortStatusCallback; prompt?: string },
): Promise<void> {
  const progressCallback: ProgressCallback = ({ percent, message }) => {
    onProgress?.({ percent, message });
  };

  const prompt = options?.prompt ?? "Select the DFU / TinyUSB serial port to continue.";
  const onStatus = options?.onStatus;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await ensureSerialPortClosed(port);

    try {
      await performDfu(port, zipData, {
        singleBank: true,
        onProgress: progressCallback,
      });
      return;
    } catch (err) {
      if (!isOpenFailure(err) || attempt === maxAttempts) {
        throw err;
      }

      onStatus?.("Waiting for DFU port to become ready…");
      try {
        await waitForPortReady(port, { prompt, onStatus });
      } catch (readyErr) {
        if (readyErr instanceof SerialPortSelectionRequiredError) {
          throw readyErr;
        }
        throw err;
      }
    }
  }
}

export async function fetchErasePackage(deviceId: SetupDeviceId): Promise<ArrayBuffer> {
  const response = await fetch(`/api/meshcore/erase?device=${encodeURIComponent(deviceId)}`);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Erase download failed (${response.status}).`);
  }
  return response.arrayBuffer();
}

export async function openSerialPort(): Promise<SerialPortLike> {
  return getSerialApi().requestPort();
}

export async function closeSerialPort(port: SerialPortLike | null | undefined): Promise<void> {
  if (!port) return;
  await ensureSerialPortClosed(port);
}
