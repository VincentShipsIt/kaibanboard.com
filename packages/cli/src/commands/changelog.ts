/**
 * CLI Changelog Generator Command
 * Generates changelogs from completed tasks
 *
 * Usage:
 *   kai changelog --since v1.0.0 --format keepachangelog --output CHANGELOG.md
 *   kai changelog --dry-run
 */

import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { CoreTaskParser, type Task } from "@kaibanboard/core";

const execAsync = promisify(exec);

/** Changelog entry type */
type ChangelogType = "Added" | "Changed" | "Fixed" | "Breaking Changes" | "Other";

/** Task type to changelog type mapping */
const TASK_TYPE_TO_CHANGELOG: Record<string, ChangelogType> = {
  Feature: "Added",
  Enhancement: "Changed",
  Refactor: "Changed",
  Bug: "Fixed",
  Research: "Other",
};

interface ChangelogEntry {
  taskId: string;
  title: string;
  type: ChangelogType;
  completedAt: string;
  description?: string;
}

interface ChangelogOptions {
  since?: string;
  format: "markdown" | "keepachangelog" | "json";
  outputPath?: string;
  dryRun?: boolean;
  version?: string;
}

/**
 * Get the date of a git tag
 */
async function getTagDate(cwd: string, tag: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`git log -1 --format=%aI "${tag}"`, { cwd, timeout: 5000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Filter completed tasks since a date
 */
function getCompletedTasksSince(tasks: Task[], since?: string): Task[] {
  const completed = tasks.filter((t) => t.status === "Done" && t.completedAt);

  if (!since) return completed;

  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.getTime())) return completed;

  return completed.filter((t) => {
    const taskDate = new Date(t.completedAt);
    return !Number.isNaN(taskDate.getTime()) && taskDate >= sinceDate;
  });
}

/**
 * Convert task to changelog entry
 */
function taskToEntry(task: Task): ChangelogEntry {
  return {
    taskId: task.id,
    title: task.label,
    type: TASK_TYPE_TO_CHANGELOG[task.type] || "Other",
    completedAt: task.completedAt,
    description: task.description,
  };
}

/**
 * Group entries by type
 */
function groupByType(entries: ChangelogEntry[]): Map<ChangelogType, ChangelogEntry[]> {
  const grouped = new Map<ChangelogType, ChangelogEntry[]>();
  for (const entry of entries) {
    const existing = grouped.get(entry.type) || [];
    existing.push(entry);
    grouped.set(entry.type, existing);
  }
  return grouped;
}

/**
 * Format as Keep a Changelog
 */
function formatKeepAChangelog(entries: ChangelogEntry[], version?: string, date?: string): string {
  const grouped = groupByType(entries);
  const today = date || new Date().toISOString().split("T")[0];
  const versionStr = version || "Unreleased";

  const lines: string[] = [];
  lines.push(`## [${versionStr}] - ${today}`);
  lines.push("");

  const typeOrder: ChangelogType[] = ["Added", "Changed", "Fixed", "Breaking Changes", "Other"];

  for (const type of typeOrder) {
    const typeEntries = grouped.get(type);
    if (typeEntries && typeEntries.length > 0) {
      lines.push(`### ${type}`);
      lines.push("");
      for (const entry of typeEntries) {
        lines.push(`- ${entry.title}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Format as simple markdown
 */
function formatMarkdown(entries: ChangelogEntry[], version?: string): string {
  const today = new Date().toISOString().split("T")[0];
  const versionStr = version || "Unreleased";

  const lines: string[] = [];
  lines.push(`# Changelog - ${versionStr}`);
  lines.push("");
  lines.push(`_Generated on ${today}_`);
  lines.push("");

  for (const entry of entries) {
    lines.push(`## ${entry.title}`);
    lines.push("");
    lines.push(`- **Type:** ${entry.type}`);
    lines.push(`- **Completed:** ${entry.completedAt.split("T")[0]}`);
    if (entry.description) {
      lines.push("");
      lines.push(entry.description);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format as JSON
 */
function formatJson(entries: ChangelogEntry[], version?: string): string {
  return JSON.stringify(
    {
      version: version || "unreleased",
      generatedAt: new Date().toISOString(),
      entries,
    },
    null,
    2
  );
}

/**
 * Append to existing changelog
 */
function appendToChangelog(
  newContent: string,
  existingContent: string | null,
  format: string
): string {
  if (!existingContent) {
    if (format === "keepachangelog") {
      const header = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
      return header + newContent;
    }
    return newContent;
  }

  if (format === "json") return newContent;

  const lines = existingContent.split("\n");
  let insertIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## [") || line.startsWith("## Unreleased")) {
      insertIndex = i;
      break;
    }
    if (i > 0 && line.trim() === "" && lines[i - 1].trim() === "") {
      insertIndex = i;
      break;
    }
  }

  if (insertIndex === 0 && lines.length > 5) {
    insertIndex = lines.length;
  }

  return [...lines.slice(0, insertIndex), newContent, ...lines.slice(insertIndex)].join("\n");
}

/**
 * Main changelog generation function
 */
export async function generateChangelog(
  workspaceDir: string,
  options: ChangelogOptions
): Promise<{ success: boolean; content?: string; entryCount: number; error?: string }> {
  try {
    // Parse tasks
    const parser = new CoreTaskParser([{ path: workspaceDir, name: path.basename(workspaceDir) }]);
    const tasks = parser.parseTasks();

    // Get since date from tag if needed
    let sinceDate = options.since;
    if (sinceDate?.startsWith("v")) {
      const tagDate = await getTagDate(workspaceDir, sinceDate);
      if (tagDate) sinceDate = tagDate;
    }

    // Filter completed tasks
    const completedTasks = getCompletedTasksSince(tasks, sinceDate);

    if (completedTasks.length === 0) {
      return {
        success: true,
        content: "",
        entryCount: 0,
        error: "No completed tasks found since the specified date/tag",
      };
    }

    // Convert to entries and sort
    const entries = completedTasks.map(taskToEntry);
    entries.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    // Format
    let content: string;
    switch (options.format) {
      case "json":
        content = formatJson(entries, options.version);
        break;
      case "markdown":
        content = formatMarkdown(entries, options.version);
        break;
      default:
        content = formatKeepAChangelog(entries, options.version);
        break;
    }

    if (options.dryRun) {
      return { success: true, content, entryCount: entries.length };
    }

    // Write to file
    const outputPath = options.outputPath || "CHANGELOG.md";
    const fullPath = path.join(workspaceDir, outputPath);

    let existingContent: string | null = null;
    if (fs.existsSync(fullPath)) {
      existingContent = fs.readFileSync(fullPath, "utf-8");
    }

    const finalContent = appendToChangelog(content, existingContent, options.format);
    fs.writeFileSync(fullPath, finalContent, "utf-8");

    return { success: true, content, entryCount: entries.length };
  } catch (error) {
    return {
      success: false,
      entryCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * CLI entry point
 */
export async function runChangelogCommand(args: string[]): Promise<void> {
  const workspaceDir = process.cwd();

  // Parse CLI arguments
  const options: ChangelogOptions = {
    format: "keepachangelog",
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--since" && args[i + 1]) {
      options.since = args[++i];
    } else if (arg === "--format" && args[i + 1]) {
      const format = args[++i];
      if (["markdown", "keepachangelog", "json"].includes(format)) {
        options.format = format as "markdown" | "keepachangelog" | "json";
      }
    } else if (arg === "--output" && args[i + 1]) {
      options.outputPath = args[++i];
    } else if (arg === "--version" && args[i + 1]) {
      options.version = args[++i];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: kai changelog [options]

Options:
  --since <tag|date>    Generate since tag (v1.0.0) or date (YYYY-MM-DD)
  --format <format>     Output format: keepachangelog, markdown, json (default: keepachangelog)
  --output <file>       Output file path (default: CHANGELOG.md)
  --version <version>   Version number for the header (default: Unreleased)
  --dry-run             Preview without writing to file
  --help, -h            Show this help message

Examples:
  kai changelog --since v1.0.0 --version 1.1.0
  kai changelog --dry-run
  kai changelog --format json --output releases.json
`);
      return;
    }
  }

  console.log("Generating changelog...");

  const result = await generateChangelog(workspaceDir, options);

  if (result.success) {
    if (result.entryCount === 0) {
      console.log(result.error || "No completed tasks found.");
    } else if (options.dryRun) {
      console.log("\n--- Preview ---\n");
      console.log(result.content);
      console.log(`\n--- ${result.entryCount} entries ---`);
    } else {
      console.log(`Changelog updated with ${result.entryCount} entries.`);
      console.log(`Written to: ${options.outputPath || "CHANGELOG.md"}`);
    }
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}
