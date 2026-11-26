import { useState } from "react";
import { CopyBlock, Dialog } from "./controls";

type Agent = "claude-app" | "claude-code" | "antigravity" | "copilot" | "cursor";

const REPO = "goodiny777/screenshot-guru";
const ZIP = "screenshot-guru-skill.zip";

export function SkillDialog({ onClose }: { onClose: () => void }) {
  const [agent, setAgent] = useState<Agent>("claude-app");
  const origin = window.location.origin;
  const zipUrl = `${origin}/${ZIP}`;
  const curl = (dir: string) => `mkdir -p ${dir} && curl -fsSL ${zipUrl} -o /tmp/${ZIP} && unzip -o /tmp/${ZIP} -d ${dir}`;
  const ps = (dir: string) => `New-Item -ItemType Directory -Force "${dir}" | Out-Null; Invoke-WebRequest ${zipUrl} -OutFile "$env:TEMP\\${ZIP}"; Expand-Archive -Force "$env:TEMP\\${ZIP}" "${dir}"`;

  const tabs: [Agent, string][] = [
    ["claude-app", "Claude app"],
    ["claude-code", "Claude Code"],
    ["antigravity", "Antigravity"],
    ["copilot", "GitHub Copilot"],
    ["cursor", "Cursor"],
  ];

  return (
    <Dialog title="Add the screenshot-guru skill to your AI" onClose={onClose} footer={<a href={`/${ZIP}`} download><button className="primary">Download skill ZIP</button></a>}>
      <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
        The skill teaches your AI how to plan screenshot copy that follows App Store and Google Play rules, and how to hand the
        result to this site: either as a project file you drop here, or by driving this page directly when the AI can control a browser.
        Pick the AI you use:
      </p>
      <div className="tabs">
        {tabs.map(([id, label]) => <button key={id} className={agent === id ? "on" : ""} onClick={() => setAgent(id)}>{label}</button>)}
      </div>

      {agent === "claude-app" && (
        <ol className="steps">
          <li>Download the skill ZIP (button below). Do not unzip it.</li>
          <li>In Claude (web or desktop), open <b>Customize → Skills</b>, click <b>+</b>, then <b>Create skill → Upload a skill</b>, and choose the ZIP.</li>
          <li>Make sure code execution / file creation is on in Settings, so Claude can pack your project file.</li>
          <li>Ask: <i>"Make App Store and Google Play screenshots for my app with screenshot-guru."</i> Attach your raw screenshots.</li>
          <li className="muted">Skills you add here also load in Claude Code when you sign in with the same account.</li>
        </ol>
      )}

      {agent === "claude-code" && (
        <ol className="steps">
          <li>Install for all your projects (macOS / Linux):<CopyBlock text={curl("~/.claude/skills")} /></li>
          <li>Windows PowerShell:<CopyBlock text={ps("$HOME\\.claude\\skills")} /></li>
          <li>Or with the skills CLI:<CopyBlock text={`npx skills add ${REPO} -a claude-code -g`} /></li>
          <li>Start a new session and ask for store screenshots. With Claude in Chrome connected, Claude can also build the deck right on this page.</li>
        </ol>
      )}

      {agent === "antigravity" && (
        <ol className="steps">
          <li>Install as a global skill (all workspaces):<CopyBlock text={curl("~/.gemini/config/skills")} /></li>
          <li>Or only for one project, from the project folder:<CopyBlock text={curl(".agents/skills")} /></li>
          <li>Windows PowerShell:<CopyBlock text={ps("$HOME\\.gemini\\config\\skills")} /></li>
          <li>Ask the agent for store screenshots, or type <code>/screenshot-guru</code>. Antigravity's browser agent can drive this page directly.</li>
        </ol>
      )}

      {agent === "copilot" && (
        <ol className="steps">
          <li>With GitHub CLI 2.90 or newer:<CopyBlock text={`gh skill install ${REPO} screenshot-guru`} /></li>
          <li>Or install as a personal skill by hand:<CopyBlock text={curl("~/.copilot/skills")} /></li>
          <li>Or for one repository only: unzip into <code>.github/skills/</code> and commit it.</li>
          <li>Use agent mode in VS Code or the Copilot CLI and ask for store screenshots. In the CLI, run <code>/skills reload</code> after installing.</li>
        </ol>
      )}

      {agent === "cursor" && (
        <ol className="steps">
          <li>Install for all projects:<CopyBlock text={curl("~/.cursor/skills")} /></li>
          <li>Or for one project, from the project folder:<CopyBlock text={curl(".cursor/skills")} /></li>
          <li>Or with the skills CLI:<CopyBlock text={`npx skills add ${REPO} -a cursor -g`} /></li>
          <li>Open a new Agent chat and ask for store screenshots.</li>
        </ol>
      )}

      <div className="field">
        <h3>How the handoff works</h3>
        <ol className="steps small">
          <li><b>Project file (every AI):</b> the AI writes <code>project.json</code>, packs it with your screenshots into a <code>.zip</code>, and you drop that zip onto this page.</li>
          <li><b>Browser control (AIs that can use a browser):</b> the AI opens this page and calls <code>window.screenshotGuru</code> to load the project, check store rules, preview slides and export.</li>
        </ol>
      </div>
    </Dialog>
  );
}
