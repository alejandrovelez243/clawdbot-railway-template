// Served at /setup/app.js
// No fancy syntax: keep it maximally compatible.

(function () {
  function $(id) { return document.getElementById(id); }

  var statusEl = $('status');
  var statusVersionEl = $('statusVersion');
  var statusDetailsEl = $('statusDetails');
  var authGroupEl = $('authGroup');
  var authChoiceEl = $('authChoice');
  var logEl = $('log');

  // Access card
  var openUiEl = $('openUi');
  var accessHintEl = $('accessHint');
  var copyLinkEl = $('copyLink');
  var copyLinkOutEl = $('copyLinkOut');
  var dashboardAuthOutEl = $('dashboardAuthOut');
  var gatewayTokenEl = $('gatewayToken');
  var tokenToggleEl = $('tokenToggle');
  var tokenCopyEl = $('tokenCopy');
  var tokenSourceEl = $('tokenSource');

  // Wizard
  var wizardDetailsEl = $('wizardDetails');
  var wizardNoteEl = $('wizardNote');

  // Debug console
  var consoleCmdEl = $('consoleCmd');
  var consoleArgEl = $('consoleArg');
  var consoleRunEl = $('consoleRun');
  var consoleOutEl = $('consoleOut');

  // Config editor
  var configPathEl = $('configPath');
  var configTextEl = $('configText');
  var configReloadEl = $('configReload');
  var configSaveEl = $('configSave');
  var configOutEl = $('configOut');

  // Import
  var importFileEl = $('importFile');
  var importRunEl = $('importRun');
  var importOutEl = $('importOut');

  // Pairing
  var pairingOutEl = $('pairingOut');

  var currentStatus = null;

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'pill' + (kind ? ' ' + kind : '');
  }

  function setMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'msg' + (kind ? ' ' + kind : '');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  function isInteractiveOAuth(optionValue, optionLabel) {
    var v = String(optionValue || '');
    var l = String(optionLabel || '');
    return l.indexOf('OAuth') !== -1 || v.indexOf('cli') !== -1 || v.indexOf('codex') !== -1 || v.indexOf('portal') !== -1;
  }

  function renderAuth(groups) {
    authGroupEl.innerHTML = '';

    // Toggle for showing interactive OAuth choices.
    var advancedToggle = $('showAdvancedAuth');
    if (!advancedToggle) {
      advancedToggle = document.createElement('label');
      advancedToggle.className = 'muted';
      advancedToggle.style.fontWeight = '400';
      advancedToggle.innerHTML = '<input type="checkbox" id="showAdvancedAuth" /> Show interactive OAuth options (advanced, need a terminal)';
      authChoiceEl.parentNode.insertBefore(advancedToggle, authChoiceEl.nextSibling);
    }

    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var opt = document.createElement('option');
      opt.value = g.value;
      opt.textContent = g.label + (g.hint ? ' - ' + g.hint : '');
      authGroupEl.appendChild(opt);
    }

    function rerenderChoices() {
      var sel = null;
      for (var j = 0; j < groups.length; j++) {
        if (groups[j].value === authGroupEl.value) sel = groups[j];
      }
      authChoiceEl.innerHTML = '';
      var opts = (sel && sel.options) ? sel.options : [];
      var advEl = $('showAdvancedAuth');
      var showAdv = Boolean(advEl && advEl.checked);

      var firstNonInteractive = null;
      for (var k = 0; k < opts.length; k++) {
        var o = opts[k];
        var interactive = isInteractiveOAuth(o.value, o.label);
        if (interactive && !showAdv) continue;
        if (!interactive && !firstNonInteractive) firstNonInteractive = o.value;

        var opt2 = document.createElement('option');
        opt2.value = o.value;
        opt2.textContent = o.label + (interactive ? ' (interactive OAuth)' : '');
        authChoiceEl.appendChild(opt2);
      }

      // Prefer selecting a non-interactive option by default.
      if (firstNonInteractive) authChoiceEl.value = firstNonInteractive;
    }

    authGroupEl.onchange = rerenderChoices;
    var advEl2 = $('showAdvancedAuth');
    if (advEl2) advEl2.onchange = rerenderChoices;

    rerenderChoices();
  }

  function httpJson(url, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    return fetch(url, opts).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          var msg = t || res.statusText;
          try { var j = JSON.parse(t); if (j && j.error) msg = j.error; } catch (_e) { /* not json */ }
          throw new Error('HTTP ' + res.status + ': ' + msg);
        });
      }
      return res.json();
    });
  }

  // ---- Access card -------------------------------------------------------

  function renderAccess(j) {
    var mode = j.dashboardAuth || 'password';
    var url = j.controlUiUrl || '/openclaw';

    if (openUiEl) {
      openUiEl.setAttribute('href', url);
      openUiEl.setAttribute('aria-disabled', j.configured ? 'false' : 'true');
    }

    if (accessHintEl) {
      if (!j.configured) {
        accessHintEl.textContent = 'Run the setup wizard below first. The dashboard becomes available once OpenClaw is configured.';
      } else if (mode === 'token') {
        accessHintEl.textContent = 'Click the button: the link carries the gateway token and logs you in automatically (no password prompt). The token is removed from the address bar once the dashboard loads.';
      } else {
        accessHintEl.textContent = 'The browser will ask for a username (anything) and your SETUP_PASSWORD.';
      }
    }

    var radios = document.querySelectorAll('input[name="dashboardAuth"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = radios[i].value === mode;
      radios[i].disabled = Boolean(j.dashboardAuthLockedByEnv);
      var wrap = radios[i].parentNode;
      if (wrap && wrap.classList) {
        if (radios[i].checked) wrap.classList.add('selected'); else wrap.classList.remove('selected');
      }
    }
    if (j.dashboardAuthLockedByEnv) {
      setMsg(dashboardAuthOutEl, 'Locked: DASHBOARD_AUTH_MODE is set in Railway Variables. Remove it to change the mode here.', '');
    }

    if (gatewayTokenEl) gatewayTokenEl.value = j.gatewayToken || '';
    if (tokenSourceEl) {
      tokenSourceEl.textContent = j.gatewayTokenFromEnv
        ? 'Source: OPENCLAW_GATEWAY_TOKEN (Railway Variables).'
        : 'Source: generated by the wrapper and stored on the volume (gateway.token). Set OPENCLAW_GATEWAY_TOKEN in Railway Variables to choose your own.';
    }
  }

  function saveDashboardAuth(mode) {
    setMsg(dashboardAuthOutEl, 'Saving…', '');
    return httpJson('/setup/api/dashboard-auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: mode })
    }).then(function (j) {
      setMsg(dashboardAuthOutEl, 'Saved. Dashboard now uses ' + (j.dashboardAuth === 'token' ? 'token link' : 'password') + ' authentication.', 'ok');
      return refreshStatus();
    }).catch(function (e) {
      setMsg(dashboardAuthOutEl, 'Error: ' + String(e.message || e), 'err');
      // Revert radios to the server state.
      if (currentStatus) renderAccess(currentStatus);
    });
  }

  (function wireAccess() {
    var radios = document.querySelectorAll('input[name="dashboardAuth"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].onchange = function (ev) {
        if (ev.target.checked) saveDashboardAuth(ev.target.value);
      };
    }

    if (copyLinkEl) {
      copyLinkEl.onclick = function () {
        var href = openUiEl ? openUiEl.getAttribute('href') : '/openclaw';
        var abs = new URL(href, window.location.href).toString();
        copyText(abs).then(function () {
          if (copyLinkOutEl) copyLinkOutEl.textContent = 'Copied.';
          setTimeout(function () { if (copyLinkOutEl) copyLinkOutEl.textContent = ''; }, 2000);
        }).catch(function () {
          if (copyLinkOutEl) copyLinkOutEl.textContent = 'Copy failed. Link: ' + abs;
        });
      };
    }

    if (tokenToggleEl && gatewayTokenEl) {
      tokenToggleEl.onclick = function () {
        var hidden = gatewayTokenEl.type === 'password';
        gatewayTokenEl.type = hidden ? 'text' : 'password';
        tokenToggleEl.textContent = hidden ? 'Hide' : 'Show';
      };
    }

    if (tokenCopyEl && gatewayTokenEl) {
      tokenCopyEl.onclick = function () {
        copyText(gatewayTokenEl.value).then(function () {
          tokenCopyEl.textContent = 'Copied';
          setTimeout(function () { tokenCopyEl.textContent = 'Copy'; }, 2000);
        }).catch(function () {
          tokenCopyEl.textContent = 'Failed';
        });
      };
    }
  })();

  // ---- Status --------------------------------------------------------------

  function refreshStatus() {
    setStatus('Loading…', '');
    if (statusDetailsEl) statusDetailsEl.textContent = '';

    return httpJson('/setup/api/status').then(function (j) {
      currentStatus = j;

      if (j.configured) {
        setStatus(j.gatewayRunning ? 'Configured · gateway running' : 'Configured · gateway starting', j.gatewayRunning ? 'ok' : 'warn');
      } else {
        setStatus('Not configured', 'warn');
      }
      if (statusVersionEl) statusVersionEl.textContent = j.openclawVersion ? ('OpenClaw ' + j.openclawVersion) : '';
      if (statusDetailsEl) statusDetailsEl.textContent = 'Internal gateway: ' + (j.gatewayTarget || '(unknown)');

      renderAccess(j);

      if (wizardDetailsEl) {
        if (!j.configured) wizardDetailsEl.open = true;
      }
      if (wizardNoteEl) {
        wizardNoteEl.textContent = j.configured
          ? 'OpenClaw is already configured. Use Reset setup if you want to run onboarding again (channels can also be changed in the dashboard).'
          : 'Runs the same onboarding OpenClaw uses in the terminal, from the browser.';
      }

      // If channels are unsupported, surface it for debugging.
      if (j.channelsAddHelp && j.channelsAddHelp.indexOf('telegram') === -1) {
        logEl.textContent += '\nNote: this openclaw build does not list telegram in `channels add --help`. Telegram auto-add will be skipped.\n';
      }

      // Attempt to load config editor content if present.
      if (configReloadEl && configTextEl) {
        loadConfigRaw();
      }
    }).catch(function (e) {
      setStatus('Error: ' + String(e.message || e), 'err');
      if (statusDetailsEl) statusDetailsEl.textContent = '';
    });
  }

  // Fast auth group load (no subprocesses). Keeps selects from appearing empty.
  function loadAuthGroupsFast() {
    return httpJson('/setup/api/auth-groups').then(function (j) {
      if (j && j.authGroups && j.authGroups.length > 0) {
        renderAuth(j.authGroups);
        return;
      }
      throw new Error('Missing authGroups from /setup/api/auth-groups');
    }).catch(function (e) {
      console.warn('[setup] authGroups load failed:', e);
      renderAuth([]);
    });
  }

  // ---- Wizard ---------------------------------------------------------------

  $('run').onclick = function () {
    var payload = {
      flow: $('flow').value,
      authChoice: authChoiceEl.value,
      authSecret: $('authSecret').value,
      telegramToken: $('telegramToken').value,
      discordToken: $('discordToken').value,
      slackBotToken: $('slackBotToken').value,
      slackAppToken: $('slackAppToken').value,

      customProviderId: $('customProviderId').value,
      customProviderBaseUrl: $('customProviderBaseUrl').value,
      customProviderApi: $('customProviderApi').value,
      customProviderApiKeyEnv: $('customProviderApiKeyEnv').value,
      customProviderModelId: $('customProviderModelId').value
    };

    logEl.textContent = 'Running...\n';
    $('run').disabled = true;

    fetch('/setup/api/run', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.text();
    }).then(function (text) {
      var j;
      try { j = JSON.parse(text); } catch (_e) { j = { ok: false, output: text }; }
      logEl.textContent += (j.output || JSON.stringify(j, null, 2));
      return refreshStatus();
    }).catch(function (e) {
      logEl.textContent += '\nError: ' + String(e) + '\n';
    }).then(function () {
      $('run').disabled = false;
    });
  };

  $('reset').onclick = function () {
    if (!confirm('Reset setup? This deletes the config file so onboarding can run again.')) return;
    logEl.textContent = 'Resetting...\n';
    fetch('/setup/api/reset', { method: 'POST', credentials: 'same-origin' })
      .then(function (res) { return res.text(); })
      .then(function (t) { logEl.textContent += t + '\n'; return refreshStatus(); })
      .catch(function (e) { logEl.textContent += 'Error: ' + String(e) + '\n'; });
  };

  // ---- Debug console --------------------------------------------------------

  function runConsole() {
    if (!consoleCmdEl || !consoleRunEl) return;
    var cmd = consoleCmdEl.value;
    var arg = consoleArgEl ? consoleArgEl.value : '';
    if (consoleOutEl) consoleOutEl.textContent = 'Running ' + cmd + '...\n';

    return httpJson('/setup/api/console/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cmd: cmd, arg: arg })
    }).then(function (j) {
      if (consoleOutEl) consoleOutEl.textContent = (j.output || JSON.stringify(j, null, 2));
      return refreshStatus();
    }).catch(function (e) {
      if (consoleOutEl) consoleOutEl.textContent += '\nError: ' + String(e) + '\n';
    });
  }

  if (consoleRunEl) consoleRunEl.onclick = runConsole;

  // ---- Config editor --------------------------------------------------------

  function loadConfigRaw() {
    if (!configTextEl) return;
    if (configOutEl) configOutEl.textContent = '';
    return httpJson('/setup/api/config/raw').then(function (j) {
      if (configPathEl) {
        configPathEl.textContent = 'Config file: ' + (j.path || '(unknown)') + (j.exists ? '' : ' (does not exist yet)');
      }
      configTextEl.value = j.content || '';
    }).catch(function (e) {
      if (configOutEl) configOutEl.textContent = 'Error loading config: ' + String(e);
    });
  }

  function saveConfigRaw() {
    if (!configTextEl) return;
    if (!confirm('Save config and restart gateway? A timestamped .bak backup will be created.')) return;
    if (configOutEl) configOutEl.textContent = 'Saving...\n';
    return httpJson('/setup/api/config/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: configTextEl.value })
    }).then(function (j) {
      if (configOutEl) configOutEl.textContent = 'Saved: ' + (j.path || '') + '\nGateway restarted.\n';
      return refreshStatus();
    }).catch(function (e) {
      if (configOutEl) configOutEl.textContent += '\nError: ' + String(e) + '\n';
    });
  }

  if (configReloadEl) configReloadEl.onclick = loadConfigRaw;
  if (configSaveEl) configSaveEl.onclick = saveConfigRaw;

  // ---- Import backup --------------------------------------------------------

  function runImport() {
    if (!importRunEl || !importFileEl) return;
    var f = importFileEl.files && importFileEl.files[0];
    if (!f) {
      alert('Pick a .tar.gz file first');
      return;
    }
    if (!confirm('Import backup? This overwrites files under /data and restarts the gateway.')) return;

    if (importOutEl) importOutEl.textContent = 'Uploading ' + f.name + ' (' + f.size + ' bytes)...\n';

    return f.arrayBuffer().then(function (buf) {
      return fetch('/setup/import', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/gzip' },
        body: buf
      });
    }).then(function (res) {
      return res.text().then(function (t) {
        if (importOutEl) importOutEl.textContent += t + '\n';
        if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + t);
        return refreshStatus();
      });
    }).catch(function (e) {
      if (importOutEl) importOutEl.textContent += '\nError: ' + String(e) + '\n';
    });
  }

  if (importRunEl) importRunEl.onclick = runImport;

  // ---- Pairing --------------------------------------------------------------

  var pairingBtn = $('pairingApprove');
  if (pairingBtn) {
    pairingBtn.onclick = function () {
      var channel = prompt('Enter channel (telegram or discord):');
      if (!channel) return;
      channel = channel.trim().toLowerCase();
      if (channel !== 'telegram' && channel !== 'discord') {
        alert('Channel must be "telegram" or "discord"');
        return;
      }
      var code = prompt('Enter pairing code (e.g. 3EY4PUYS):');
      if (!code) return;
      var out = pairingOutEl || logEl;
      out.textContent += 'Approving pairing for ' + channel + '...\n';
      fetch('/setup/api/pairing/approve', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel: channel, code: code.trim() })
      }).then(function (r) { return r.text(); })
        .then(function (t) { out.textContent += t + '\n'; })
        .catch(function (e) { out.textContent += 'Error: ' + String(e) + '\n'; });
    };
  }

  var devicesRefreshBtn = $('devicesRefresh');
  var devicesListEl = $('devicesList');

  function approveDevice(requestId) {
    if (!requestId) return;
    if (!confirm('Approve device request ' + requestId + '?')) return;
    if (devicesListEl) devicesListEl.textContent = 'Approving ' + requestId + '...';

    return httpJson('/setup/api/devices/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestId: requestId })
    }).then(function (j) {
      if (devicesListEl) devicesListEl.textContent = j.output || 'Approved.';
      return refreshStatus();
    }).catch(function (e) {
      if (devicesListEl) devicesListEl.textContent = 'Error: ' + String(e);
    });
  }

  function refreshDevices() {
    if (!devicesListEl) return;
    devicesListEl.textContent = 'Loading pending devices...';
    return httpJson('/setup/api/devices/pending').then(function (j) {
      var ids = j.requestIds || [];
      if (!ids.length) {
        devicesListEl.textContent = 'No pending device requests found.';
        return;
      }
      devicesListEl.innerHTML = '';
      for (var i = 0; i < ids.length; i++) {
        (function (id) {
          var row = document.createElement('div');
          row.className = 'row';
          row.style.marginTop = '0.35rem';
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn sm';
          btn.textContent = 'Approve';
          btn.onclick = function () { approveDevice(id); };
          var code = document.createElement('code');
          code.textContent = id;
          row.appendChild(btn);
          row.appendChild(code);
          devicesListEl.appendChild(row);
        })(ids[i]);
      }
    }).catch(function (e) {
      devicesListEl.textContent = 'Error: ' + String(e);
    });
  }

  if (devicesRefreshBtn) devicesRefreshBtn.onclick = refreshDevices;

  // ---- Boot -----------------------------------------------------------------

  // Populate provider/auth selects ASAP (fast endpoint, no subprocesses)
  loadAuthGroupsFast();

  // Load the rest of status (version/help) in parallel
  refreshStatus();
})();
