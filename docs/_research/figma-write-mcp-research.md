# Write-Capable Figma MCP Research

Research date: 2026-04-08
For: sc-site project, target file https://www.figma.com/design/XHM9Qj7mtaV62lfWZfAKWq/Untitled
Pedro's hardware: Raspberry Pi 4 ARM64 (Claude Code host) + Fedora workstation with Brave (Figma browser host)

---

## 1. Verdict

**Top pick: `grab/cursor-talk-to-figma-mcp`**
- GitHub: https://github.com/grab/cursor-talk-to-figma-mcp
- Note: the canonical `sonnylazuardi/cursor-talk-to-figma-mcp` repo was transferred to the Grab org and is now actively maintained there. Old links redirect.
- Stars: 6,635
- Last push: 2026-03-07 (one month old, repo updated 2026-04-08)
- Open issues: 77 (active triage)
- License: MIT
- Runtime: Bun
- Figma Community plugin: https://www.figma.com/community/plugin/1485687494525374295/cursor-talk-to-figma-mcp-plugin

**Why this one over alternatives:**

This is the only mature, write-capable Figma MCP whose Figma plugin is **published on the Figma Community store** (so it works in Figma browser, which is mandatory for Pedro since Figma Desktop has no Linux ARM/x64 build that ships on Fedora). It has 6.6k stars, is now backed by an actual engineering org (Grab), has ~30 distinct write tools covering frames, rectangles, text, fills, strokes, corner radius, auto-layout, component instances, and node manipulation. The runner-up `vkhanhqui/figma-mcp-go` (392 stars, 58 tools, Go runtime, would build cleanly on ARM64) actually has a *richer* tool surface — it includes Figma Variables, full style CRUD, and prototype reactions — but its plugin is distributed only as a manifest.json import requiring **Figma Desktop**, which Pedro cannot run on Fedora. That single fact disqualifies it. Framelink (`GLips/Figma-Context-MCP`, 14k stars) remains read-only as of v0.8.1 (2026-04-07); confirmed against its CHANGELOG, no write tools added.

**Important caveat — the localhost allowlist**: the cursor-talk-to-figma-mcp Figma plugin's `manifest.json` allows network access only to `ws://localhost:3055`. Since Pedro will run the MCP/WebSocket server on the Pi and the plugin in Brave on Fedora, he cannot use the Community-published plugin as-is — Figma sandboxing will block the cross-host WebSocket. Two workable options:
1. **SSH port forward** `localhost:3055` (Fedora) → `100.105.42.81:3055` (Pi). The plugin sees `localhost` and is happy. Simplest.
2. Fork the plugin, add the Tailscale IP/host to `networkAccess.allowedDomains`, sideload via "Plugins → Development → Import plugin from manifest" in the Figma browser editor (browser supports dev plugins). Tedious.

Option 1 is what this report recommends.

---

## 2. Architecture diagram

```
+------------------------------------------+      +------------------------------------------+
|  Raspberry Pi 4 (ARM64, Tailscale host)  |      |  Fedora workstation (Brave browser)      |
|  100.105.42.x                            |      |                                          |
|                                          |      |  +------------------------------------+  |
|  +------------------+                    |      |  |  figma.com/design/XHM9...          |  |
|  |  Claude Code     |                    |      |  |                                    |  |
|  |  (CLI process)   |                    |      |  |  +------------------------------+  |  |
|  +--------+---------+                    |      |  |  |  Cursor MCP Plugin           |  |  |
|           | stdio                        |      |  |  |  (running inside Figma       |  |  |
|           v                              |      |  |  |   plugin sandbox iframe)     |  |  |
|  +------------------+                    |      |  |  |                              |  |  |
|  |  MCP server      |                    |      |  |  |  WebSocket client            |  |  |
|  |  (bunx           |                    |      |  |  |  -> ws://localhost:3055      |  |  |
|  |   cursor-talk-   |                    |      |  |  +-------------+----------------+  |  |
|  |   to-figma-mcp)  |                    |      |  +----------------|-----------------+  |
|  +--------+---------+                    |      |                   | (browser localhost)|
|           | ws://localhost:3055          |      |                   v                    |
|           v                              |      |  +------------------------------------+ |
|  +------------------+                    |      |  |  ssh -L 3055:localhost:3055        | |
|  |  bun socket      |<---- ssh tunnel ---+------+--+  pedro@100.105.42.x                | |
|  |  WS bridge       |    (3055 forwarded |      |  |  (keeps tunnel alive)              | |
|  |  :3055           |     reverse from   |      |  +------------------------------------+ |
|  +------------------+     Fedora's pov)  |      |                                          |
|                                          |      |                                          |
+------------------------------------------+      +------------------------------------------+
```

Flow of a single tool call:
1. Claude (running on the Pi) decides to call `mcp__TalkToFigma__create_frame`
2. MCP server (also on Pi) translates that to a JSON message and pushes it onto its WebSocket connection to the local `bun socket` bridge
3. Bridge fans the message out to whichever channel the Figma plugin has joined
4. Plugin (in Brave on Fedora, reading `localhost:3055` which is the SSH-forwarded Pi port) receives the message
5. Plugin runs `figma.createFrame(...)` inside the Figma plugin sandbox — the canvas updates live
6. Plugin sends the result/new node id back over the same WebSocket
7. MCP server returns it to Claude

There are **three processes on the Pi**: Claude Code, the MCP stdio server, and the `bun socket` WebSocket bridge. The MCP server and the bridge are separate — the README is explicit that you must `bun socket` in another shell.

---

## 3. Install steps — Pi side (MCP server)

All commands run as `pedro@raspberrypi`. The Pi needs Bun (works on linux-arm64 — Bun publishes ARM64 builds since v1.0).

```bash
# 1. Install Bun (one-time)
curl -fsSL https://bun.sh/install | bash
# Adds ~/.bun/bin to PATH; reload your shell or `source ~/.bashrc`
bun --version    # should print >= 1.1.x

# 2. Clone the repo
cd ~
git clone https://github.com/grab/cursor-talk-to-figma-mcp.git
cd cursor-talk-to-figma-mcp

# 3. Install JS deps
bun install

# 4. (Optional) build / setup helper provided by the project
bun setup
```

There is **no compiled binary** — the MCP server is a Bun/TypeScript script invoked via `bunx cursor-talk-to-figma-mcp@latest`. Two things must be running on the Pi at all times:

```bash
# Terminal A: WebSocket bridge (binds 0.0.0.0... actually NO, by default localhost only)
cd ~/cursor-talk-to-figma-mcp
bun socket
# Listens on port 3055. By default binds to 127.0.0.1.
# In src/socket.ts there's a commented `hostname: "0.0.0.0"` line — leave it commented;
# we'll reach it via SSH tunnel, not by exposing the port to Tailscale.
```

The MCP server binary itself is launched by Claude Code on demand via stdio (see section 5), so Pedro does not run it manually.

**Systemd unit for the WebSocket bridge** (so it survives reboots):

```ini
# ~/.config/systemd/user/figma-mcp-bridge.service
[Unit]
Description=cursor-talk-to-figma-mcp WebSocket bridge
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/pedro/cursor-talk-to-figma-mcp
ExecStart=/home/pedro/.bun/bin/bun socket
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
```

Enable it:
```bash
systemctl --user daemon-reload
systemctl --user enable --now figma-mcp-bridge.service
loginctl enable-linger pedro   # so the user service runs even when not logged in
systemctl --user status figma-mcp-bridge.service
ss -ltnp | grep 3055           # confirm 127.0.0.1:3055 is listening
```

**Port summary:** TCP 3055, bound to `127.0.0.1` only on the Pi. No auth, no TLS — that's why we keep it on loopback and tunnel it.

---

## 4. Install steps — Figma side (plugin)

Pedro runs Figma in **Brave on Fedora** (`figma.com/design/...`). Figma's web editor fully supports plugins, including dev-installed ones.

**Step-by-step:**

1. Open Brave on Fedora and navigate to https://www.figma.com/design/XHM9Qj7mtaV62lfWZfAKWq/Untitled
2. (One time) install the plugin from Community:
   - Open https://www.figma.com/community/plugin/1485687494525374295/cursor-talk-to-figma-mcp-plugin
   - Click **Open in...** → **Try it out** (this also adds the plugin to Pedro's account)
3. **Open the SSH tunnel from Fedora to the Pi** — run this in a Fedora terminal **before** launching the plugin, and keep it open:
   ```bash
   ssh -N -L 3055:localhost:3055 pedro@100.105.42.81
   ```
   (`-N` = no remote command, just forwarding. `-L 3055:localhost:3055` = "anything that hits Fedora's localhost:3055 gets sent to the Pi where it lands on the Pi's localhost:3055 — i.e. the `bun socket` bridge".)
   To make it survive: install `autossh` and run `autossh -M 0 -N -L 3055:localhost:3055 pedro@100.105.42.81` instead, or create a systemd user unit on Fedora.
4. Back in the Figma file, open the plugin: top menu **Plugins → Development → Cursor Talk To Figma MCP Plugin** (or search for it in `Resources → Plugins`).
5. The plugin window opens. It will auto-attempt to connect to `ws://localhost:3055`. From the plugin's point of view that's Fedora's localhost — but our SSH tunnel transparently makes that the Pi's `bun socket`.
6. The plugin UI shows a **channel ID** (a short string). Copy it. This is the join key the MCP server uses to route messages to this specific plugin instance — the same bridge can serve many simultaneous Figma files.
7. Inside Claude Code, the first thing Claude must do is call `mcp__TalkToFigma__join_channel` with that channel ID. After that, all subsequent tool calls will reach this Figma file.

**WebSocket URL the plugin uses:** hardcoded to `ws://localhost:3055`. **Do not** try to point it at `ws://100.105.42.81:3055` directly — Figma's plugin sandbox enforces `manifest.json`'s `networkAccess.allowedDomains`, and that list contains only `ws://localhost:3055`. The whole reason we use the SSH tunnel is to satisfy that allowlist.

**If Pedro insists on no SSH tunnel** (alternative path, more work):
- Fork the repo, edit `src/cursor_mcp_plugin/manifest.json`, add `"ws://100.105.42.81:3055"` to `networkAccess.allowedDomains`
- In Brave open Figma, **Plugins → Development → Import plugin from manifest...** and pick the forked `manifest.json`
- Edit `src/socket.ts` on the Pi to uncomment `hostname: "0.0.0.0"` so the bridge listens on Tailscale
- Edit the plugin's `code.js` (or wherever the `new WebSocket(...)` call lives) to use the Tailscale URL
- Re-publish/rebuild
- Accept that there's now an unauthenticated WebSocket on Tailscale — fine since Tailscale is private, but less hygienic

The SSH tunnel is strictly easier and recommended.

---

## 5. Claude Code MCP config

Run on the Pi:

```bash
claude mcp add --scope user TalkToFigma \
  --command bunx \
  --args cursor-talk-to-figma-mcp@latest
```

This writes into `~/.claude/mcp_servers.json` (user scope, so available across all projects, not just sc-site). After Pedro restarts Claude Code (or runs `/mcp` and sees TalkToFigma listed as connected), tools become available with the prefix `mcp__TalkToFigma__*`, e.g. `mcp__TalkToFigma__create_frame`.

To verify:
```bash
claude mcp list
# expect: TalkToFigma  bunx cursor-talk-to-figma-mcp@latest  (user)
```

If `claude mcp add` flag syntax differs in Pedro's CLI version, the equivalent JSON entry to drop into `~/.claude/mcp_servers.json` is:
```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "bunx",
      "args": ["cursor-talk-to-figma-mcp@latest"]
    }
  }
}
```

Note: the MCP server binary connects to `ws://localhost:3055` from the Pi's loopback, where it finds the `bun socket` bridge (section 3). No env vars needed for the basic flow.

---

## 6. Tool surface

Confirmed against the Grab repo's README, organised by capability.

**Document & selection (read)**
- `get_document_info`
- `get_selection`
- `read_my_design`
- `get_node_info`
- `get_nodes_info`
- `set_focus`
- `set_selections`

**Channel / connection**
- `join_channel` — must be called once per session to bind to the Figma file's plugin instance

**Create geometry & text**
- `create_rectangle`
- `create_frame`
- `create_text`

**Modify text**
- `scan_text_nodes`
- `set_text_content`
- `set_multiple_text_contents` (bulk)

**Auto-layout** (this is the critical one for "responsive-ish" layouts)
- `set_layout_mode` (HORIZONTAL/VERTICAL/NONE)
- `set_padding`
- `set_axis_align`
- `set_layout_sizing` (FIXED/HUG/FILL)
- `set_item_spacing`

**Styling**
- `set_fill_color`
- `set_stroke_color`
- `set_corner_radius`

**Layout / hierarchy**
- `move_node`
- `resize_node`
- `delete_node`
- `delete_multiple_nodes`
- `clone_node`

**Components (read + instance only — see gotchas)**
- `get_styles`
- `get_local_components` (includes existing component sets / variants metadata)
- `create_component_instance`
- `get_instance_overrides`
- `set_instance_overrides`

**Annotations & prototyping**
- `get_annotations`
- `set_annotation`
- `set_multiple_annotations`
- `scan_nodes_by_types`
- `get_reactions`
- `set_default_connector`
- `create_connections`

**Export**
- `export_node_as_image`

Total: ~36 tools. Roughly 2/3 are write-side.

---

## 7. Known limitations / gotchas

- **No Figma Variables support.** Confirmed: README has no variables tool, and issue #135 ("Add Figma variables support") is open and unresolved. For sc-site this means design tokens (colors, spacing scales, typography sizes) cannot be created as proper Figma Variables — they have to live as **local paint/text styles** (which the tool surface does not directly create either, beyond what's accessible via `get_styles`). The cleanest workaround is to keep tokens in code (sc-site already has Tailwind / CSS vars) and pass literal values to `set_fill_color` etc. The Figma file becomes a render target, not the source of truth.
- **No tool to *create* a component from scratch or define variants.** You can read components (`get_local_components`) and instantiate them (`create_component_instance`) and override instance properties, but the canonical "make a Card component with variants {state: default, hover, pressed}" workflow is not exposed. Pedro would have to manually create the master component + variants in the Figma UI once, then let Claude instantiate and override.
- **No font family parameter on `create_text` / `set_text_content`.** Issue #138 is open. Text inherits whatever the default font is.
- **Figma plugin sandbox `allowedDomains` blocks non-localhost WebSocket targets** — covered in section 4. SSH tunnel is the workaround.
- **Plugin must be open in the Figma file when Claude calls tools — there is no queue.** If Pedro closes the plugin window or navigates away from the file, tool calls will time out. Reconnect by reopening the plugin and re-running `join_channel` with the same channel ID.
- **Browser support: yes, this works in Figma in any modern browser, Brave included.** Figma's plugin runtime is identical between desktop and web — the manifest declares `editorType: ["figma","figjam"]` with no platform restriction. (Verified against `manifest.json`.)
- **No rate limit issue from Figma's side** because the plugin uses the in-process Figma plugin API, not the public REST API. There is, however, a practical throughput limit: every tool call is one WebSocket round-trip plus one Figma render, so creating 500 rectangles in one shot is slow (tens of seconds). Use `set_multiple_text_contents` and similar bulk tools where they exist.
- **Security: unauthenticated WebSocket bridge.** Open issue #163 documents this and #148 reports a high-severity transitive `@modelcontextprotocol/sdk` CVE. For Pedro, the loopback-only binding plus SSH tunnel mitigates the network exposure. He should not enable `hostname: "0.0.0.0"` on the Pi.
- **Works fine on files with existing content** — operations are scoped via node IDs from `get_document_info` / `get_selection`, so the empty-canvas constraint in the prompt is not a constraint, it's just a clean starting state.
- **No memory-leak / crash issues currently topping the issue tracker** — the open issues are mostly feature requests and one CVE bump. No reconnect-loop reports.
- **Bun on Pi 4 ARM64**: Bun ships official linux-aarch64 builds, no compilation needed, ~50MB install. Works on Raspberry Pi OS Bookworm.

---

## 8. Time estimate to productive use

Assuming Pedro starts from zero and follows this report sequentially, with no surprises:

| Step | Minutes |
|---|---|
| Install Bun on Pi | 2 |
| `git clone` + `bun install` | 3 |
| Write & enable systemd unit for `bun socket` | 5 |
| `claude mcp add TalkToFigma` + restart Claude Code | 2 |
| Open Figma file in Brave on Fedora, add plugin from Community | 3 |
| Open SSH tunnel from Fedora to Pi | 1 |
| Open plugin in Figma, copy channel ID, run `join_channel` from Claude | 3 |
| First test call (`create_rectangle` to verify end-to-end) | 1 |
| **Total** | **~20 minutes** |

Realistic with one or two debugging detours: **30–45 minutes**.

---

## 9. Fallback plan

**If `grab/cursor-talk-to-figma-mcp` is broken or the SSH-tunnel hack proves unworkable:**

**Second pick:** `vkhanhqui/figma-mcp-go` — https://github.com/vkhanhqui/figma-mcp-go (392 stars, Go, last push 2026-04-06, MIT). It has a richer 58-tool surface including Figma Variables (which the top pick lacks!), full styles CRUD, prototype reactions, ellipse/image creation. Compiles to a single static binary on linux-arm64 (`GOOS=linux GOARCH=arm64 go build`). The dealbreaker today is that **its Figma plugin is distributed as a `manifest.json` to sideload via "Plugins → Development → Import plugin from manifest"**, which Figma's web editor *does* support — so contrary to my earlier worry, this might actually work in browser. Worth a 20-minute test if the top pick fails. The plugin source is in the same repo so the localhost-allowlist trick is also editable here.

**Third pick:** Fork the top pick, fix the issues yourself. The plugin code is small (`src/cursor_mcp_plugin/code.js` is the bulk), and adding a font-family arg to `create_text` is a one-line patch.

**No-MCP fallback (REST-API-only writes):** Figma's public REST API is read-mostly, but it does expose **`POST /v1/files/:file_key/comments`** (comments only) and **`POST /v1/webhooks/v2`**. There is **no REST endpoint to create frames, rectangles, text nodes, or styles** — Figma intentionally gates write access through the plugin runtime. So a "REST-only" path can't replace this MCP. The only true alternative is the official Figma MCP from Figma themselves (`figma.com/dev-mode-mcp`), which requires Figma Desktop and is gated to Dev Mode / paid seats — non-starter on Linux. There is no Linux-friendly write-to-Figma path that does not go through a browser plugin.

**If everything breaks:** Pedro can still use Framelink (`figma-developer-mcp`, v0.8.1, read-only) to *read* the file structure he draws by hand, which is the current sc-site setup. That keeps the design-token-extraction loop alive even with no write capability.
