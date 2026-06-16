import { enterDfuMode, performDfu } from "nrfutil-web";
import type { ProgressCallback, SerialPortLike } from "nrfutil-web";
import type { SetupDeviceId } from "@/lib/setup-devices";

export type NrfFlashProgress = {
  percent: number;
  message: string;
};

type NavigatorWithSerial = Navigator & {
  serial: {
    requestPort: () => Promise<SerialPortLike>;
  };
};

export async function enterNrfDfu(port: SerialPortLike): Promise<void> {
  await enterDfuMode(port);
}

export async function flashNrfPackage(
  port: SerialPortLike,
  zipData: ArrayBuffer,
  onProgress?: (progress: NrfFlashProgress) => void,
): Promise<void> {
  const progressCallback: ProgressCallback = ({ percent, message }) => {
    onProgress?.({ percent, message });
  };

  await performDfu(port, zipData, {
    singleBank: true,
    onProgress: progressCallback,
  });
}

export async function fetchErasePackage(deviceId: SetupDeviceId): Promise<ArrayBuffer> {
  const response = await fetch(`/api/meshcore/erase?device=${encodeURIComponent(deviceId)}`);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Erase download failed (${response.status}).`);
  }
  return response.arrayBuffer();
}

export async function openSerialPort(baudRate = 115200): Promise<SerialPortLike> {
  if (!("serial" in navigator)) {
    throw new Error("Web Serial is not available in this browser.");
  }

  const port = await (navigator as NavigatorWithSerial).serial.requestPort();
  if (!port.readable) {
    await port.open({ baudRate });
  }
  return port;
}

export async function closeSerialPort(port: SerialPortLike | null | undefined): Promise<void> {
  if (!port) return;
  try {
    if (port.readable || port.writable) {
      await port.close();
    }
  } catch {
    // Ignore close errors during handoff between flash stages.
  }
}
