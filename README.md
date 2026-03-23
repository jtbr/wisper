# Wisper

Wisper is a WisprFlow-like voice dictation application for Linux. It provides seamless voice-to-text integration using AI transcription, allowing you to dictate anywhere and have text delivered instantly to your cursor.

## Features

- **Global Hotkey** - Press hotkey to start/stop recording from anywhere
- **Flexible Output** - Choose how transcribed text is delivered: **Paste** (default, instant, clipboard-based), **Type** (character-by-character via ydotool), or **Clipboard** (copy only, paste manually)
- **AI Transcription** - Transcribe audio using OpenAI Whisper via Groq, OpenAI, or any compatible local/custom endpoint
- **Unlimited Recording Length** - Voice Activity Detection (VAD) segments long dictations at natural pauses; each segment is sent to Whisper concurrently, so there is no time limit on recordings
- **LLM Formatting Pass** - Optional post-processing by an LLM to fix punctuation, remove filler words, and clean up speech artefacts
- **Multilingual** - Supports 99+ languages with automatic detection
- **Minimal UI** - Slim, transparent recording bar with real-time audio waveform
- **System Tray** - Quick access to settings and app controls
- **Wayland & X11 Support** - Works on both display servers
- **Privacy First** - Records locally before sending to API. Both the transcription and formatting endpoints can be local (e.g. [`speaches`](https://speaches.ai) for Whisper, [`ollama`](https://ollama.com) for LLM)
- **Auto-start & Warm-up** - Wisper can start local servers automatically on first use and pre-load models into GPU memory to reduce first-request latency

## Requirements

- Linux (Debian/Ubuntu 22.04+)
- Microphone access
- Internet connection (for cloud API calls) or a local model server
- **ydotool** - Required for **Paste** (default) and **Type** output modes (install instructions below); not needed for **Clipboard** mode
- **Wayland users**: Need to set up custom keyboard shortcut (see Wayland Setup below)

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/taraksh01/wisper.git
cd wisper

# Install dependencies
pnpm install

# Run in development
pnpm run electron:dev

# Build for production
pnpm run build
pnpm run package
```

### Install ydotool

[`ydotool`](https://github.com/ReimuNotMoe/ydotool) is responsible for sending the speech output into the active input field.

Pre-packaged versions are available but may be older versions:

```bash
# Ubuntu/Debian
sudo apt install ydotool

# Fedora
sudo dnf install ydotool

# Arch Linux
sudo pacman -S ydotool
```

In case of trouble (see #Troubleshooting), you may want to use the [latest release](https://github.com/ReimuNotMoe/ydotool/releases/latest):

**Installing and running `ydotoold` as a service** is also recommended. This improves responsiveness and reliability. If your package manager doesn't provide a service config (as ubuntu's doesn't), you can get the `systemd` config [here](https://github.com/ReimuNotMoe/ydotool/raw/refs/heads/master/Daemon/systemd/ydotoold.service.in). Save it as `$HOME/.config/systemd/user/ydotoold.service`, and edit so that `ExecStart` points to `which ydotoold`. Then do this once:

```sh
systemctl --user daemon-reload
systemctl --user start ydotoold   # runs service as the current user
systemctl --user status ydotoold  # check that it's successfully running
systemctl --user enable ydotoold  # to run it automatically at boot
```

### From Release

Download the latest `.AppImage` or `.deb` package from the [Releases](https://github.com/taraksh01/wisper/releases) page.

## Usage

### First Time Setup

1. Right-click the system tray icon and select **Settings**
2. Choose your transcription provider:
   - **Groq**: Free, fast Whisper models (recommended)
   - **OpenAI**: Official Whisper API
   - **Custom**: Any OpenAI transcription-API-compatible endpoint (e.g. locally-served)
3. Enter your API key (optional for custom)
4. Optionally configure a **Formatting** (LLM) provider for post-processing
5. On the **Usability** tab, choose your **Output** method (default: **Paste**):
   - **Paste**: Text is pasted instantly via clipboard — works in terminals and GUI apps, atomic, no cursor-move corruption
   - **Type**: Characters typed one-by-one via ydotool — slower, lets you watch text appear as it's written
   - **Clipboard**: Text is copied to clipboard only — paste manually with Ctrl+V; no ydotool required
6. On the **Usability** tab, choose Wisper's *hotkey* (`Shift-Space` by default)

### Recording

1. Press your *hotkey* to start recording (bar appears)
2. When the chime sounds and the bar turns red, **speak into your microphone** — there is no time limit
3. Press your *hotkey* again to stop — a second chime plays and a thinking indicator appears while your speech is transcribed
4. Text is delivered to your cursor — pasted instantly by default (see Output mode in Settings)

### System Tray

- **Left-click**: Toggle recording (same as hotkey-press)
- **Right-click**: Open menu (Settings, Quit)

## Wayland Setup (GNOME/Debian)

On Wayland, global shortcuts must be configured through your desktop environment.

### Set Up Keyboard Shortcut

1. Open **Settings** → **Keyboard** → **Keyboard Shortcuts** → **View and Customize Shortcuts**
2. Scroll to bottom and click **Custom Shortcuts**
3. Click **Add Shortcut** (+)
4. Configure:
   - **Name**: `Wisper Toggle`
   - **Command**: `wisper` (or path to AppImage)
   - **Shortcut**: Press `Shift+Space`
5. Click **Add**

**Note**: Running Wisper while it's already running will toggle recording (single-instance behavior).

For AppImage:
```bash
/path/to/Wisper.AppImage --no-sandbox
```

For development:
```bash
/usr/bin/electron /path/to/wisper --no-sandbox
```

## Configuration

### Transcription

| Provider | Model | Cost | Get API Key |
|----------|-------|------|-------------|
| **Groq** (Recommended) | `whisper-large-v3-turbo` | Free tier | [console.groq.com](https://console.groq.com/) |
| **OpenAI** | `whisper-1` | Paid | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Custom** | Any OpenAI-compatible ASR endpoint | Free if local | — |

For the **Custom** provider, set the full endpoint URL (e.g. `http://localhost:8000/v1/audio/transcriptions`) and the model name as the server expects it. [`speaches`](https://speaches.ai) is a good self-hosted option.

### LLM Formatting (optional)

After transcription, Wisper can send the raw transcript to an LLM to clean it up: fixing punctuation, removing filler words ("um", "uh"), and correcting verbal course corrections. The system prompt is fully editable in settings.

| Provider | Default model | Cost | Notes |
|----------|--------------|------|-------|
| **Groq** | `llama-3.3-70b-versatile` | Free tier | Uses your Groq API key from the transcription tab |
| **OpenAI** | `gpt-4.1-mini` | Paid | Uses your OpenAI API key from the transcription tab |
| **Custom** | — | Free if local | Default URL: `http://localhost:11434/v1/chat/completions` ([ollama](https://ollama.com)) |

For the **Custom** provider, it's best to use a model with at least 8B parameters to work reasonably well and avoid problems. If you can't run that locally and don't want to use another service, you can disable LLM formatting altogether. The results are still mostly pretty good.

### Local / Custom Servers

For both the transcription and LLM providers, the **Start Command** field (under Custom settings) lets Wisper auto-start the server when it isn't running. On first recording, Wisper health-checks each configured custom endpoint. If the check fails and a start command is set, it runs that command and waits up to 15 seconds for the server to respond before proceeding.

Wisper also sends a warm-up request to each custom endpoint on first use (and periodically thereafter, every 5 minutes by default) to pre-load the model into GPU memory. This avoids the long first-request delay that occurs when models are loaded on demand.

#### Speaches docker setup

If you don't already have `speaches`, but you have `docker compose` you can set it to run automatically with zero install simply by adding `docker compose -f https://github.com/speaches-ai/speaches.git#master:compose.cuda-cdi.yaml up --detach` as the transcription start command (this `yaml` file assumes you have an Nvidia GPU with CDI support, adjust as necessary). The first time you're running you'll need to [download a Whisper STT model as described here](https://speaches.ai/usage/model-discovery/#__tabbed_1_2), for example `Systran/faster-distil-whisper-large-v3`. That's it!

### Settings Reference

| Setting | Where | Description |
|---------|-------|-------------|
| Provider | Transcription tab | Groq, OpenAI, or Custom |
| API Key | Transcription tab | Provider API key |
| API URL | Transcription tab (Custom) | Full transcription endpoint URL |
| Model name | Transcription tab (Custom) | Model identifier as the server expects |
| Start Command | Transcription tab (Custom) | Shell command to launch the server if not running (e.g. `speaches serve`) |
| Output | Usability tab | How text is delivered: `Paste` (default), `Type`, or `Clipboard` |
| Shortcut | Usability tab | Global hotkey |
| Formatting provider | Formatting tab | None, Groq, OpenAI, or Custom |
| Language Model | Formatting tab | LLM model name |
| API URL | Formatting tab (Custom) | Full chat completions endpoint URL |
| API Key | Formatting tab (Custom) | Optional bearer token |
| Start Command | Formatting tab (Custom) | Shell command to launch the LLM server (e.g. `ollama serve`) |
| System Prompt | Formatting tab | Instructions sent to the LLM; editable |

## Building

```bash
# Development
pnpm run dev              # Start Vite dev server only
pnpm run electron:dev     # Start Electron with hot reload

# Production
pnpm run build            # Build React app
pnpm run package          # Create distributables (.AppImage, .deb)
```

## Troubleshooting

Wisper logs to `/tmp/wisper.log`. When something goes wrong, check there first.

### Text not being typed / ydotool not working

If you're using **Paste** (default) or **Type** output mode, Wisper depends on ydotool. Switch to **Clipboard** mode in Settings to eliminate this dependency entirely (you will need to paste the result yourself)

- Test manually: `ydotool type "hello"` — the word should appear in your terminal
- Ensure ydotool is installed and the daemon (`ydotoold`) is running
- The user running Wisper needs write access to `/dev/uinput`. Either:
  ```bash
  sudo chmod 666 /dev/uinput
  ```
  or follow [this procedure](https://github.com/ReimuNotMoe/ydotool/issues/36#issuecomment-788148567) to add yourself to the `input` group persistently
- On Wayland, some compositors require additional permissions — check your distro's ydotool notes

### Global shortcut not working on Wayland

- Set up a custom keyboard shortcut in your DE's settings (see Wayland Setup above)
- Running Wisper again from the command line toggles recording — useful as a fallback

### Microphone access denied

- Grant microphone permission in system settings
- Check if another application has exclusive microphone access

### Transcription errors

When transcription fails, Wisper plays a buzzer sound, displays the error message in the recording pill for ~3.5 seconds, then dismisses. Nothing is typed. Common messages:

| Message | Likely cause |
|---------|-------------|
| `Whisper server unreachable` | Custom server isn't running. Set a **Start Command** in Settings, or start it manually |
| `Network error` | No internet connection (Groq/OpenAI) |
| `Bad API key` | API key is missing or invalid — check Settings |
| `Rate limited` | Hit the provider's rate limit — wait a moment and retry |
| `Bad endpoint URL` | Custom URL is wrong — it must include the full path, e.g. `/v1/audio/transcriptions` |
| `Whisper server error` | Server returned 5xx — check the server's own logs |

### Custom server: health check or warm-up failing

- Check `/tmp/wisper.log` for `Health check failed` or `warm-up` entries
- Confirm the server is running: `curl http://localhost:8080/v1/models`
- Confirm the model name in Settings matches exactly what the server reports in the models list
- If auto-start is configured, check that the command works when run manually in a terminal

### Transcription is slow on first recording

This is normal when using a local server — the model needs to be loaded into GPU memory. Wisper sends a warm-up request on first use to trigger this early. If warm-up isn't helping, check `/tmp/wisper.log` for warm-up errors.

### LLM formatting not working

- Ensure the Formatting provider is set (not "Off") in the Formatting tab
- For Custom: verify the API URL points to a `/v1/chat/completions` endpoint and the model name is correct
- Check `/tmp/wisper.log` for `LLM post-processing failed` errors
- The raw transcript is used as fallback if the LLM call fails, so dictation still works

## License

MIT License - see LICENSE file for details

## Author

Tarak Shaw - [@taraksh01](https://github.com/taraksh01)

## Acknowledgments

- Inspired by [WisprFlow](https://wisprflow.com)
