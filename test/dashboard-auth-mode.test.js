import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(new URL("../src/server.js", import.meta.url), "utf8");

test("dashboard auth mode: token mode skips Basic auth on the dashboard", () => {
  const idx = src.indexOf("function requireDashboardAuth");
  assert.ok(idx >= 0);
  const window = src.slice(idx, idx + 900);
  assert.match(window, /dashboardAuthMode\(\) === "token"\) return next\(\)/);
});

test("dashboard auth mode: gateway token is only injected in password mode", () => {
  const idx = src.indexOf("function attachGatewayAuthHeader");
  assert.ok(idx >= 0);
  const window = src.slice(idx, idx + 400);
  assert.match(window, /dashboardAuthMode\(\) !== "password"\) return/);
});

test("dashboard auth mode: token travels in the URL fragment, not the query string", () => {
  assert.match(src, /#token=\$\{encodeURIComponent\(OPENCLAW_GATEWAY_TOKEN\)\}/);
  assert.doesNotMatch(src, /\?token=\$\{/);
});

test("dashboard auth mode: /setup exposes an endpoint to switch modes", () => {
  assert.match(src, /app\.post\("\/setup\/api\/dashboard-auth", requireSetupAuth/);
});
