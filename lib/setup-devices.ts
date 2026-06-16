export type FirmwareRole = "client" | "repeater";

export type McuFamily = "esp32" | "nrf52840";

export type SetupDeviceId =
  | "heltec-v3"
  | "heltec-v4"
  | "rak-4631"
  | "heltec-t096"
  | "seeed-p1"
  | "t-1000e";

export type SetupDevice = {
  id: SetupDeviceId;
  name: string;
  mcu: McuFamily;
  supported: boolean;
  firmwarePatterns: Record<FirmwareRole, string[]>;
  firmwareFormat: "bin" | "zip";
  eraseAsset?: string;
  eraseRequired?: boolean;
  dfuHint: string;
};

const SETUP_DEVICES: SetupDevice[] = [
  {
    id: "heltec-v3",
    name: "Heltec V3",
    mcu: "esp32",
    supported: true,
    firmwareFormat: "bin",
    firmwarePatterns: {
      client: ["Heltec_v3_companion_radio_ble"],
      repeater: ["Heltec_v3_repeater"],
    },
    dfuHint: "Hold BOOT, tap RESET, then release BOOT to enter download mode if flashing fails.",
  },
  {
    id: "heltec-v4",
    name: "Heltec V4",
    mcu: "esp32",
    supported: true,
    firmwareFormat: "bin",
    firmwarePatterns: {
      client: ["heltec_v4_companion_radio_ble"],
      repeater: ["heltec_v4_repeater"],
    },
    dfuHint: "Hold BOOT, tap RESET, then release BOOT to enter download mode if flashing fails.",
  },
  {
    id: "rak-4631",
    name: "RAK WisBlock 4631",
    mcu: "nrf52840",
    supported: true,
    firmwareFormat: "zip",
    eraseAsset: "FLASH_ERASE_nrf52_softdevice_v6.zip",
    firmwarePatterns: {
      client: ["RAK_4631_companion_radio_ble"],
      repeater: ["RAK_4631_repeater"],
    },
    dfuHint: "Double-click the reset button to enter DFU mode if auto-touch fails. Select the TinyUSB or nRF serial port.",
  },
  {
    id: "heltec-t096",
    name: "Heltec Mesh Node T096",
    mcu: "nrf52840",
    supported: true,
    firmwareFormat: "zip",
    eraseAsset: "FLASH_ERASE_nrf52_softdevice_v6.zip",
    firmwarePatterns: {
      client: ["Heltec_t096_companion_radio_ble"],
      repeater: ["Heltec_t096_repeater"],
    },
    dfuHint: "Double-click the reset button to enter DFU mode if auto-touch fails. Select the TinyUSB or nRF serial port.",
  },
  {
    id: "seeed-p1",
    name: "Seeed SenseCAP Solar P1",
    mcu: "nrf52840",
    supported: true,
    firmwareFormat: "zip",
    eraseAsset: "FLASH_ERASE_nrf52_softdevice_v7.zip",
    eraseRequired: true,
    firmwarePatterns: {
      client: ["SenseCap_Solar_companion_radio_ble"],
      repeater: ["SenseCap_Solar_repeater"],
    },
    dfuHint: "Double-click reset to enter DFU mode. Flash erase is required before the first MeshCore install on this device.",
  },
  {
    id: "t-1000e",
    name: "Seeed T1000-E",
    mcu: "nrf52840",
    supported: true,
    firmwareFormat: "zip",
    eraseAsset: "FLASH_ERASE_nrf52_softdevice_v7.zip",
    eraseRequired: true,
    firmwarePatterns: {
      client: ["t1000e_companion_radio_ble"],
      repeater: ["t1000e_repeater"],
    },
    dfuHint: "Quickly disconnect and reconnect the magnetic cable twice to enter DFU mode. Flash erase is required before the first MeshCore install.",
  },
];

const DEVICE_BY_ID = new Map(SETUP_DEVICES.map((device) => [device.id, device]));

export function listSetupDevices(): SetupDevice[] {
  return SETUP_DEVICES;
}

export function listSupportedSetupDevices(): SetupDevice[] {
  return SETUP_DEVICES.filter((device) => device.supported);
}

export function getSetupDevice(id: string): SetupDevice | null {
  return DEVICE_BY_ID.get(id as SetupDeviceId) ?? null;
}

export function isSetupDeviceId(id: string): id is SetupDeviceId {
  return DEVICE_BY_ID.has(id as SetupDeviceId);
}

export const MESHCORE_FLASHER_FIRMWARE_BASE = "https://flasher.meshcore.io/firmware";

export function resolveEraseDownloadUrl(eraseAsset: string): string {
  return `${MESHCORE_FLASHER_FIRMWARE_BASE}/${encodeURIComponent(eraseAsset)}`;
}

export function isAllowedMeshCoreEraseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "flasher.meshcore.io" &&
      parsed.pathname.startsWith("/firmware/")
    );
  } catch {
    return false;
  }
}
