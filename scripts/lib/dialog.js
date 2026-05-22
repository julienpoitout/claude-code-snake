import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * @param {string} title
 * @param {string} message
 * @param {string[]} options
 * @returns {number} selected index, or -1 on cancel
 */
export function showChoice(title, message, options) {
  if (process.platform === "win32") {
    return showChoiceWindows(title, message, options);
  }
  if (process.platform === "darwin") {
    return showChoiceMac(title, message, options);
  }
  return showChoiceLinux(title, message, options);
}

function showChoiceWindows(title, message, options) {
  const tmp = path.join(os.tmpdir(), `claude-snake-dialog-${process.pid}.ps1`);
  const labels = options.map((o) => o.replace(/'/g, "''"));
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object System.Windows.Forms.Form
$form.Text = '${title.replace(/'/g, "''")}'
$form.Width = 420
$form.Height = 160 + (${options.length} * 10)
$form.StartPosition = 'CenterScreen'
$form.TopMost = $true
$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(12, 12)
$label.Size = New-Object System.Drawing.Size(380, 50)
$label.Text = '${message.replace(/'/g, "''")}'
$form.Controls.Add($label)
$script:choice = -1
${labels
  .map((label, i) => {
    const x = 12 + i * 130;
    return `
$btn${i} = New-Object System.Windows.Forms.Button
$btn${i}.Location = New-Object System.Drawing.Point(${x}, 70)
$btn${i}.Size = New-Object System.Drawing.Size(120, 28)
$btn${i}.Text = '${label}'
$btn${i}.Add_Click({ $script:choice = ${i}; $form.Close() })
$form.Controls.Add($btn${i})`;
  })
  .join("\n")}
[void]$form.ShowDialog()
Write-Output $script:choice
`;
  try {
    fs.writeFileSync(tmp, script, "utf8");
    const result = spawnSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp],
      { encoding: "utf8", timeout: 120000, windowsHide: false }
    );
    const idx = parseInt(String(result.stdout).trim(), 10);
    return Number.isFinite(idx) ? idx : -1;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function showChoiceMac(title, message, options) {
  const list = options.map((o) => `"${o.replace(/"/g, '\\"')}"`).join(",");
  const script = `set choice to choose from list {${list}} with prompt "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}" default items {"${options[0].replace(/"/g, '\\"')}"}
if choice is false then return "-1"
repeat with i from 1 to count of {${list}}
  if item i of {${list}} is equal to choice then return (i - 1) as string
end repeat
return "-1"`;
  const result = spawnSync("osascript", ["-e", script], { encoding: "utf8", timeout: 120000 });
  if (result.status !== 0) return 0;
  const idx = parseInt(String(result.stdout).trim(), 10);
  return Number.isFinite(idx) ? idx : -1;
}

function showChoiceLinux(title, message, options) {
  if (options.length === 2) {
    const r = spawnSync(
      "zenity",
      ["--question", `--title=${title}`, `--text=${message}`, `--ok-label=${options[0]}`, `--cancel-label=${options[1]}`],
      { encoding: "utf8" }
    );
    if (r.status === 0) return 0;
    if (r.status === 1) return 1;
    return -1;
  }
  const r = spawnSync(
    "zenity",
    ["--list", `--title=${title}`, `--text=${message}`, "--column=Choice", "--height=200", "--width=300", ...options],
    { encoding: "utf8" }
  );
  if (r.status !== 0) return -1;
  const pick = String(r.stdout).trim();
  const idx = options.indexOf(pick);
  return idx >= 0 ? idx : 0;
}
