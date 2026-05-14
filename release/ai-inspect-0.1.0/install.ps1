param(
  [ValidateSet("", "mcp", "vite", "all")]
  [string]$Mode = "",
  [ValidateSet("npm", "local")]
  [string]$Source = "npm",
  [string]$Project = ""
)

$ErrorActionPreference = "Stop"
$Dir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "缺少 npm。请先安装 Node.js。"
}

if ($Mode -eq "") {
  Write-Host "请选择要安装/配置的内容："
  Write-Host "  1) 配置 MCP：安装命令并输出通用 MCP 配置片段"
  Write-Host "  2) 安装 Vue/Vite 插件：让目标网页出现右下角「AI 调试」按钮和调试面板"
  Write-Host "  3) 全部安装：MCP + Vue/Vite 插件"
  $choice = Read-Host "请输入选项 [1/2/3]（默认 1）"
  if ($choice -eq "2") { $Mode = "vite" }
  elseif ($choice -eq "3") { $Mode = "all" }
  else { $Mode = "mcp" }
}

function Install-McpCommand {
  Write-Host "正在安装 ai-inspect MCP 命令..."
  if ($Source -eq "local") {
    npm install -g --force "$Dir\mashiro39-ai-inspect-protocol-0.1.0.tgz" "$Dir\mashiro39-ai-inspect-server-0.1.0.tgz" "$Dir\mashiro39-ai-inspect-vite-plugin-0.1.0.tgz" "$Dir\mashiro39-ai-inspect-cli-0.1.0.tgz"
  } else {
    npm install -g --force "@mashiro39/ai-inspect-cli@0.1.0"
  }
}

function Configure-Mcp {
  Install-McpCommand
  Write-Host "正在输出通用 MCP 配置..."
  node "$Dir\configure-mcp.mjs"
}

function Install-VitePlugin {
  if ($Project -eq "") {
    $script:Project = Read-Host "请输入 Vue/Vite 项目路径（包含 package.json）"
  }
  if (-not (Test-Path (Join-Path $Project "package.json"))) {
    throw "未找到项目 package.json: $Project"
  }
  Write-Host "正在给项目安装 Vue/Vite 调试插件: $Project"
  $packageManager = Get-ProjectPackageManager $Project
  Write-Host "项目包管理器: $packageManager"
  if ($packageManager -eq "pnpm") {
    Push-Location $Project
    if ($Source -eq "local") {
      pnpm add -D "$Dir\mashiro39-ai-inspect-protocol-0.1.0.tgz" "$Dir\mashiro39-ai-inspect-vite-plugin-0.1.0.tgz"
    } else {
      pnpm add -D "@mashiro39/ai-inspect-vite-plugin@0.1.0"
    }
    Pop-Location
  } elseif ($packageManager -eq "yarn") {
    Push-Location $Project
    if ($Source -eq "local") {
      $env:COREPACK_ENABLE_STRICT = "0"
      yarn add -D "$Dir\mashiro39-ai-inspect-protocol-0.1.0.tgz" "$Dir\mashiro39-ai-inspect-vite-plugin-0.1.0.tgz"
    } else {
      $env:COREPACK_ENABLE_STRICT = "0"
      yarn add -D "@mashiro39/ai-inspect-vite-plugin@0.1.0" --registry "https://registry.npmjs.org"
    }
    Pop-Location
  } else {
    if ($Source -eq "local") {
      npm install --save-dev --prefix "$Project" "$Dir\mashiro39-ai-inspect-protocol-0.1.0.tgz" "$Dir\mashiro39-ai-inspect-vite-plugin-0.1.0.tgz"
    } else {
      npm install --save-dev --prefix "$Project" "@mashiro39/ai-inspect-vite-plugin@0.1.0"
    }
  }
  node "$Dir\patch-vite-config.mjs" --project "$Project"
}

function Get-ProjectPackageManager {
  param([string]$ProjectPath)
  $packageJson = Get-Content (Join-Path $ProjectPath "package.json") -Raw | ConvertFrom-Json
  $packageManager = if ($packageJson.packageManager) { [string]$packageJson.packageManager } else { "" }
  if ($packageManager.StartsWith("yarn@")) { return "yarn" }
  if (Test-Path (Join-Path $ProjectPath "yarn.lock")) { return "yarn" }
  if ($packageManager.StartsWith("pnpm@")) { return "pnpm" }
  if ($packageManager.StartsWith("npm@")) { return "npm" }
  if (Test-Path (Join-Path $ProjectPath "pnpm-lock.yaml")) { return "pnpm" }
  if (Get-Command yarn -ErrorAction SilentlyContinue) { return "yarn" }
  return "npm"
}

switch ($Mode) {
  "mcp" { Configure-Mcp }
  "vite" { Install-VitePlugin }
  "all" { Configure-Mcp; Install-VitePlugin }
  default { throw "未知模式: $Mode" }
}

Write-Host "安装完成。"
Write-Host "MCP 启动命令: ai-inspect mcp"
Write-Host "请把上面的 MCP 配置片段添加到你使用的 agent/client。"
