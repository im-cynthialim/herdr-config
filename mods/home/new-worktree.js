import { exec, home, run } from "herdr";

const FOLDER_NAMES = [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty",
];

const BRANCH_NAME_PREFIXES = /^(feature|feat|fix|bugfix|hotfix|chore|refactor|docs|test)[-/]/;

const BRANCH_NAME_PROMPT = `Reply with only a git branch name for the task below: 2-5 lowercase words joined by hyphens that say what the change does, e.g. "add-video-carousel-uploads". Never start it with a type like "feature", "feat" or "fix", and no slashes, quotes or anything else.

Task:
`;

export function mainCheckout() {
  return `${home()}/pocketflows`;
}

export async function nextFreeFolder() {
  for (const name of FOLDER_NAMES) {
    const path = `${home()}/${name}`;
    const { code } = await exec("test", ["-e", path]);
    if (code !== 0) return { name, path };
  }
  return null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 5)
    .join("-")
    .slice(0, 50)
    .replace(/-+$/, "");
}

async function suggestBranch(prompt) {
  const result = await exec("claude", ["-p", "--model", "haiku", `${BRANCH_NAME_PROMPT}${prompt}`], {
    cwd: home(),
    timeout: 60_000,
  }).catch(() => null);
  const raw = result?.code === 0 ? (result.stdout.trim().split("\n").at(-1) ?? "") : "";
  const suggested = slugify(raw.toLowerCase().replace(BRANCH_NAME_PREFIXES, ""));
  return suggested || slugify(prompt) || "new-work";
}

async function unusedBranch(base) {
  for (let n = 1; ; n++) {
    const branch = n === 1 ? base : `${base}-${n}`;
    const { code } = await exec("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: mainCheckout() });
    if (code !== 0) return branch;
  }
}

export async function startWorktree(prompt, onStep) {
  onStep("Finding a free folder…");
  const folder = await nextFreeFolder();
  if (!folder) throw new Error("No free folder name left (one … twenty are all taken).");

  onStep("Picking a branch name…");
  const branch = await unusedBranch(await suggestBranch(prompt));

  onStep(`Fetching origin/main…`);
  await exec("git", ["fetch", "origin", "main"], { cwd: mainCheckout(), timeout: 120_000 });

  onStep(`Creating ~/${folder.name} on ${branch}…`);
  const added = await exec("git", ["worktree", "add", "--no-track", "-b", branch, folder.path, "origin/main"], {
    cwd: mainCheckout(),
    timeout: 120_000,
  });
  if (added.code !== 0) throw new Error(added.stderr.trim() || "git worktree add failed");

  await exec("cp", [
    `${mainCheckout()}/config/settings/development.local.yml`,
    `${folder.path}/config/settings/development.local.yml`,
  ]);

  run("space.new", { name: folder.name, folder: folder.path, argv: ["claude"], task: prompt });
  return { folder, branch };
}
