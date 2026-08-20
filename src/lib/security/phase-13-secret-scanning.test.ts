import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

// ============================================
// PHASE 13: SECRET SCANNING & SECURITY VERIFICATION
// ============================================

/**
 * Secret Scanning Tests
 * Verify that no sensitive information is exposed in code, config, or documentation
 */

// Pattern definitions for detecting secrets
const secretPatterns = {
  apiKey: /api[_-]?key|apikey|api_secret/gi,
  awsSecret: /aws_secret_access_key|AKIA[0-9A-Z]{16}/gi,
  jwtSecret: /jwt[_-]?secret|jwtSecret|jwt_secret/gi,
  dbPassword: /database[_-]?password|db[_-]?password|password\s*[:=]/gi,
  privKey: /private[_-]?key|PRIVATE KEY|-----BEGIN RSA/gi,
  supabaseKey: /supabase[_-]?key|supabase_anon_key/gi,
  emailPassword: /email[_-]?password|smtp[_-]?password/gi,
};

const sensitiveFiles = [".env", ".env.local"];

// Files that should NOT contain secrets
const filesToCheck = [
  "package.json",
  "tsconfig.json",
  "next.config.js",
  "eslint.config.mjs",
  ".gitignore",
  "README.md",
];

function scanFileForSecrets(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const foundSecrets: string[] = [];

    for (const [patternName, pattern] of Object.entries(secretPatterns)) {
      const matches = content.match(pattern);
      if (matches) {
        foundSecrets.push(
          `Pattern '${patternName}' matched: ${matches.join(", ")}`
        );
      }
    }

    return foundSecrets;
  } catch {
    return [];
  }
}

test("Secret Scanning: .gitignore should exclude .env files", () => {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  const gitignore = fs.readFileSync(gitignorePath, "utf-8");

  for (const envFile of sensitiveFiles) {
    assert.ok(
      gitignore.includes(envFile),
      `.gitignore should exclude ${envFile}`
    );
  }
});

test("Secret Scanning: .env.example should NOT contain real secrets", () => {
  const envExamplePath = path.join(process.cwd(), ".env.example");

  if (fs.existsSync(envExamplePath)) {
    const envExample = fs.readFileSync(envExamplePath, "utf-8");

    // Check for patterns that look like real secrets (40+ char random strings, AWS keys, etc.)
    const suspiciousPatterns = [
      /AKIA[0-9A-Z]{16}/, // AWS access key format
      /[0-9a-f]{40,}/, // Likely git hash or API key
      /[A-Za-z0-9+/]{50,}={0,2}/, // Base64 encoded secret
    ];

    for (const line of envExample.split("\n")) {
      if (!line.startsWith("#") && line.includes("=")) {
        const value = line.split("=")[1].trim();

        for (const pattern of suspiciousPatterns) {
          assert.ok(
            !pattern.test(value),
            `${line} looks like it contains a real secret`
          );
        }
      }
    }
  }
});

test("Secret Scanning: .env.local should not be in git", () => {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  const gitignore = fs.readFileSync(gitignorePath, "utf-8");
  assert.ok(gitignore.includes(".env.local"), ".env.local must be in .gitignore");
});

test("Secret Scanning: package.json should not contain secrets", () => {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const secrets = scanFileForSecrets(packageJsonPath);
  assert.equal(secrets.length, 0, `package.json contains potential secrets: ${secrets.join(", ")}`);
});

test("Secret Scanning: next.config.js should not contain secrets", () => {
  const configPath = path.join(process.cwd(), "next.config.js");
  const secrets = scanFileForSecrets(configPath);
  assert.equal(secrets.length, 0, `next.config.js contains potential secrets: ${secrets.join(", ")}`);
});

test("Secret Scanning: README.md should not contain real API keys", () => {
  const readmePath = path.join(process.cwd(), "README.md");
  const readme = fs.readFileSync(readmePath, "utf-8");

  // Check that API key examples use obvious placeholders
  const apiKeyMatches = readme.match(/[a-zA-Z0-9_-]{32,}/g) || [];

  for (const match of apiKeyMatches) {
    assert.ok(
      match.includes("your") ||
        match.includes("example") ||
        match.includes("placeholder") ||
        match.includes("demo"),
      `README.md contains what looks like a real API key: ${match}`
    );
  }
});

test("Secret Scanning: Source files should not contain hardcoded secrets", () => {
  const srcDir = path.join(process.cwd(), "src");

  // Only look for actual hardcoded secret values, not legitimate pattern matches
  function checkDirectory(dir: string): string[] {
    const suspiciousFiles: string[] = [];

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith(".") && file !== "node_modules") {
        suspiciousFiles.push(...checkDirectory(filePath));
      } else if ((file.endsWith(".ts") || file.endsWith(".tsx")) && !file.endsWith(".test.ts")) {
        // Skip generated files
        if (filePath.includes("generated") || filePath.includes("prismaNamespace")) {
          continue;
        }

        const content = fs.readFileSync(filePath, "utf-8");

        // Look only for AWS access keys (AKIA pattern) and long base64 hardcoded values
        if (
          content.match(/AKIA[0-9A-Z]{16}/) ||
          content.match(/["'][A-Za-z0-9+/]{80,}=+["']/)
        ) {
          suspiciousFiles.push(filePath);
        }
      }
    }

    return suspiciousFiles;
  }

  const foundSecrets = checkDirectory(srcDir);

  assert.equal(
    foundSecrets.length,
    0,
    `Source code may contain hardcoded secrets:\n${foundSecrets.join("\n")}`
  );
});

// ============================================
// PHASE 13: ENVIRONMENT VARIABLE VALIDATION
// ============================================

test("Environment: Required env vars documented", () => {
  const envExamplePath = path.join(process.cwd(), ".env.example");
  assert.ok(fs.existsSync(envExamplePath), ".env.example file should exist");

  const envExample = fs.readFileSync(envExamplePath, "utf-8");

  // Verify required variables are documented
  const requiredVars = [
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
  ];

  for (const varName of requiredVars) {
    assert.ok(
      envExample.includes(varName),
      `.env.example should document ${varName}`
    );
  }
});

// ============================================
// PHASE 13: CODE QUALITY & SECURITY PATTERNS
// ============================================

test("Code Quality: eval() not used in codebase", () => {
  const srcDir = path.join(process.cwd(), "src");

  function searchForEval(dir: string): string[] {
    const found: string[] = [];

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith(".") && file !== "node_modules") {
        found.push(...searchForEval(filePath));
      } else if ((file.endsWith(".ts") || file.endsWith(".tsx")) && !file.endsWith(".test.ts")) {
        const content = fs.readFileSync(filePath, "utf-8");

        if (content.includes("eval(") || content.includes("Function(")) {
          found.push(filePath);
        }
      }
    }

    return found;
  }

  const found = searchForEval(srcDir);
  assert.equal(
    found.length,
    0,
    `Code uses eval() or Function() constructor in: ${found.join(", ")}`
  );
});

test("Code Quality: Dangerous string concatenation in SQL not used", () => {
  const srcDir = path.join(process.cwd(), "src");

  function searchForDangerousSql(dir: string): string[] {
    const found: string[] = [];

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith(".") && file !== "node_modules") {
        found.push(...searchForDangerousSql(filePath));
      } else if (file.endsWith(".ts")) {
        const content = fs.readFileSync(filePath, "utf-8");

        // Look for string concatenation in SQL-like contexts (simple heuristic)
        if (
          content.match(/\`.*\+.*FROM|SELECT.*\+.*WHERE|INSERT.*\+.*VALUES/) &&
          !content.includes("prisma") &&
          !content.includes("supabase")
        ) {
          found.push(filePath);
        }
      }
    }

    return found;
  }

  const found = searchForDangerousSql(srcDir);
  assert.equal(
    found.length,
    0,
    `Code may use string concatenation for SQL in: ${found.join(", ")}`
  );
});

// ============================================
// PHASE 13: CONFIGURATION SECURITY
// ============================================

test("Configuration: next.config.js has security headers", () => {
  const configPath = path.join(process.cwd(), "next.config.js");
  const config = fs.readFileSync(configPath, "utf-8");

  // Should reference headers configuration (even if in middleware)
  assert.ok(
    config.includes("security") ||
      config.includes("headers") ||
      config.includes("Content-Security-Policy"),
    "next.config.js should reference security headers"
  );
});

// ============================================
// PHASE 13: GIT CONFIGURATION SECURITY
// ============================================

test("Git: .gitignore excludes common secret files", () => {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  const gitignore = fs.readFileSync(gitignorePath, "utf-8");

  const secretFilePatterns = [".env", ".env.*", "*.pem"];

  for (const pattern of secretFilePatterns) {
    assert.ok(
      gitignore.includes(pattern),
      `.gitignore should exclude ${pattern}`
    );
  }
});

test("Git: node_modules in .gitignore", () => {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  const gitignore = fs.readFileSync(gitignorePath, "utf-8");
  assert.ok(gitignore.includes("node_modules"), ".gitignore should exclude node_modules");
});

// ============================================
// SUMMARY: Phase 13 Secret Scanning Complete
// ============================================
