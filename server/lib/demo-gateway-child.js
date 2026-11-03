"use strict";

/**
 * Spawn the bundled demo gateway as a child of the Studio server so
 * `npm run dev` opens a living office without a second terminal.
 */

const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const DEFAULT_PORT = 18789;

const resolveDemoPort = (env = process.env) => {
  const raw = env.DEMO_ADAPTER_PORT?.trim() || String(DEFAULT_PORT);
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port <= 0) return DEFAULT_PORT;
  return port;
};

const isPortOpen = (port, host = "127.0.0.1") =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(400, () => {
      socket.destroy();
      resolve(false);
    });
  });

const shouldAutoStartDemoGateway = (env = process.env, { dev = false } = {}) => {
  const flag = env.HERMES3D_AUTO_START_DEMO?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "yes" || flag === "on") return true;
  // Default: auto-start in dev, or whenever the adapter type env is demo.
  const adapter = env.HERMES3D_GATEWAY_ADAPTER_TYPE?.trim().toLowerCase();
  if (adapter === "demo") return true;
  return Boolean(dev);
};

/**
 * @returns {Promise<{ started: boolean, port: number, reason?: string, child?: import('node:child_process').ChildProcess }>}
 */
async function maybeStartDemoGateway({
  env = process.env,
  dev = false,
  log = console.info.bind(console),
  logError = console.error.bind(console),
} = {}) {
  const port = resolveDemoPort(env);
  if (!shouldAutoStartDemoGateway(env, { dev })) {
    return { started: false, port, reason: "disabled" };
  }

  if (await isPortOpen(port)) {
    log(`[demo-gateway] Port ${port} already in use — reusing existing gateway.`);
    return { started: false, port, reason: "already-running" };
  }

  const scriptPath = path.join(__dirname, "..", "demo-gateway-adapter.js");
  const childEnv = {
    ...env,
    DEMO_ADAPTER_PORT: String(port),
  };

  const child = spawn(process.execPath, [scriptPath], {
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  child.stdout?.on("data", (chunk) => {
    const text = chunk.toString("utf8").trimEnd();
    if (text) log(`[demo-gateway] ${text}`);
  });
  child.stderr?.on("data", (chunk) => {
    const text = chunk.toString("utf8").trimEnd();
    if (text) logError(`[demo-gateway] ${text}`);
  });
  child.on("exit", (code, signal) => {
    log(`[demo-gateway] exited code=${code ?? "null"} signal=${signal ?? "null"}`);
  });

  // Brief wait so connect-on-boot has a chance to succeed.
  await new Promise((resolve) => setTimeout(resolve, 350));
  log(`[demo-gateway] Auto-started on ws://localhost:${port}`);
  return { started: true, port, child };
}

module.exports = {
  resolveDemoPort,
  shouldAutoStartDemoGateway,
  maybeStartDemoGateway,
};
