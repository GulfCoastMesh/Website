"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Wifi,
  Smartphone,
  Usb,
  Loader2,
  RefreshCw,
  CheckCircle,
  ChevronLeft,
  AlertTriangle,
  MapPin,
  Cpu,
  Zap,
  Maximize2,
  Terminal as TerminalIcon,
  X,
  Sparkles,
  Copy,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import {
  FirmwareVersionPicker,
  resolvePickerFirmwareVersion,
} from '@/components/setup-firmware-version';
import type { FirmwareRole } from '@/lib/meshcore-firmware';
import { extractPrefix, isUsablePrefix } from '@/lib/meshbuddy';
import { generateIdentityKeypair, parsePublicKeyFromSerial } from '@/lib/meshcore-identity';
import { getSetupDevice, listSupportedSetupDevices, type SetupDeviceId } from '@/lib/setup-devices';
import {
  closeSerialPort,
  enterNrfDfu,
  fetchErasePackage,
  flashNrfPackage,
  openSerialPort,
} from '@/lib/nrf52-flash';

// Real flashing dependencies (dynamic import to avoid SSR issues if any, but "use client" handles it)
import { ESPLoader, Transport } from 'esptool-js';
import type { FlashOptions } from 'esptool-js';

// ==========================================
// SERIAL SUPPORT DETECTION (SSR-SAFE)
// ==========================================
type SerialSupportState = 'checking' | 'supported' | 'insecure' | 'unsupported';

const subscribeNoop = () => () => {
  /* no external subscription — value never changes after mount */
};

function getSerialSupportSnapshot(): SerialSupportState {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'checking';
  if ('serial' in navigator) return 'supported';
  if (!window.isSecureContext) return 'insecure';
  return 'unsupported';
}

function getServerSerialSupportSnapshot(): SerialSupportState {
  return 'checking';
}

// ==========================================
// BROWSER DETECTION (best-effort, used only to tailor the "not supported" copy)
// ==========================================
type BrowserKind = 'unknown' | 'firefox' | 'safari' | 'ios' | 'chromium';

function getBrowserKindSnapshot(): BrowserKind {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  // iOS first — every iOS browser uses WebKit and cannot ship Web Serial,
  // including Chrome / Edge / Brave / Firefox on iOS.
  const platform = (navigator as Navigator & { platform?: string }).platform ?? '';
  const maxTouch = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouch > 1);
  if (isIOS) return 'ios';
  if (/Firefox\//.test(ua) && !/Seamonkey/.test(ua)) return 'firefox';
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Brave/.test(ua)) return 'safari';
  if (/Chrome|Chromium|Edg|OPR|Brave/.test(ua)) return 'chromium';
  return 'unknown';
}

function getServerBrowserKindSnapshot(): BrowserKind {
  return 'unknown';
}

// Flip to false to show a placeholder instead of the in-browser setup wizard.
const SETUP_WIZARD_ENABLED = true;

const MAX_IDENTITY_ATTEMPTS = 15;
const DEFAULT_REPEATER_LAT = 30.3;
const DEFAULT_REPEATER_LON = -91.2;
const REPEATER_SPREADING_FACTOR = 7;
const DEFAULT_REPEATER_CODING_RATE = 6;

function SetupComingSoon() {
  return (
    <div className="container pb-24">
      <p className="py-24 text-center font-display text-2xl font-semibold text-ink-900 dark:text-white">
        Coming soon™
      </p>
    </div>
  );
}

// ==========================================
// WIZARD UI COMPONENT
// ==========================================

function SetupWizard() {
  type SerialCommandSpec = {
    command: string;
    fallbackCommands?: string[];
    timeoutMs?: number;
    retries?: number;
    allowTimeout?: boolean;
    requireReply?: boolean;
    expectedResponseParts?: string[];
  };

  type SerialCommandResult = {
    lines: string[];
    timedOut: boolean;
  };

  const [step, setStep] = useState('intro');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<SetupDeviceId | ''>('');
  const [nrfEraseBeforeFlash, setNrfEraseBeforeFlash] = useState(true);
  const [flashProgress, setFlashProgress] = useState(0);
  const [settingsProgress, setSettingsProgress] = useState({ current: 0, total: 0, label: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapZoom, setMapZoom] = useState(5);
  const [mapCenter, setMapCenter] = useState({ lat: 30.3, lon: -91.2 });
  const [isMapDragging, setIsMapDragging] = useState(false);

  // Serial API state (UI only)
  // Computed via useSyncExternalStore so we can derive the value on the client without
  // calling setState inside an effect (React 19 / react-hooks/set-state-in-effect).
  const serialSupport = useSyncExternalStore<SerialSupportState>(
    subscribeNoop,
    getSerialSupportSnapshot,
    getServerSerialSupportSnapshot,
  );
  const browserKind = useSyncExternalStore<BrowserKind>(
    subscribeNoop,
    getBrowserKindSnapshot,
    getServerBrowserKindSnapshot,
  );
  const [serialStatus, setSerialStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [copiedUrl, setCopiedUrl] = useState(false);

  type FirmwareVersionPrefs = {
    versions: string[];
    latest: string | null;
    loading: boolean;
    error: string;
    useLatest: boolean;
    selectedVersion: string;
  };

  const emptyFirmwarePrefs = (): FirmwareVersionPrefs => ({
    versions: [],
    latest: null,
    loading: false,
    error: '',
    useLatest: true,
    selectedVersion: '',
  });

  const [clientFirmware, setClientFirmware] = useState<FirmwareVersionPrefs>(emptyFirmwarePrefs);
  const [repeaterFirmware, setRepeaterFirmware] = useState<FirmwareVersionPrefs>(emptyFirmwarePrefs);

  // Hardware Refs (for actual logic)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const portRef = useRef<any>(null);
  const transportRef = useRef<Transport | null>(null);
  const esploaderRef = useRef<ESPLoader | null>(null);

  // Terminal state
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalLogsRef = useRef<string[]>([]);
  const pendingTerminalLogsRef = useRef<string[]>([]);
  const terminalFlushScheduledRef = useRef<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const showTerminalRef = useRef(false);
  const lastFlashProgressUpdateRef = useRef(0);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const keepReading = useRef<boolean>(true);
  const backgroundReaderRunningRef = useRef<boolean>(false);
  const mapDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCenter: { lat: number; lon: number };
    moved: boolean;
  } | null>(null);
  const mapWheelRef = useRef({ delta: 0, lastZoomAt: 0 });

  // Repeater specific state
  const [repeaterConfig, setRepeaterConfig] = useState({
    name: '',
    locationSet: false,
    locX: 50,
    locY: 50,
    lat: 36.5,
    lon: -95.5,
    height: '',
    email: '',
    password: '',
    codingRate: String(DEFAULT_REPEATER_CODING_RATE),
  });
  const [reservedPrefix, setReservedPrefix] = useState<string | null>(null);
  const [reservedPublicKey, setReservedPublicKey] = useState<string | null>(null);

  const loadFirmwareVersions = async (role: FirmwareRole) => {
    const setter = role === 'client' ? setClientFirmware : setRepeaterFirmware;
    setter((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const response = await fetch(`/api/meshcore/releases?role=${role}`);
      const data = (await response.json()) as {
        latest?: string | null;
        versions?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load MeshCore releases.');
      }

      setter((prev) => ({
        ...prev,
        loading: false,
        versions: data.versions ?? [],
        latest: data.latest ?? null,
        selectedVersion: data.latest ?? prev.selectedVersion,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load MeshCore releases.';
      setter((prev) => ({ ...prev, loading: false, error: message }));
    }
  };

  useEffect(() => {
    if (step === 'client_select_device' && clientFirmware.versions.length === 0 && !clientFirmware.loading) {
      void loadFirmwareVersions('client');
    }
    if (step === 'repeater_select_device' && repeaterFirmware.versions.length === 0 && !repeaterFirmware.loading) {
      void loadFirmwareVersions('repeater');
    }
  }, [step, clientFirmware.loading, clientFirmware.versions.length, repeaterFirmware.loading, repeaterFirmware.versions.length]);

  const getActiveFirmwarePrefs = (role: FirmwareRole) => (role === 'client' ? clientFirmware : repeaterFirmware);

  const getResolvedFirmwareVersion = (role: FirmwareRole) => {
    const prefs = getActiveFirmwarePrefs(role);
    return resolvePickerFirmwareVersion({
      useLatest: prefs.useLatest,
      latestVersion: prefs.latest,
      selectedVersion: prefs.selectedVersion,
    });
  };

  const renderFirmwareVersionPicker = (role: FirmwareRole) => {
    const prefs = getActiveFirmwarePrefs(role);
    const setter = role === 'client' ? setClientFirmware : setRepeaterFirmware;

    return (
      <FirmwareVersionPicker
        versions={prefs.versions}
        latestVersion={prefs.latest}
        loading={prefs.loading}
        error={prefs.error}
        useLatest={prefs.useLatest}
        selectedVersion={prefs.selectedVersion}
        onUseLatestChange={(useLatest) => setter((prev) => ({ ...prev, useLatest }))}
        onSelectedVersionChange={(selectedVersion) =>
          setter((prev) => ({ ...prev, selectedVersion, useLatest: false }))
        }
      />
    );
  };

  useEffect(() => {
    if (!isMapDragging) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [isMapDragging]);

  useEffect(() => {
    showTerminalRef.current = showTerminal;
    if (showTerminal) {
      setTerminalLogs([...terminalLogsRef.current]);
    }
  }, [showTerminal]);

  // Update real logs state from ref
  const addLog = (msg: string) => {
    terminalLogsRef.current = [...terminalLogsRef.current, msg].slice(-200);

    // Avoid re-rendering the whole wizard on every bootloader line while the terminal is closed.
    if (!showTerminalRef.current) return;
    if (terminalFlushScheduledRef.current) return;

    terminalFlushScheduledRef.current = true;
    window.setTimeout(() => {
      terminalFlushScheduledRef.current = false;
      setTerminalLogs([...terminalLogsRef.current]);
    }, 100);
  };

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const yieldToMain = () =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0);
    });

  const waitForReaderRelease = async () => {
    let waitCount = 0;
    while (readerRef.current !== null && waitCount < 40) {
      await sleep(50);
      waitCount++;
    }
    await sleep(100);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const waitForReadableUnlock = async (selectedPort: any, timeoutMs = 2500) => {
    const startedAt = Date.now();

    while (selectedPort?.readable?.locked) {
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error("Serial stream is still locked by another reader.");
      }
      await sleep(50);
    }
  };

  const stopBackgroundReader = async () => {
    keepReading.current = false;

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.error("Reader cancel error:", e);
      }
    }

    await waitForReaderRelease();
  };

  // Scroll to bottom of terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [terminalLogs]);

  // Web Serial Connection Logic
  const handleConnectSerial = async () => {
    if (!('serial' in navigator)) return;

    setSerialStatus('connecting');
    try {
      // @ts-expect-error -- typescript might not have navigator.serial
      const selectedPort = await navigator.serial.requestPort();

      // Guard: If the port is already open (e.g. from a previous successful connection), 
      // check readable/writable before attempting to open it again.
      if (!selectedPort.readable) {
        await selectedPort.open({ baudRate: 115200 });
      }

      portRef.current = selectedPort;
      setSerialStatus('connected');

      // Initialize transport for ESPTool
      const transport = new Transport(selectedPort);
      transportRef.current = transport;

      addLog("[SYSTEM] Port connected successfully.\n");
      startReading(selectedPort);
    } catch (err) {
      console.error('Serial connection failed:', err);
      setSerialStatus('error');
      addLog(`[ERROR] Connection failed: ${err}\n`);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startReading = async (selectedPort: any) => {
    if (backgroundReaderRunningRef.current) return;

    backgroundReaderRunningRef.current = true;
    keepReading.current = true;
    try {
      while (selectedPort.readable && keepReading.current) {
        if (selectedPort.readable.locked) {
          await sleep(50);
          continue;
        }

        const reader = selectedPort.readable.getReader();
        readerRef.current = reader;
        try {
          while (keepReading.current) {
            const { value, done } = await reader.read();
            if (done) break;
            const decoded = new TextDecoder().decode(value);
            addLog(decoded);
          }
        } catch (err) {
          console.error("Serial read error:", err);
          break;
        } finally {
          reader.releaseLock();
          readerRef.current = null;
        }
      }
    } finally {
      backgroundReaderRunningRef.current = false;
    }
  };

  const handleSendTestPacket = async () => {
    const port = portRef.current;
    if (!port || !port.writable) return;

    const writer = port.writable.getWriter();
    const data = new TextEncoder().encode("LMESH_TEST_PACKET\n");

    try {
      await writer.write(data);
      addLog("[DEBUG] Sent test packet: LMESH_TEST_PACKET\n");
    } catch (err) {
      console.error("Failed to send data:", err);
      addLog(`[ERROR] Send failed: ${err}\n`);
    } finally {
      writer.releaseLock();
    }
  };

  const handleDebugBypassFlash = (type: 'client' | 'repeater') => {
    if (isProcessing) return;

    setErrorMsg('');
    setFlashProgress(100);
    addLog(`[DEBUG] Flash bypass enabled for ${type}. Skipping firmware write.\n`);
    goTo(type === 'client' ? 'client_restart' : 'repeater_restart');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writeSerialLine = async (selectedPort: any, line: string) => {
    if (!selectedPort?.writable) throw new Error("Serial port is not writable.");

    const writer = selectedPort.writable.getWriter();
    try {
      const data = new TextEncoder().encode(`${line}\r\n`);
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeSerialCli = async (selectedPort: any) => {
    addLog("[CMD] Waking MeshCore serial CLI...\n");
    await writeSerialLine(selectedPort, "ver");
    await readSerialResponse(selectedPort, 1500);
    await sleep(500);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readSerialResponse = async (selectedPort: any, timeoutMs = 2200): Promise<SerialCommandResult> => {
    if (!selectedPort?.readable) throw new Error("Serial port is not readable.");

    await waitForReadableUnlock(selectedPort);
    const reader = selectedPort.readable.getReader();
    readerRef.current = reader;

    let timedOut = false;
    let buffer = '';
    const lines: string[] = [];

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      reader.cancel().catch(() => { });
    }, timeoutMs);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        const decoded = new TextDecoder().decode(value);
        addLog(decoded);
        buffer += decoded;

        let newlineIdx = buffer.indexOf('\n');
        while (newlineIdx !== -1) {
          const line = buffer.slice(0, newlineIdx).replace(/\r/g, '').trim();
          if (line.length > 0) lines.push(line);
          buffer = buffer.slice(newlineIdx + 1);
          newlineIdx = buffer.indexOf('\n');
        }
      }
    } catch (err) {
      if (!timedOut) {
        throw err;
      }
    } finally {
      clearTimeout(timeoutId);
      reader.releaseLock();
      readerRef.current = null;
      const danglingLine = buffer.replace(/\r/g, '').trim();
      if (danglingLine.length > 0) lines.push(danglingLine);
    }

    return { lines, timedOut };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runSerialCommand = async (selectedPort: any, spec: SerialCommandSpec) => {
    const retries = spec.retries ?? 3;
    const timeoutMs = spec.timeoutMs ?? 2200;
    const requireReply = spec.requireReply ?? !spec.allowTimeout;
    const commandVariants = [spec.command, ...(spec.fallbackCommands ?? [])];
    let lastError: unknown = null;

    const getCurrentCommandResponse = (lines: string[], command: string) => {
      const echoIndex = lines.map((line) => line.trim()).lastIndexOf(command);
      return echoIndex >= 0 ? lines.slice(echoIndex) : lines;
    };

    for (const command of commandVariants) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          addLog(`[CMD] > ${command}\n`);
          await writeSerialLine(selectedPort, command);

          const response = await readSerialResponse(selectedPort, timeoutMs);
          const combinedResponse = response.lines.join(' | ');
          const relevantLines = getCurrentCommandResponse(response.lines, command);
          const relevantResponse = relevantLines.join(' | ');
          if (combinedResponse.length > 0) {
            addLog(`[CMD] < ${combinedResponse}\n`);
          }

          if (!requireReply && response.lines.length === 0) {
            lastError = new Error(`No reply received for "${command}"`);
            if (attempt < retries) {
              addLog(`[CMD] No reply; resending ${command} (${attempt + 1}/${retries})...\n`);
              await sleep(300);
              continue;
            }
            break;
          }

          if (requireReply && response.lines.length === 0) {
            throw new Error(`No reply received for "${command}"`);
          }

          const expectedResponseMatched = spec.expectedResponseParts?.every((part) => relevantResponse.includes(part)) ?? false;
          if (spec.expectedResponseParts) {
            if (expectedResponseMatched) {
              return;
            }

            throw new Error(`Unexpected response for "${command}": ${relevantResponse || combinedResponse}`);
          }

          if (/error|failed|invalid|unknown command/i.test(relevantResponse)) {
            throw new Error(`Device returned error for "${command}": ${relevantResponse}`);
          }

          if (/\bOK\b/i.test(relevantResponse)) {
            return;
          }

          if (response.timedOut && !spec.allowTimeout) {
            throw new Error(`Timed out waiting for response to "${command}"`);
          }

          return;
        } catch (err) {
          lastError = err;
          if (attempt < retries) {
            addLog(`[CMD] No valid reply; resending ${command} (${attempt + 1}/${retries})...\n`);
            await sleep(300);
          }
        }
      }

      if (commandVariants.length > 1) {
        addLog(`[CMD] Trying alternate command syntax after ${command} did not work.\n`);
      }
    }

    if (spec.allowTimeout && !requireReply) {
      addLog(`[CMD] Continuing after no reply from ${spec.command}; next command will verify state.\n`);
      return;
    }

    if (lastError) {
      throw lastError;
    }
  };

  const buildRepeaterSerialCommands = (): SerialCommandSpec[] => {
    const commands: SerialCommandSpec[] = [];

    const repeaterName = repeaterConfig.name.trim();
    if (repeaterName) {
      commands.push({ command: `set name ${repeaterName}`, timeoutMs: 3000, retries: 3, allowTimeout: true, requireReply: false });
      commands.push({ command: "get name", timeoutMs: 3000, retries: 3, expectedResponseParts: [repeaterName] });
    }

    const adminPassword = repeaterConfig.password.trim();
    if (adminPassword) {
      commands.push({ command: `password ${adminPassword}`, timeoutMs: 3000, retries: 3, allowTimeout: true, requireReply: false });
    }

    if (repeaterConfig.locationSet) {
      commands.push({ command: `set lat ${repeaterConfig.lat.toFixed(6)}`, timeoutMs: 3000, retries: 3, allowTimeout: true, requireReply: false });
      commands.push({ command: `set lon ${repeaterConfig.lon.toFixed(6)}`, timeoutMs: 3000, retries: 3, allowTimeout: true, requireReply: false });
    }

    return commands;
  };

  const getRepeaterCommandLabel = (command: string) => {
    if (command === "reboot") return "Rebooting repeater";
    if (command === "get public.key") return "Reading public key";
    if (command.startsWith("set prv.key")) return "Programming identity key";
    if (command.startsWith("set name")) return "Setting node name";
    if (command === "get name") return "Verifying node name";
    if (command.startsWith("password")) return "Setting admin password";
    if (command.startsWith("set lat")) return "Setting latitude";
    if (command.startsWith("set lon")) return "Setting longitude";
    return "Sending repeater setting";
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchPublicKeyFromDevice = async (selectedPort: any) => {
    addLog("[CMD] > get public.key\n");
    await writeSerialLine(selectedPort, "get public.key");
    const response = await readSerialResponse(selectedPort, 3500);
    if (response.lines.length > 0) {
      addLog(`[CMD] < ${response.lines.join(" | ")}\n`);
    }
    return parsePublicKeyFromSerial(response.lines);
  };

  const fetchPrefixAvailability = async (prefix: string) => {
    const response = await fetch(`/api/meshbuddy/prefix/${encodeURIComponent(prefix)}`);
    const data = (await response.json()) as {
      available?: boolean;
      reason?: string;
      message?: string;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error || "MeshBuddy prefix check failed.");
    }
    return data;
  };

  const submitPrefixReservation = async (prefix: string) => {
    const email = repeaterConfig.email.trim();
    const name = repeaterConfig.name.trim() || `GCM-${prefix}`;
    const lat = repeaterConfig.locationSet ? repeaterConfig.lat : DEFAULT_REPEATER_LAT;
    const lon = repeaterConfig.locationSet ? repeaterConfig.lon : DEFAULT_REPEATER_LON;
    const altitude = Number(repeaterConfig.height);
    const response = await fetch("/api/meshbuddy/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix,
        name,
        email,
        lat,
        lon,
        altitude: Number.isFinite(altitude) ? altitude : 0,
        source: "setup-wizard",
      }),
    });
    const data = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      const error = new Error(data.error || "MeshBuddy reservation failed.");
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    return data;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const programIdentityOnDevice = async (selectedPort: any) => {
    const keypair = await generateIdentityKeypair();
    addLog(`[IDENTITY] Programming new key (target prefix ${keypair.prefix})...\n`);
    await runSerialCommand(selectedPort, {
      command: `set prv.key ${keypair.privateKeyHex}`,
      timeoutMs: 4000,
      retries: 3,
      allowTimeout: true,
      requireReply: false,
    });
    await runSerialCommand(selectedPort, {
      command: "reboot",
      timeoutMs: 1500,
      retries: 2,
      allowTimeout: true,
      requireReply: false,
    });
    await sleep(2500);
    await wakeSerialCli(selectedPort);
    return keypair;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ensureRepeaterPrefixReserved = async (
    selectedPort: any,
    onStep: (label: string) => void,
    onStepComplete: (label: string) => void,
  ) => {
    let identityRebooted = false;

    for (let attempt = 0; attempt < MAX_IDENTITY_ATTEMPTS; attempt++) {
      await yieldToMain();
      onStep("Reading public key");
      const publicKeyHex = await fetchPublicKeyFromDevice(selectedPort);
      onStepComplete("Reading public key");

      const prefix = extractPrefix(publicKeyHex);
      addLog(`[IDENTITY] Device prefix: ${prefix}\n`);

      if (!isUsablePrefix(prefix)) {
        onStep("Programming new identity");
        await programIdentityOnDevice(selectedPort);
        onStepComplete("Programming new identity");
        identityRebooted = true;
        continue;
      }

      onStep("Checking prefix on MeshBuddy");
      const availability = await fetchPrefixAvailability(prefix);
      onStepComplete("Checking prefix on MeshBuddy");

      if (!availability.available) {
        addLog(
          `[IDENTITY] Prefix ${prefix} unavailable (${availability.reason ?? "taken"}) — generating new key...\n`,
        );
        onStep("Programming new identity");
        await programIdentityOnDevice(selectedPort);
        onStepComplete("Programming new identity");
        identityRebooted = true;
        continue;
      }

      try {
        onStep("Reserving prefix on MeshBuddy");
        await submitPrefixReservation(prefix);
        onStepComplete("Reserving prefix on MeshBuddy");
        addLog(`[IDENTITY] Prefix ${prefix} reserved on MeshBuddy.\n`);
        return { prefix, publicKey: publicKeyHex, identityRebooted };
      } catch (err) {
        if ((err as Error & { status?: number }).status === 409) {
          addLog(`[IDENTITY] Prefix ${prefix} was taken during reserve — retrying...\n`);
          onStep("Programming new identity");
          await programIdentityOnDevice(selectedPort);
          onStepComplete("Programming new identity");
          identityRebooted = true;
          continue;
        }
        throw err;
      }
    }

    throw new Error(
      `Could not find an available prefix after ${MAX_IDENTITY_ATTEMPTS} attempts. Reserve manually at meshbuddy.gulfcoastmesh.org or ask in Discord.`,
    );
  };

  const getRepeaterCodingRate = () => {
    const codingRate = Number.parseInt(repeaterConfig.codingRate, 10);
    if (!Number.isInteger(codingRate) || codingRate < 5 || codingRate > 8) {
      throw new Error("Coding rate must be an integer between 5 and 8.");
    }
    return codingRate;
  };

  const applyRepeaterRadioProfile = async (selectedPort: unknown) => {
    const codingRate = getRepeaterCodingRate();
    const verifyRadioCommand: SerialCommandSpec = {
      command: "get radio",
      timeoutMs: 3000,
      retries: 3,
      expectedResponseParts: ["910.525", "62.5", String(REPEATER_SPREADING_FACTOR), String(codingRate)],
    };

    try {
      await runSerialCommand(selectedPort, {
        command: `set radio 910.525,62.5,${REPEATER_SPREADING_FACTOR},${codingRate}`,
        timeoutMs: 3000,
        retries: 3,
        allowTimeout: true,
        requireReply: false,
      });
      await runSerialCommand(selectedPort, verifyRadioCommand);
    } catch (err) {
      addLog(`[CMD] Comma radio syntax did not verify: ${(err as Error).message}\n`);
      addLog("[CMD] Trying space-separated radio syntax...\n");
      await runSerialCommand(selectedPort, {
        command: `set radio 910.525 62.5 ${REPEATER_SPREADING_FACTOR} ${codingRate}`,
        timeoutMs: 3000,
        retries: 3,
        allowTimeout: true,
        requireReply: false,
      });
      await runSerialCommand(selectedPort, verifyRadioCommand);
    }
  };

  const handleApplyRepeaterConfig = async () => {
    if (isProcessing) return;

    const selectedPort = portRef.current;
    if (!selectedPort || !selectedPort.readable || !selectedPort.writable) {
      setErrorMsg("Reconnect the repeater over serial before joining the mesh.");
      goTo('repeater_error');
      return;
    }

    setErrorMsg('');
    setShowMapModal(false);
    setSettingsProgress({ current: 0, total: 1, label: 'Starting…' });
    goTo('repeater_applying');
    setIsProcessing(true);
    let configApplied = false;

    try {
      await yieldToMain();
      await stopBackgroundReader();
      const commands = buildRepeaterSerialCommands();
      const totalSettingsSteps = 2 + commands.length + 8 + 1;
      let completedSettingsSteps = 0;
      let identityRebooted = false;

      const updateProgress = (label: string) => {
        setSettingsProgress({ current: completedSettingsSteps, total: totalSettingsSteps, label });
      };

      const completeProgressStep = (label: string) => {
        completedSettingsSteps++;
        setSettingsProgress({ current: completedSettingsSteps, total: totalSettingsSteps, label });
      };

      updateProgress("Waking MeshCore CLI");
      await wakeSerialCli(selectedPort);
      completeProgressStep("MeshCore CLI ready");
      addLog("\n[CONFIG] Applying repeater serial settings...\n");
      addLog(
        `[CONFIG] US profile -> 910.525MHz / 62.5kHz / SF${REPEATER_SPREADING_FACTOR} / CR${getRepeaterCodingRate()}\n`,
      );

      updateProgress("Applying radio profile");
      await applyRepeaterRadioProfile(selectedPort);
      completeProgressStep("Radio profile verified");
      await yieldToMain();

      for (const command of commands) {
        const label = getRepeaterCommandLabel(command.command);
        updateProgress(label);
        await runSerialCommand(selectedPort, command);
        completeProgressStep(label);
      }

      const reservation = await ensureRepeaterPrefixReserved(
        selectedPort,
        updateProgress,
        completeProgressStep,
      );
      identityRebooted = reservation.identityRebooted;
      setReservedPrefix(reservation.prefix);
      setReservedPublicKey(reservation.publicKey);

      if (!identityRebooted) {
        updateProgress("Rebooting repeater");
        await runSerialCommand(selectedPort, {
          command: "reboot",
          timeoutMs: 1500,
          retries: 2,
          allowTimeout: true,
          requireReply: false,
        });
        completeProgressStep("Rebooting repeater");
      }

      addLog("[CONFIG] Repeater settings applied successfully.\n");
      configApplied = true;
      setSerialStatus('disconnected');
      portRef.current = null;
      goTo('repeater_ready');
    } catch (err: unknown) {
      console.error("Repeater serial config error:", err);
      const msg = (err as Error).message || String(err);
      setErrorMsg(msg);
      setSettingsProgress((progress) => ({ ...progress, label: "Settings failed" }));
      addLog(`[ERROR] Repeater config failed: ${msg}\n`);
      goTo('repeater_error');
    } finally {
      setIsProcessing(false);
      if (!configApplied && portRef.current?.readable) {
        startReading(portRef.current);
      }
    }
  };

  const selectedSetupDevice = selectedDevice ? getSetupDevice(selectedDevice) : null;
  const availableDevices = listSupportedSetupDevices();

  const selectDevice = (deviceId: SetupDeviceId) => {
    setSelectedDevice(deviceId);
    const device = getSetupDevice(deviceId);
    setNrfEraseBeforeFlash(device?.eraseRequired ?? true);
  };

  const getFlashDeviceLabel = () => (selectedSetupDevice?.name ?? selectedDevice) || 'device';

  const getFlashingSubtitle = () => {
    if (selectedSetupDevice?.mcu === 'nrf52840') {
      return 'Uploading MeshCore DFU package over serial…';
    }
    return step.startsWith('client')
      ? 'Injecting MeshCore client firmware…'
      : 'Streaming repeater firmware to ESP32…';
  };

  const renderNrfConnectExtras = () => {
    if (selectedSetupDevice?.mcu !== 'nrf52840') return null;

    return (
      <div className="mx-auto max-w-md space-y-4 text-left">
        <div className="rounded-2xl border bg-white/60 p-4 dark:bg-white/5" style={{ borderColor: 'rgb(var(--line) / 0.7)' }}>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
            DFU notes
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            {selectedSetupDevice.dfuHint}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
            After flashing starts, you may be asked to pick the serial port again when the board re-enumerates as TinyUSB or nRF DFU.
          </p>
        </div>
        {selectedSetupDevice.eraseAsset ? (
          <label className="flex items-start gap-3 rounded-2xl border bg-white/60 p-4 dark:bg-white/5" style={{ borderColor: 'rgb(var(--line) / 0.7)' }}>
            <input
              type="checkbox"
              className="mt-1"
              checked={nrfEraseBeforeFlash}
              disabled={Boolean(selectedSetupDevice.eraseRequired)}
              onChange={(event) => setNrfEraseBeforeFlash(event.target.checked)}
            />
            <span className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">
              Erase flash before installing MeshCore
              {selectedSetupDevice.eraseRequired ? ' (required on this device)' : ' (recommended if upgrading from Meshtastic)'}
            </span>
          </label>
        ) : null}
      </div>
    );
  };

  const finishFlashSuccess = (type: 'client' | 'repeater') => {
    setIsProcessing(false);
    setTimeout(() => {
      setSerialStatus('disconnected');
      portRef.current = null;
      transportRef.current = null;
      goTo(type === 'client' ? 'client_restart' : 'repeater_restart');
    }, 1500);
  };

  const finishFlashError = (type: 'client' | 'repeater', msg: string) => {
    addLog(`\n[FATAL ERROR] ${msg}\n`);
    setErrorMsg(msg);
    setIsProcessing(false);
    setTimeout(() => {
      setSerialStatus('disconnected');
      portRef.current = null;
      transportRef.current = null;
      goTo(type === 'client' ? 'client_error' : 'repeater_error');
    }, 100);
  };

  const reportNrfProgress = (progress: { percent: number; message: string }) => {
    const now = Date.now();
    if (progress.percent < 100 && now - lastFlashProgressUpdateRef.current < 120) return;
    lastFlashProgressUpdateRef.current = now;
    setFlashProgress(progress.percent);
    if (progress.message) {
      addLog(`[DFU] ${progress.message} (${Math.round(progress.percent)}%)\n`);
    }
  };

  const requestDfuPort = async (prompt: string) => {
    addLog(`[DFU] ${prompt}\n`);
    return openSerialPort();
  };

  const enterDfuFromApplicationPort = async () => {
    addLog('[DFU] Select the application serial port, then entering DFU mode (1200 baud touch)…\n');
    const appPort = await requestDfuPort('Select the application serial port for your device.');
    try {
      await enterNrfDfu(appPort);
    } finally {
      await closeSerialPort(appPort);
    }
    await sleep(1500);
  };

  const flashNrfZipOnDfuPort = async (zipData: ArrayBuffer, label: string) => {
    const dfuPort = await requestDfuPort(`Select the DFU / TinyUSB serial port to ${label}.`);
    try {
      await flashNrfPackage(dfuPort, zipData, reportNrfProgress);
    } finally {
      await closeSerialPort(dfuPort);
    }
  };

  const handleFlashEsp32 = async () => {
    if (isProcessing || !portRef.current || !transportRef.current) {
      return;
    }

    const type = step.startsWith('client') ? 'client' : 'repeater';
    const firmwareVersion = getResolvedFirmwareVersion(type);
    if (!firmwareVersion) {
      setErrorMsg('Choose a MeshCore firmware version before flashing.');
      return;
    }

    goTo(type === 'client' ? 'client_flashing' : 'repeater_flashing');
    setIsProcessing(true);
    setFlashProgress(0);
    lastFlashProgressUpdateRef.current = 0;

    await stopBackgroundReader();

    const activePort = portRef.current;
    if (activePort) {
      try {
        await activePort.close();
      } catch (e) {
        console.error("Error closing port before flash:", e);
      }
    }

    const firmwareUrl = `/api/meshcore/firmware?device=${encodeURIComponent(selectedDevice)}&role=${encodeURIComponent(type)}&version=${encodeURIComponent(firmwareVersion)}`;

    try {
      addLog(`[FLASH] Fetching MeshCore ${type} firmware v${firmwareVersion} for ${selectedDevice}...\n`);
      const response = await fetch(firmwareUrl);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `Firmware download failed (${response.status}).`);
      }

      const meshcoreTag = response.headers.get('X-MeshCore-Tag');
      const meshcoreFile = response.headers.get('X-MeshCore-File');
      if (meshcoreTag) addLog(`[FLASH] Release: ${meshcoreTag}\n`);
      if (meshcoreFile) addLog(`[FLASH] Asset: ${meshcoreFile}\n`);

      const blob = await response.blob();
      await yieldToMain();
      const arrayBuffer = await blob.arrayBuffer();
      await yieldToMain();
      const firmwareData = new Uint8Array(arrayBuffer);
      addLog(`[FLASH] Binary loaded (${firmwareData.length} bytes)\n`);

      addLog("\n--- BOOTLOADER HANDSHAKE STARTS ---\n");

      const espLoaderTerminal = {
        clean: () => {},
        writeLine: (data: string) => addLog(data + "\n"),
        write: (data: string) => addLog(data)
      };

      const esploader = new ESPLoader({
        transport: transportRef.current!,
        baudrate: 115200,
        terminal: espLoaderTerminal
      });
      esploaderRef.current = esploader;

      await esploader.main();
      addLog(`[FLASH] Connected to chip: ${esploader.chip.CHIP_NAME}\n`);

      const flashOptions: FlashOptions = {
        fileArray: [{ data: firmwareData, address: 0x0 }],
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: false,
        calculateMD5Hash: () => "",
        reportProgress: (_fileIndex: number, written: number, total: number) => {
          const progress = (written / total) * 100;
          const now = Date.now();
          if (progress < 100 && now - lastFlashProgressUpdateRef.current < 120) return;
          lastFlashProgressUpdateRef.current = now;
          setFlashProgress(progress);
        },
        compress: true
      };

      addLog("[FLASH] Erasing and writing flash...\n");
      await esploader.writeFlash(flashOptions);

      addLog("\n--- FLASHING SUCCESSFUL ---\n");
      finishFlashSuccess(type);
    } catch (err: unknown) {
      console.error("Flashing error:", err);
      finishFlashError(type, (err as Error).message || String(err));
    } finally {
      if (transportRef.current) {
        try {
          await transportRef.current.disconnect();
        } catch { }
      }
    }
  };

  const handleFlashNrf = async () => {
    if (isProcessing || !selectedDevice || !selectedSetupDevice) {
      return;
    }

    const type = step.startsWith('client') ? 'client' : 'repeater';
    const firmwareVersion = getResolvedFirmwareVersion(type);
    if (!firmwareVersion) {
      setErrorMsg('Choose a MeshCore firmware version before flashing.');
      return;
    }

    goTo(type === 'client' ? 'client_flashing' : 'repeater_flashing');
    setIsProcessing(true);
    setFlashProgress(0);
    lastFlashProgressUpdateRef.current = 0;

    await stopBackgroundReader();
    await closeSerialPort(portRef.current);
    portRef.current = null;
    transportRef.current = null;

    const firmwareUrl = `/api/meshcore/firmware?device=${encodeURIComponent(selectedDevice)}&role=${encodeURIComponent(type)}&version=${encodeURIComponent(firmwareVersion)}`;
    const shouldErase = nrfEraseBeforeFlash && Boolean(selectedSetupDevice.eraseAsset);

    try {
      if (shouldErase) {
        addLog('[DFU] Downloading erase firmware…\n');
        setFlashProgress(0);
        const eraseData = await fetchErasePackage(selectedDevice);
        await enterDfuFromApplicationPort();
        addLog('[DFU] Flashing erase firmware…\n');
        await flashNrfZipOnDfuPort(eraseData, 'erase flash');
        addLog('[DFU] Erase complete. Re-entering DFU mode for MeshCore firmware…\n');
        setFlashProgress(0);
        await enterDfuFromApplicationPort();
      } else {
        await enterDfuFromApplicationPort();
      }

      addLog(`[FLASH] Fetching MeshCore ${type} firmware v${firmwareVersion} for ${selectedDevice}…\n`);
      const response = await fetch(firmwareUrl);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `Firmware download failed (${response.status}).`);
      }

      const meshcoreTag = response.headers.get('X-MeshCore-Tag');
      const meshcoreFile = response.headers.get('X-MeshCore-File');
      if (meshcoreTag) addLog(`[FLASH] Release: ${meshcoreTag}\n`);
      if (meshcoreFile) addLog(`[FLASH] Asset: ${meshcoreFile}\n`);

      const firmwareZip = await response.arrayBuffer();
      addLog(`[FLASH] DFU package loaded (${firmwareZip.byteLength} bytes)\n`);
      addLog('[DFU] Flashing MeshCore firmware…\n');
      setFlashProgress(0);
      await flashNrfZipOnDfuPort(firmwareZip, 'flash MeshCore firmware');

      addLog('\n--- FLASHING SUCCESSFUL ---\n');
      finishFlashSuccess(type);
    } catch (err: unknown) {
      console.error('nRF flashing error:', err);
      finishFlashError(type, (err as Error).message || String(err));
    }
  };

  const handleFlashReal = async () => {
    if (selectedSetupDevice?.mcu === 'nrf52840') {
      await handleFlashNrf();
      return;
    }
    await handleFlashEsp32();
  };

  // Helper to change steps
  const goTo = (nextStep: string) => setStep(nextStep);

  const getProgress = () => {
    const steps: Record<string, number> = {
      intro: 0,
      client_explain: 15, client_select_device: 30, client_connect: 50, client_flashing: 75, client_error: 75, client_restart: 100,
      repeater_explain: 10, repeater_select_device: 20, repeater_connect: 35, repeater_flashing: 50, repeater_error: 50, repeater_restart: 70, repeater_config: 85, repeater_applying: 92, repeater_ready: 100,
    };
    return steps[step] || 0;
  };

  // ==========================================
  // SHARED UI COMPONENTS
  // ==========================================

  const serialAvailable = serialSupport === 'supported';

  const handleCopyUrl = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers / unusual contexts where clipboard API is gated.
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const renderCompatibilityWarning = () => {
    if (serialSupport === 'checking' || serialSupport === 'supported') return null;

    if (serialSupport === 'insecure') {
      return (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sand-400/40 bg-sand-400/10 p-4 text-left">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-sand-700 dark:text-sand-300" aria-hidden />
          <div>
            <h3 className="font-display text-sm font-semibold text-ink-900 dark:text-white">Secure connection required</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-600 dark:text-ink-300">
              Web Serial only works over HTTPS or via <code className="kbd">localhost</code>. Open{' '}
              <code className="kbd">http://localhost:3000/setup</code> on the machine with the USB cable, or use the HTTPS site URL.
            </p>
          </div>
        </div>
      );
    }

    // Tailored copy by detected browser. The user almost certainly hit this because
    // they're on Firefox/Safari/iOS or inside an embedded webview — say so plainly.
    const messages: Record<BrowserKind, { title: string; body: React.ReactNode; suggestion: string }> = {
      firefox: {
        title: 'Firefox can’t run the flasher',
        body: (
          <>
            Firefox doesn’t ship the <span className="font-semibold text-ink-900 dark:text-white">Web Serial API</span> the
            flasher needs to talk to your board over USB (ESP32 or nRF52840). Open this same page in any
            Chromium-based browser to continue.
          </>
        ),
        suggestion: 'Chrome, Edge, Brave, Arc, Vivaldi, or Opera will all work.',
      },
      safari: {
        title: 'Safari can’t run the flasher',
        body: (
          <>
            Safari doesn’t expose the <span className="font-semibold text-ink-900 dark:text-white">Web Serial API</span>.
            Open this page in a Chromium-based browser instead.
          </>
        ),
        suggestion: 'Chrome, Edge, Brave, Arc, or Vivaldi all work on macOS.',
      },
      ios: {
        title: 'Web Serial isn’t available on iOS',
        body: (
          <>
            Every browser on iPhone and iPad uses Apple’s WebKit, which doesn’t support Web Serial — even
            Chrome / Edge / Brave for iOS. You’ll need a desktop computer to flash a node.
          </>
        ),
        suggestion: 'Open this URL on a Mac, Windows, or Linux machine in Chrome / Edge / Brave.',
      },
      chromium: {
        title: 'This window can’t reach Web Serial',
        body: (
          <>
            Looks like a Chromium-based browser, but the <span className="font-semibold text-ink-900 dark:text-white">Web Serial API</span>
            isn’t available here. That’s common inside embedded previews (IDE / VS Code / Discord), in-app
            webviews, and some stripped-down Linux Chromium packages.
          </>
        ),
        suggestion: 'Open this URL in a normal Chrome, Edge, or Brave tab.',
      },
      unknown: {
        title: 'Browser not compatible',
        body: (
          <>
            Your browser doesn’t expose the <span className="font-semibold text-ink-900 dark:text-white">Web Serial API</span>.
            Open this page in a normal Chrome, Edge, or Brave window — not an embedded preview or in-app browser.
          </>
        ),
        suggestion: 'Chrome, Edge, Brave, Arc, Vivaldi, or Opera all work.',
      },
    };

    const { title, body, suggestion } = messages[browserKind];

    return (
      <div className="mb-6 rounded-2xl border border-coral-500/40 bg-coral-500/10 p-5 text-left">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-coral-500" aria-hidden />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-ink-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-600 dark:text-ink-300">{body}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
                {suggestion}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-2 rounded-full border border-gulf-500/40 bg-gulf-500/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 transition hover:bg-gulf-500/20 dark:text-gulf-200"
                aria-label="Copy this page URL to the clipboard"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copy this URL
                  </>
                )}
              </button>
              <a
                href="https://discord.gulfcoastmesh.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 underline-offset-4 transition hover:text-gulf-700 hover:underline dark:text-ink-400 dark:hover:text-gulf-300"
              >
                Need help? Ask in Discord
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const BackButton = ({ to }: { to: string }) => (
    <button
      type="button"
      onClick={() => goTo(to)}
      className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 transition hover:text-gulf-700 dark:text-ink-400 dark:hover:text-gulf-300"
    >
      <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Back
    </button>
  );

  const renderTerminal = () => (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm transition-opacity ${
        showTerminal ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Flash terminal"
    >
      <div className="flex h-[65vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-950 shadow-glow">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2 text-ink-200">
            <TerminalIcon className="h-4 w-4" aria-hidden />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink-100">
              Flash terminal
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTerminal(false)}
            className="rounded-full p-1.5 text-ink-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close terminal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-black/80 p-6 font-mono text-[11px] leading-relaxed text-gulf-300">
          {terminalLogs.map((log, i) => (
            <span key={i} className="whitespace-pre-wrap">{log}</span>
          ))}
          <div ref={terminalEndRef} />
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
              Device: {selectedDevice || 'none'}
            </span>
            {isProcessing && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gulf-300 animate-pulse">
                Flashing in progress…
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              terminalLogsRef.current = [];
              setTerminalLogs([]);
            }}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 underline-offset-4 transition hover:text-white hover:underline"
          >
            Clear logs
          </button>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // FLOW RENDERING (ABRIDGED FOR READABILITY)
  // ==========================================

  const renderIntro = () => (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <span className="eyebrow mx-auto">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Setup wizard
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-ink-900 sm:text-4xl dark:text-white">
          Get a node on the <span className="gradient-text">Gulf Coast mesh</span>.
        </h1>
        <p className="mx-auto max-w-md text-pretty text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          Plug in over USB, flash MeshCore, and join the network — right from your browser. Pick what you&apos;re building today.
        </p>
      </div>
      {(browserKind === 'firefox' || browserKind === 'safari' || browserKind === 'ios') && (
        <div
          role="note"
          className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-sand-400/40 bg-sand-400/10 p-4 text-left"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-sand-700 dark:text-sand-300" aria-hidden />
          <div>
            <h3 className="font-display text-sm font-semibold text-ink-900 dark:text-white">
              Chromium-based browser required
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-600 dark:text-ink-300">
              The setup wizard uses the Web Serial API to talk to your radio over USB, which only works in
              Chromium-based browsers — Chrome, Edge, Brave, Arc, Vivaldi, or Opera. Firefox and Safari (including
              all iOS browsers) can&apos;t flash from the web yet.
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => goTo('client_explain')}
          className="tile tile-accent group flex h-full flex-col items-start text-left"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gulf-500/15 text-gulf-700 dark:text-gulf-300">
            <Smartphone className="h-5 w-5" aria-hidden />
          </span>
          <h3 className="mt-5 font-display text-lg font-semibold text-ink-900 dark:text-white">Set up a client</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            Daily-carry MeshCore companion paired with your phone over Bluetooth.
          </p>
        </button>
        <button
          type="button"
          onClick={() => goTo('repeater_explain')}
          className="tile tile-accent group flex h-full flex-col items-start text-left"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sand-400/20 text-sand-700 dark:text-sand-300">
            <Wifi className="h-5 w-5" aria-hidden />
          </span>
          <h3 className="mt-5 font-display text-lg font-semibold text-ink-900 dark:text-white">Stand up a repeater</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            Backbone node — extends the mesh from a rooftop, tower, or high attic.
          </p>
        </button>
      </div>
    </div>
  );

  const renderClientExplain = () => (
    <div className="space-y-6">
      <BackButton to="intro" />
      <div className="surface-strong relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gulf-400/15 blur-3xl" />
        <span className="eyebrow">
          <Smartphone className="h-3.5 w-3.5" aria-hidden />
          MeshCore client
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
          A radio you carry
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          The client firmware turns your radio into a daily-carry MeshCore companion — paired with the MeshCore phone app
          over Bluetooth so you can message neighbors on the mesh wherever you go.
        </p>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => goTo('client_select_device')} className="btn-primary">
          Next: select device
        </button>
      </div>
    </div>
  );

  const renderClientSelectDevice = () => (
    <div className="space-y-6">
      <BackButton to="client_explain" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {availableDevices.map((d) => {
          const isSelected = selectedDevice === d.id;
          return (
            <button
              key={d.id}
              type="button"
              disabled={!d.supported}
              onClick={() => selectDevice(d.id)}
              aria-pressed={isSelected}
              className={
                'group relative flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition disabled:cursor-not-allowed disabled:opacity-45 ' +
                (isSelected
                  ? 'border-gulf-500/60 bg-gulf-500/10 shadow-[0_0_0_1px_rgba(45,209,189,0.3)_inset]'
                  : 'bg-white/60 hover:-translate-y-0.5 hover:border-gulf-400/50 dark:bg-white/5 ')
              }
              style={!isSelected ? { borderColor: 'rgb(var(--line) / 0.7)' } : undefined}
            >
              {!d.supported && (
                <span className="absolute right-2 top-2 rounded-full border bg-white/70 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-ink-400" style={{ borderColor: 'rgb(var(--line) / 0.6)' }}>
                  Soon™
                </span>
              )}
              <span className={
                'grid h-10 w-10 place-items-center rounded-xl ' +
                (isSelected ? 'bg-gulf-500/20 text-gulf-700 dark:text-gulf-200' : 'bg-ink-700/5 text-ink-600 dark:bg-white/5 dark:text-ink-300')
              }>
                <Cpu className="h-5 w-5" strokeWidth={1.7} aria-hidden />
              </span>
              <span className="block font-display text-sm font-semibold text-ink-900 dark:text-white">{d.name}</span>
            </button>
          );
        })}
      </div>
      {renderFirmwareVersionPicker('client')}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => goTo('client_connect')}
          disabled={!selectedDevice || !getResolvedFirmwareVersion('client')}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next: connect
        </button>
      </div>
    </div>
  );

  const renderClientConnect = () => (
    <div className="space-y-6">
      <BackButton to="client_select_device" />
      <div className="text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gulf-500/15 text-gulf-700 mx-auto dark:text-gulf-300">
          <Usb className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
          Connect your {getFlashDeviceLabel()}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink-600 dark:text-ink-300">
          Plug in via USB and click below to unlock the serial port.
        </p>
      </div>
      {renderNrfConnectExtras()}
      {renderCompatibilityWarning()}
      <div className="flex flex-col items-center gap-5">
        {serialStatus !== 'connected' ? (
          <button
            type="button"
            onClick={handleConnectSerial}
            disabled={!serialAvailable}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {serialStatus === 'connecting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Usb className="h-4 w-4" aria-hidden />}
            Select serial port
          </button>
        ) : (
          <div className="w-full space-y-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gulf-500/30 bg-gulf-500/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 dark:text-gulf-200">
              <CheckCircle className="h-3.5 w-3.5" aria-hidden />
              Ready to flash
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSendTestPacket}
                className="grid h-11 w-11 place-items-center rounded-2xl border bg-sand-400/10 text-sand-700 transition hover:bg-sand-400/20 disabled:opacity-50 dark:text-sand-300"
                style={{ borderColor: 'rgb(var(--line) / 0.7)' }}
                aria-label="Send test packet"
              >
                <Zap className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleFlashReal}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? 'Initializing…' : 'Start flashing'}
              </button>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleDebugBypassFlash('client')}
              className="mx-auto block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 underline-offset-4 transition hover:text-gulf-700 hover:underline disabled:opacity-40 dark:text-ink-400 dark:hover:text-gulf-300"
            >
              Debug: skip flash
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderClientFlashing = () => (
    <div className="space-y-8 py-6 text-center">
      <div className="relative mx-auto h-32 w-32">
        <svg className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-ink-200/60 dark:text-white/10" />
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray="364.4"
            strokeDashoffset={364.4 - (364.4 * flashProgress) / 100}
            className="text-gulf-500 transition-all duration-300"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-semibold text-ink-900 dark:text-white">
            {Math.round(flashProgress)}%
          </span>
        </div>
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
          Writing firmware
        </h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{getFlashingSubtitle()}</p>
      </div>
      <button
        type="button"
        onClick={() => setShowTerminal(true)}
        className="mx-auto inline-flex items-center gap-2 rounded-full border border-gulf-500/30 bg-gulf-500/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 transition hover:bg-gulf-500/20 dark:text-gulf-200"
      >
        <TerminalIcon className="h-3.5 w-3.5" aria-hidden /> Show live terminal
      </button>
    </div>
  );

  const renderClientError = () => (
    <div className="space-y-8 py-6 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-coral-500/15 text-coral-500">
        <AlertTriangle className="h-10 w-10" aria-hidden />
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
          Flashing failed
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink-600 dark:text-ink-300">
          {errorMsg || 'An unexpected error occurred during the transfer.'}
        </p>
      </div>
      <div className="mx-auto flex max-w-xs flex-col gap-3">
        <button type="button" onClick={() => goTo('client_connect')} className="btn-primary">
          <RefreshCw className="h-4 w-4" aria-hidden /> Try again
        </button>
        <button
          type="button"
          onClick={() => setShowTerminal(true)}
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 transition hover:underline dark:text-gulf-300"
        >
          View detailed logs
        </button>
      </div>
    </div>
  );

  const renderClientRestart = () => (
    <div className="space-y-7 py-6 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gulf-500/15 text-gulf-700 dark:text-gulf-300">
        <CheckCircle className="h-10 w-10" aria-hidden />
      </div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
        Flashing successful
      </h2>
      <div className="surface mx-auto max-w-sm p-6 text-left">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gulf-700 dark:text-gulf-300">
          Bluetooth ready
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
          Your device is now running MeshCore companion firmware. Install the MeshCore app, then connect to this device
          over Bluetooth to finish setup.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          setStep('intro');
          setSerialStatus('disconnected');
          portRef.current = null;
        }}
        className="btn-primary"
      >
        Set up another node
      </button>
    </div>
  );

  // REPEATER FLOW
  const renderRepeaterExplain = () => (
    <div className="space-y-6">
      <BackButton to="intro" />
      <div className="surface-strong relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sand-400/20 blur-3xl" />
        <span className="eyebrow">
          <Wifi className="h-3.5 w-3.5" aria-hidden />
          MeshCore repeater
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
          A backbone node
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          Repeaters relay packets across the coast. Higher placement equals better range — rooftops, towers, and tall
          attics carry the network for everyone else.
        </p>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => goTo('repeater_select_device')} className="btn-primary">
          Next: select device
        </button>
      </div>
    </div>
  );

  const renderRepeaterSelectDevice = () => (
    <div className="space-y-6">
      <BackButton to="repeater_explain" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {availableDevices.map((d) => {
          const isSelected = selectedDevice === d.id;
          return (
            <button
              key={d.id}
              type="button"
              disabled={!d.supported}
              onClick={() => selectDevice(d.id)}
              aria-pressed={isSelected}
              className={
                'group relative flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition disabled:cursor-not-allowed disabled:opacity-45 ' +
                (isSelected
                  ? 'border-sand-400/60 bg-sand-400/10 shadow-[0_0_0_1px_rgba(249,162,40,0.3)_inset]'
                  : 'bg-white/60 hover:-translate-y-0.5 hover:border-sand-400/50 dark:bg-white/5 ')
              }
              style={!isSelected ? { borderColor: 'rgb(var(--line) / 0.7)' } : undefined}
            >
              {!d.supported && (
                <span className="absolute right-2 top-2 rounded-full border bg-white/70 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-ink-400" style={{ borderColor: 'rgb(var(--line) / 0.6)' }}>
                  Soon™
                </span>
              )}
              <span className={
                'grid h-10 w-10 place-items-center rounded-xl ' +
                (isSelected ? 'bg-sand-400/25 text-sand-700 dark:text-sand-200' : 'bg-ink-700/5 text-ink-600 dark:bg-white/5 dark:text-ink-300')
              }>
                <Cpu className="h-5 w-5" strokeWidth={1.7} aria-hidden />
              </span>
              <span className="block font-display text-sm font-semibold text-ink-900 dark:text-white">{d.name}</span>
            </button>
          );
        })}
      </div>
      {renderFirmwareVersionPicker('repeater')}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => goTo('repeater_connect')}
          disabled={!selectedDevice || !getResolvedFirmwareVersion('repeater')}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next: connect
        </button>
      </div>
    </div>
  );

  const renderRepeaterConnect = () => (
    <div className="space-y-6">
      <BackButton to="repeater_select_device" />
      <div className="text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sand-400/20 text-sand-700 mx-auto dark:text-sand-300">
          <Usb className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
          Connect repeater
        </h2>
        {selectedSetupDevice ? (
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600 dark:text-ink-300">
            {getFlashDeviceLabel()} — plug in via USB and select the serial port.
          </p>
        ) : null}
      </div>
      {renderNrfConnectExtras()}
      {renderCompatibilityWarning()}
      <div className="flex flex-col items-center gap-5">
        {serialStatus !== 'connected' ? (
          <button
            type="button"
            onClick={handleConnectSerial}
            disabled={!serialAvailable}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {serialStatus === 'connecting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Usb className="h-4 w-4" aria-hidden />}
            Select serial port
          </button>
        ) : (
          <div className="w-full space-y-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gulf-500/30 bg-gulf-500/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 dark:text-gulf-200">
              <CheckCircle className="h-3.5 w-3.5" aria-hidden />
              Link stable
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSendTestPacket}
                className="grid h-11 w-11 place-items-center rounded-2xl border bg-sand-400/10 text-sand-700 transition hover:bg-sand-400/20 disabled:opacity-50 dark:text-sand-300"
                style={{ borderColor: 'rgb(var(--line) / 0.7)' }}
                aria-label="Send test packet"
              >
                <Zap className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleFlashReal}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? 'Preparing…' : 'Start flashing'}
              </button>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleDebugBypassFlash('repeater')}
              className="mx-auto block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 underline-offset-4 transition hover:text-sand-700 hover:underline disabled:opacity-40 dark:text-ink-400 dark:hover:text-sand-300"
            >
              Debug: skip flash
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderRepeaterFlashing = () => (
    <div className="space-y-8 py-6 text-center">
      <div className="relative mx-auto h-32 w-32">
        <svg className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-ink-200/60 dark:text-white/10" />
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray="364.4"
            strokeDashoffset={364.4 - (364.4 * flashProgress) / 100}
            className="text-sand-500 transition-all duration-300"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-3xl font-semibold text-ink-900 dark:text-white">
            {Math.round(flashProgress)}%
          </span>
        </div>
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
          Writing repeater firmware
        </h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{getFlashingSubtitle()}</p>
      </div>
      <button
        type="button"
        onClick={() => setShowTerminal(true)}
        className="mx-auto inline-flex items-center gap-2 rounded-full border border-sand-400/40 bg-sand-400/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-sand-700 transition hover:bg-sand-400/20 dark:text-sand-200"
      >
        <TerminalIcon className="h-3.5 w-3.5" aria-hidden /> Show live terminal
      </button>
    </div>
  );

  const renderRepeaterRestart = () => (
    <div className="space-y-7 py-6 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gulf-500/15 text-gulf-700 dark:text-gulf-300">
        <CheckCircle className="h-10 w-10" aria-hidden />
      </div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
        Repeater ready
      </h2>
      <div className="surface mx-auto max-w-sm p-6 text-left">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-sand-700 dark:text-sand-300">
          Hard reset required
        </p>
        <ol className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-200">
          <li className="flex gap-2"><span className="font-mono text-ink-400">1.</span> Unplug USB cable</li>
          <li className="flex gap-2"><span className="font-mono text-ink-400">2.</span> Wait two seconds</li>
          <li className="flex gap-2"><span className="font-mono text-ink-400">3.</span> Re-insert USB cable</li>
        </ol>
      </div>
      <div className="flex flex-col items-center gap-4">
        {serialStatus !== 'connected' ? (
          <button
            type="button"
            onClick={handleConnectSerial}
            disabled={!serialAvailable}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={'h-4 w-4 ' + (serialStatus === 'connecting' ? 'animate-spin' : '')} aria-hidden />
            Reconnect device
          </button>
        ) : (
          <button type="button" onClick={() => goTo('repeater_config')} className="btn-primary">
            Configure location
          </button>
        )}
      </div>
    </div>
  );

  const tileSize = 256;
  const clampMapZoom = (zoom: number) => Math.min(15, Math.max(3, zoom));
  const clampMapLat = (lat: number) => Math.min(85, Math.max(-85, lat));

  const lonLatToPixel = (lat: number, lon: number, zoom: number) => {
    const worldSize = tileSize * 2 ** zoom;
    const clampedLat = clampMapLat(lat);
    const sinLat = Math.sin((clampedLat * Math.PI) / 180);

    return {
      x: ((lon + 180) / 360) * worldSize,
      y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldSize
    };
  };

  const pixelToLonLat = (x: number, y: number, zoom: number) => {
    const worldSize = tileSize * 2 ** zoom;
    const lon = (x / worldSize) * 360 - 180;
    const mercatorY = 0.5 - y / worldSize;
    const lat = 90 - (360 * Math.atan(Math.exp(-mercatorY * 2 * Math.PI))) / Math.PI;

    return { lat: clampMapLat(lat), lon };
  };

  const getMapTiles = (expanded: boolean) => {
    const centerPixel = lonLatToPixel(mapCenter.lat, mapCenter.lon, mapZoom);
    const centerTileX = Math.floor(centerPixel.x / tileSize);
    const centerTileY = Math.floor(centerPixel.y / tileSize);
    const tileRange = expanded ? 5 : 3;
    const tileCount = 2 ** mapZoom;
    const tiles: { key: string; url: string; left: number; top: number }[] = [];

    for (let xOffset = -tileRange; xOffset <= tileRange; xOffset++) {
      for (let yOffset = -tileRange; yOffset <= tileRange; yOffset++) {
        const tileX = centerTileX + xOffset;
        const tileY = centerTileY + yOffset;
        if (tileY < 0 || tileY >= tileCount) continue;

        const wrappedTileX = ((tileX % tileCount) + tileCount) % tileCount;
        tiles.push({
          key: `${mapZoom}-${tileX}-${tileY}`,
          url: `https://tile.openstreetmap.org/${mapZoom}/${wrappedTileX}/${tileY}.png`,
          left: tileX * tileSize - centerPixel.x,
          top: tileY * tileSize - centerPixel.y
        });
      }
    }

    return tiles;
  };

  const setRepeaterLocationFromPoint = (clientX: number, clientY: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const centerPixel = lonLatToPixel(mapCenter.lat, mapCenter.lon, mapZoom);
    const clickedPixelX = centerPixel.x + clientX - (rect.left + rect.width / 2);
    const clickedPixelY = centerPixel.y + clientY - (rect.top + rect.height / 2);
    const { lat, lon } = pixelToLonLat(clickedPixelX, clickedPixelY, mapZoom);

    setRepeaterConfig({ ...repeaterConfig, locationSet: true, locX: 50, locY: 50, lat, lon });
  };

  const handleMapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    mapDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startCenter: mapCenter,
      moved: false
    };
  };

  const handleMapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dragState = mapDragRef.current;
    if (!dragState || dragState.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) < 5) return;

    dragState.moved = true;
    setIsMapDragging(true);

    const startCenterPixel = lonLatToPixel(dragState.startCenter.lat, dragState.startCenter.lon, mapZoom);
    const nextCenter = pixelToLonLat(startCenterPixel.x - dx, startCenterPixel.y - dy, mapZoom);
    setMapCenter(nextCenter);
  };

  const handleMapPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dragState = mapDragRef.current;
    if (!dragState || dragState.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { }

    mapDragRef.current = null;
    setIsMapDragging(false);

    if (!dragState.moved) {
      setRepeaterLocationFromPoint(e.clientX, e.clientY, e.currentTarget);
    }
  };

  const handleMapPointerCancel = () => {
    mapDragRef.current = null;
    setIsMapDragging(false);
  };

  const handleMapWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    mapWheelRef.current.delta += e.deltaY;

    // Slow wheel/trackpad zoom down so a normal scroll gesture only changes one level.
    if (Math.abs(mapWheelRef.current.delta) < 260 || now - mapWheelRef.current.lastZoomAt < 220) {
      return;
    }

    const direction = mapWheelRef.current.delta < 0 ? 1 : -1;
    mapWheelRef.current = { delta: 0, lastZoomAt: now };
    setMapZoom((zoom) => clampMapZoom(zoom + direction));
  };

  const handleMapKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setRepeaterConfig({ ...repeaterConfig, locationSet: true, locX: 50, locY: 50, lat: mapCenter.lat, lon: mapCenter.lon });
  };

  const handleCoordinateChange = (field: 'lat' | 'lon', value: string) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return;

    const nextLat = field === 'lat' ? clampMapLat(numericValue) : repeaterConfig.lat;
    const nextLon = field === 'lon' ? numericValue : repeaterConfig.lon;
    setMapCenter({ lat: nextLat, lon: nextLon });
    setRepeaterConfig({ ...repeaterConfig, locationSet: true, lat: nextLat, lon: nextLon, locX: 50, locY: 50 });
  };

  const renderRepeaterLocationMap = (expanded = false) => {
    const centerPixel = lonLatToPixel(mapCenter.lat, mapCenter.lon, mapZoom);
    const pinPixel = lonLatToPixel(repeaterConfig.lat, repeaterConfig.lon, mapZoom);
    const pinLeft = pinPixel.x - centerPixel.x;
    const pinTop = pinPixel.y - centerPixel.y;

    return (
      <div
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={handleMapPointerUp}
        onPointerCancel={handleMapPointerCancel}
        onWheelCapture={handleMapWheel}
        onWheel={handleMapWheel}
        onKeyDown={handleMapKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Select repeater location on real map"
        className={`${expanded ? 'h-[70vh]' : 'h-64'} relative w-full overflow-hidden rounded-2xl border bg-ink-200 ${isMapDragging ? 'cursor-grabbing' : 'cursor-grab'} touch-none select-none overscroll-contain focus:outline-none focus:ring-2 focus:ring-gulf-400 dark:bg-ink-900`}
        style={{ borderColor: 'rgb(var(--line) / 0.7)', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {getMapTiles(expanded).map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.key}
            alt=""
            draggable={false}
            src={tile.url}
            className="pointer-events-none absolute h-64 w-64 select-none"
            style={{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }}
          />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-ink-950/10" />
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-700 shadow-sm dark:bg-ink-900/90 dark:text-ink-100">
          OpenStreetMap
        </span>
        {!expanded && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (repeaterConfig.locationSet) setMapCenter({ lat: repeaterConfig.lat, lon: repeaterConfig.lon });
              setShowMapModal(true);
            }}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-gulf-700 shadow-sm transition hover:bg-white dark:bg-ink-900/90 dark:text-gulf-300"
            aria-label="Maximize map"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
        )}
        <div className="absolute right-3 top-14 flex flex-col overflow-hidden rounded-xl bg-white/95 shadow-sm dark:bg-ink-900/90">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMapZoom((zoom) => clampMapZoom(zoom + 1))}
            className="px-3 py-2 font-mono text-sm font-semibold text-ink-800 transition hover:bg-ink-100 dark:text-ink-100 dark:hover:bg-white/5"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMapZoom((zoom) => clampMapZoom(zoom - 1))}
            className="border-t border-ink-200/60 px-3 py-2 font-mono text-sm font-semibold text-ink-800 transition hover:bg-ink-100 dark:border-white/10 dark:text-ink-100 dark:hover:bg-white/5"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white/95 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-600 shadow-sm dark:bg-ink-900/90 dark:text-ink-300">
          Drag to pan · scroll or +/− to zoom · click to place
        </span>
        {repeaterConfig.locationSet && (
          <MapPin
            size={expanded ? 38 : 30}
            className="pointer-events-none absolute z-10 text-coral-500 drop-shadow-md"
            style={{ left: `calc(50% + ${pinLeft}px)`, top: `calc(50% + ${pinTop}px)`, transform: 'translate(-50%, -100%)' }}
          />
        )}
        {!repeaterConfig.locationSet && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-700 dark:text-ink-100">
            Click map to pin repeater location
          </div>
        )}
      </div>
    );
  };

  const renderSettingsProgress = () => {
    if (!isProcessing || settingsProgress.total <= 0) return null;

    return (
      <div className="surface p-4">
        <div className="flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 dark:text-gulf-300">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {settingsProgress.label || 'Sending settings'}
          </span>
          <span>{Math.round((settingsProgress.current / settingsProgress.total) * 100)}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-200/60 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gulf-400 to-gulf-600 transition-all duration-300"
            style={{ width: `${(settingsProgress.current / settingsProgress.total) * 100}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
          Step {settingsProgress.current} of {settingsProgress.total}
        </p>
      </div>
    );
  };

  const renderRepeaterApplying = () => (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
          Joining the mesh
        </h2>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
          Applying radio settings, reserving your prefix, and rebooting the repeater. This can take a minute — the page
          may look idle while the radio is busy.
        </p>
      </div>
      {renderSettingsProgress()}
      <button
        type="button"
        onClick={() => setShowTerminal(true)}
        className="mx-auto block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 transition hover:underline dark:text-gulf-300"
      >
        Open serial logs
      </button>
    </div>
  );

  const renderRepeaterConfig = () => {
    const inputClass =
      'w-full rounded-xl border bg-white/80 px-3 py-3 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-gulf-400 focus:ring-2 focus:ring-gulf-400/40 dark:bg-ink-900/60 dark:text-white dark:placeholder:text-ink-500';
    const inputBorder = { borderColor: 'rgb(var(--line) / 0.7)' };
    return (
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
            Node config
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            These settings get pushed over serial when you join the mesh.
          </p>
        </div>

        <input
          type="text"
          value={repeaterConfig.name}
          onChange={(e) => setRepeaterConfig({ ...repeaterConfig, name: e.target.value })}
          placeholder="Node name"
          className={inputClass}
          style={inputBorder}
        />

        {renderRepeaterLocationMap()}

        {repeaterConfig.locationSet && (
          <div className="grid grid-cols-2 gap-3">
            <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
              Latitude
              <input
                type="number"
                step="0.000001"
                value={repeaterConfig.lat.toFixed(6)}
                onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                className={`mt-1 ${inputClass}`}
                style={inputBorder}
              />
            </label>
            <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
              Longitude
              <input
                type="number"
                step="0.000001"
                value={repeaterConfig.lon.toFixed(6)}
                onChange={(e) => handleCoordinateChange('lon', e.target.value)}
                className={`mt-1 ${inputClass}`}
                style={inputBorder}
              />
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={repeaterConfig.height}
            onChange={(e) => setRepeaterConfig({ ...repeaterConfig, height: e.target.value })}
            placeholder="Height (ft)"
            className={inputClass}
            style={inputBorder}
          />
          <input
            type="email"
            required
            value={repeaterConfig.email}
            onChange={(e) => setRepeaterConfig({ ...repeaterConfig, email: e.target.value })}
            placeholder="Contact email"
            className={inputClass}
            style={inputBorder}
          />
        </div>

        <input
          type="password"
          value={repeaterConfig.password}
          onChange={(e) => setRepeaterConfig({ ...repeaterConfig, password: e.target.value })}
          placeholder="Admin password"
          className={inputClass}
          style={inputBorder}
        />

        <div
          className="rounded-xl border bg-white/60 px-3 py-2.5 dark:bg-white/5"
          style={{ borderColor: "rgb(var(--line) / 0.7)" }}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-[11px] leading-relaxed text-ink-600 dark:text-ink-300">
              <code className="kbd">910.525 MHz</code> · <code className="kbd">62.5 kHz</code> ·{' '}
              <code className="kbd">SF{REPEATER_SPREADING_FACTOR}</code>
            </p>
            <label className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500 dark:text-ink-400">
              CR
              <select
                value={repeaterConfig.codingRate}
                onChange={(e) => setRepeaterConfig({ ...repeaterConfig, codingRate: e.target.value })}
                className="rounded-lg border bg-white/80 px-2 py-1 text-xs font-medium text-ink-900 outline-none transition focus:border-gulf-400 focus:ring-2 focus:ring-gulf-400/40 dark:bg-ink-900/60 dark:text-white"
                style={inputBorder}
              >
                {[5, 6, 7, 8].map((rate) => (
                  <option key={rate} value={String(rate)}>
                    {rate}
                    {rate === DEFAULT_REPEATER_CODING_RATE ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
            You may need to change this depending on link distance and local RF conditions.
          </p>
        </div>

        {serialStatus !== 'connected' && (
          <p className="rounded-xl border border-sand-400/40 bg-sand-400/10 px-3 py-2 text-[11px] text-sand-700 dark:text-sand-300">
            Reconnect serial on the previous step before joining the mesh.
          </p>
        )}

        <button
          type="button"
          onClick={handleApplyRepeaterConfig}
          disabled={isProcessing || serialStatus !== 'connected' || !repeaterConfig.email.trim()}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? 'Applying serial settings…' : 'Join the mesh'}
        </button>
        <button
          type="button"
          onClick={() => setShowTerminal(true)}
          className="block w-full text-center font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 transition hover:underline dark:text-gulf-300"
        >
          Open serial logs
        </button>
      </div>
    );
  };

  const renderRepeaterReady = () => (
    <div className="space-y-6 py-6 text-center">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-gulf-400 via-gulf-500 to-sand-400 text-ink-950 shadow-glow">
        <Wifi className="h-12 w-12" aria-hidden />
      </div>
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-900 dark:text-white">
        Node streaming
      </h2>
      <p className="text-sm text-ink-600 dark:text-ink-300">
        Repeater <span className="font-semibold text-ink-900 dark:text-white">{repeaterConfig.name || 'node'}</span> is
        live on the Gulf Coast mesh.
      </p>
      {reservedPrefix ? (
        <div className="surface mx-auto max-w-sm p-4 text-left">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gulf-700 dark:text-gulf-300">
            Prefix reserved
          </p>
          <p className="mt-2 text-sm text-ink-700 dark:text-ink-200">
            <span className="font-mono font-semibold text-ink-900 dark:text-white">{reservedPrefix}</span> is reserved on
            MeshBuddy
            {reservedPublicKey ? (
              <>
                {" "}
                (<span className="font-mono text-xs">{reservedPublicKey.slice(0, 12)}…</span>)
              </>
            ) : null}
            .
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            setStep('intro');
            setSerialStatus('disconnected');
            portRef.current = null;
            setReservedPrefix(null);
            setReservedPublicKey(null);
          }}
          className="btn-primary"
        >
          Set up another node
        </button>
        <Link href="/meshmap" className="btn-ghost">
          Open live maps
        </Link>
      </div>
    </div>
  );

  const renderRepeaterError = () => (
    <div className="space-y-7 py-6 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-coral-500/15 text-coral-500">
        <AlertTriangle className="h-10 w-10" aria-hidden />
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
          Repeater error
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink-600 dark:text-ink-300">
          {errorMsg || 'Failed to inject repeater firmware into the controller.'}
        </p>
      </div>
      <div className="mx-auto flex max-w-xs flex-col gap-3">
        <button type="button" onClick={() => goTo('repeater_connect')} className="btn-primary">
          <RefreshCw className="h-4 w-4" aria-hidden /> Retry injection
        </button>
        <button
          type="button"
          onClick={() => setShowTerminal(true)}
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gulf-700 transition hover:underline dark:text-gulf-300"
        >
          Open debug console
        </button>
      </div>
    </div>
  );

  const stepRenderer: Record<string, () => React.ReactNode> = {
    intro: renderIntro,
    client_explain: renderClientExplain, client_select_device: renderClientSelectDevice, client_connect: renderClientConnect,
    client_flashing: renderClientFlashing, client_error: renderClientError, client_restart: renderClientRestart,
    repeater_explain: renderRepeaterExplain, repeater_select_device: renderRepeaterSelectDevice, repeater_connect: renderRepeaterConnect,
    repeater_flashing: renderRepeaterFlashing, repeater_error: renderRepeaterError, repeater_restart: renderRepeaterRestart, repeater_config: renderRepeaterConfig, repeater_applying: renderRepeaterApplying, repeater_ready: renderRepeaterReady,
  };

  const inputClass =
    'w-full rounded-xl border bg-white/80 px-3 py-3 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-gulf-400 focus:ring-2 focus:ring-gulf-400/40 dark:bg-ink-900/60 dark:text-white dark:placeholder:text-ink-500';

  return (
    <div className="container pb-24">
      <div className="mx-auto w-full max-w-2xl">
        <div className="surface-strong relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gulf-400/60 to-transparent" />
          <div className="h-1.5 w-full bg-ink-100/70 dark:bg-white/5">
            <div
              className={`h-full transition-all duration-700 ease-in-out ${
                step.startsWith('repeater')
                  ? 'bg-gradient-to-r from-sand-400 to-sand-600'
                  : 'bg-gradient-to-r from-gulf-400 to-gulf-600'
              }`}
              style={{ width: `${getProgress()}%` }}
            />
          </div>
          <div className="flex min-h-[600px] flex-col justify-center p-6 sm:p-12">
            {stepRenderer[step]()}
          </div>
        </div>

        <p className="mt-12 text-center text-sm text-ink-500 dark:text-ink-400">
          <Link href="/" className="font-medium text-gulf-700 hover:underline dark:text-gulf-300">
            ← Back to home
          </Link>
        </p>
      </div>

      {renderTerminal()}

      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Set repeater coordinates">
          <div className="surface-strong flex h-full max-h-[92vh] w-full max-w-6xl flex-col p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <span className="eyebrow">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  Coordinates
                </span>
                <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-ink-900 dark:text-white">
                  Set repeater coordinates
                </h3>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Click the map or enter latitude and longitude manually.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="grid h-9 w-9 place-items-center rounded-full border bg-white/70 text-ink-600 transition hover:bg-white hover:text-ink-900 dark:border-white/10 dark:bg-white/5 dark:text-ink-300 dark:hover:bg-white/10"
                style={{ borderColor: 'rgb(var(--line) / 0.7)' }}
                aria-label="Close map"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">{renderRepeaterLocationMap(true)}</div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
                Latitude
                <input
                  type="number"
                  step="0.000001"
                  value={repeaterConfig.lat.toFixed(6)}
                  onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                  className={`mt-1 ${inputClass}`}
                  style={{ borderColor: 'rgb(var(--line) / 0.7)' }}
                />
              </label>
              <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
                Longitude
                <input
                  type="number"
                  step="0.000001"
                  value={repeaterConfig.lon.toFixed(6)}
                  onChange={(e) => handleCoordinateChange('lon', e.target.value)}
                  className={`mt-1 ${inputClass}`}
                  style={{ borderColor: 'rgb(var(--line) / 0.7)' }}
                />
              </label>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="btn-primary self-end"
              >
                Use location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SetupPage() {
  if (!SETUP_WIZARD_ENABLED) return <SetupComingSoon />;
  return <SetupWizard />;
}
