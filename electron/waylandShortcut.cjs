// Wayland global shortcut support.
//
// On Wayland, globalShortcut works via the XDG GlobalShortcuts portal (KDE, GNOME 48+).
// For GNOME < 48 (e.g. Ubuntu 24.04 LTS) the portal isn't available, so we offer to
// configure a GNOME custom keybinding via gsettings instead.
// For other Wayland compositors without portal support we show a one-time setup dialog.

const { app, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

let log = () => {};
function init(logFn) { log = logFn; }

// Convert Electron accelerator ("Shift+Space") to XKB format ("<Shift>space") for gsettings
function electronToXkb(shortcut) {
  const parts = shortcut.split('+');
  const key = parts.pop().toLowerCase();
  const mods = parts.map(m => {
    switch (m.toLowerCase()) {
      case 'shift':   return '<Shift>';
      case 'ctrl':
      case 'control': return '<Control>';
      case 'alt':     return '<Alt>';
      case 'super':
      case 'meta':    return '<Super>';
      default:        return `<${m}>`;
    }
  });
  return mods.join('') + key;
}

let _gnomeMajorVersion;
function getGnomeMajorVersion() {
  if (_gnomeMajorVersion !== undefined) return _gnomeMajorVersion;
  try {
    const r = spawnSync('gnome-shell', ['--version'], { encoding: 'utf8' });
    const m = r.stdout.match(/GNOME Shell (\d+)/);
    _gnomeMajorVersion = m ? parseInt(m[1]) : null;
  } catch (e) { _gnomeMajorVersion = null; }
  return _gnomeMajorVersion;
}

const GNOME_BINDING_PATH = '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/wisper/';
const GNOME_CUSTOM_SCHEMA = `org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:${GNOME_BINDING_PATH}`;
const GNOME_MEDIA_SCHEMA = 'org.gnome.settings-daemon.plugins.media-keys';

function gsettings(...args) {
  const r = spawnSync('gsettings', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr?.trim() || `gsettings ${args[0]} failed`);
  return r.stdout.trim();
}

function updateGnomeShortcut(shortcut) {
  try {
    gsettings('set', GNOME_CUSTOM_SCHEMA, 'binding', electronToXkb(shortcut));
    log('info', `GNOME shortcut updated to ${electronToXkb(shortcut)}`);
  } catch (e) {
    log('warn', `Failed to update GNOME shortcut: ${e.message}`);
  }
}

function setupGnomeShortcut(shortcut, execPath) {
  const flagFile = path.join(app.getPath('userData'), '.wayland-gnome-configured');
  const xkbBinding = electronToXkb(shortcut);
  try {
    gsettings('set', GNOME_CUSTOM_SCHEMA, 'name', 'Wisper Toggle');
    gsettings('set', GNOME_CUSTOM_SCHEMA, 'command', execPath);
    gsettings('set', GNOME_CUSTOM_SCHEMA, 'binding', xkbBinding);

    // Add our path to the keybindings list if not already present
    const existing = gsettings('get', GNOME_MEDIA_SCHEMA, 'custom-keybindings');
    if (!existing.includes('wisper')) {
      const paths = existing === '@as []' ? [] :
        existing.slice(1, -1).split(',').map(p => p.trim().replace(/'/g, '')).filter(Boolean);
      paths.push(GNOME_BINDING_PATH);
      gsettings('set', GNOME_MEDIA_SCHEMA, 'custom-keybindings',
        `[${paths.map(p => `'${p}'`).join(', ')}]`);
    }

    fs.writeFileSync(flagFile, '');
    log('info', `GNOME shortcut configured: "${xkbBinding}" → ${execPath}`);
    dialog.showMessageBox({
      type: 'info',
      title: 'Shortcut configured',
      message: `Global shortcut "${shortcut}" is set up.`,
      detail: 'Manage it anytime in GNOME Settings → Keyboard → Custom Shortcuts.',
      buttons: ['OK'],
    });
  } catch (e) {
    log('error', `Failed to configure GNOME shortcut: ${e.message}`);
    dialog.showMessageBox({
      type: 'error',
      title: 'Shortcut setup failed',
      message: 'Could not configure the GNOME shortcut automatically.',
      detail: `${e.message}\n\nSet it up manually in GNOME Settings → Keyboard → Custom Shortcuts.`,
      buttons: ['OK'],
    });
  }
}

// Called when the portal isn't available (GNOME < 48, wlroots without portal, etc.)
// Offers gsettings automation on old GNOME, or a one-time manual-setup dialog elsewhere.
function check(shortcut) {
  const isGnome = (process.env.XDG_CURRENT_DESKTOP || '').toLowerCase().includes('gnome');

  if (isGnome) {
    const gnomeVersion = getGnomeMajorVersion();
    if (gnomeVersion !== null && gnomeVersion >= 48) return; // portal handles it

    const flagFile = path.join(app.getPath('userData'), '.wayland-gnome-configured');
    if (fs.existsSync(flagFile)) {
      // Already configured — silently keep the binding in sync with any shortcut change
      updateGnomeShortcut(shortcut);
      return;
    }

    const promptedFlag = path.join(app.getPath('userData'), '.wayland-shortcut-prompted');
    if (fs.existsSync(promptedFlag)) return;
    fs.writeFileSync(promptedFlag, '');

    const execPath = process.env.APPIMAGE || app.getPath('exe');
    dialog.showMessageBox({
      type: 'info',
      title: 'Wayland shortcut setup',
      message: 'Set up global shortcut in GNOME?',
      detail:
        `On this GNOME version, Wisper needs a desktop keyboard shortcut to toggle recording from anywhere.\n\n` +
        `Wisper can configure this automatically for "${shortcut}", ` +
        `or you can do it manually in GNOME Settings → Keyboard → Custom Shortcuts.`,
      buttons: ['Set Up Automatically', 'Do It Manually'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) setupGnomeShortcut(shortcut, execPath);
    });
  } else {
    // Non-GNOME Wayland without portal (wlroots compositors, etc.) — show instructions once
    const promptedFlag = path.join(app.getPath('userData'), '.wayland-shortcut-prompted');
    if (fs.existsSync(promptedFlag)) return;
    fs.writeFileSync(promptedFlag, '');

    dialog.showMessageBox({
      type: 'info',
      title: 'Wayland global shortcut',
      message: 'Global shortcut setup needed',
      detail:
        `To use "${shortcut}" from any app, add a custom keyboard shortcut in your ` +
        `desktop environment's settings with this command:\n\n` +
        `  ${process.env.APPIMAGE || app.getPath('exe')}\n\n` +
        `The shortcut works when the Wisper window is focused in the meantime.`,
      buttons: ['OK'],
    });
  }
}

module.exports = { init, check };
