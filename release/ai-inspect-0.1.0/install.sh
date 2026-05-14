#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR=""
MODE=""
SOURCE="npm"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_DIR="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --source)
      SOURCE="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'HELP'
用法: ./install.sh [--mode mcp|vite|all] [--source npm|local] [--project /path/to/vite-project]

模式:
  mcp   安装 MCP 命令并输出通用 MCP 配置片段
  vite  给某个 Vue/Vite 项目安装网页调试插件
  all   配置 MCP，并安装 Vue/Vite 插件

示例:
  ./install.sh
  ./install.sh --mode mcp
  ./install.sh --mode vite --project /path/to/vite-vue-project
  ./install.sh --source local --mode all --project /path/to/vite-vue-project
HELP
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if ! command -v npm >/dev/null 2>&1; then
  echo "缺少 npm。请先安装 Node.js。" >&2
  exit 1
fi

if [[ "$SOURCE" != "npm" && "$SOURCE" != "local" ]]; then
  echo "未知安装来源: $SOURCE。可选值：npm 或 local。" >&2
  exit 2
fi

if [[ -z "$MODE" ]]; then
  echo "请选择要安装/配置的内容："
  echo "  1) 配置 MCP：安装命令并输出通用 MCP 配置片段"
      echo "  2) 安装 Vue/Vite 插件：让目标网页出现右下角「AI 调试」按钮和调试面板"
  echo "  3) 全部安装：MCP + Vue/Vite 插件"
  read -r -p "请输入选项 [1/2/3]（默认 1）: " choice
  case "$choice" in
    2) MODE="vite" ;;
    3) MODE="all" ;;
    *) MODE="mcp" ;;
  esac
fi

install_mcp_command() {
  echo "正在安装 ai-inspect MCP 命令..."
  if [[ "$SOURCE" == "local" ]]; then
    npm install -g --force "$DIR"/mashiro39-ai-inspect-protocol-0.1.0.tgz "$DIR"/mashiro39-ai-inspect-server-0.1.0.tgz "$DIR"/mashiro39-ai-inspect-vite-plugin-0.1.0.tgz "$DIR"/mashiro39-ai-inspect-cli-0.1.0.tgz
  else
    npm install -g --force @mashiro39/ai-inspect-cli@0.1.0
  fi
}

configure_mcp() {
  install_mcp_command
  echo "正在输出通用 MCP 配置..."
  node "$DIR/configure-mcp.mjs"
}

install_vite_plugin() {
  if [[ -z "$PROJECT_DIR" ]]; then
    read -r -p "请输入 Vue/Vite 项目路径（包含 package.json）: " PROJECT_DIR
  fi
  if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
    echo "未找到项目 package.json: $PROJECT_DIR" >&2
    exit 1
  fi
  echo "正在给项目安装 Vue/Vite 调试插件: $PROJECT_DIR"
  package_manager="$(detect_project_package_manager "$PROJECT_DIR")"
  echo "项目包管理器: $package_manager"
  if [[ "$package_manager" == "pnpm" ]]; then
    if [[ "$SOURCE" == "local" ]]; then
      (cd "$PROJECT_DIR" && pnpm add -D "$DIR"/mashiro39-ai-inspect-protocol-0.1.0.tgz "$DIR"/mashiro39-ai-inspect-vite-plugin-0.1.0.tgz)
    else
      (cd "$PROJECT_DIR" && pnpm add -D @mashiro39/ai-inspect-vite-plugin@0.1.0)
    fi
  elif [[ "$package_manager" == "yarn" ]]; then
    if [[ "$SOURCE" == "local" ]]; then
      (cd "$PROJECT_DIR" && COREPACK_ENABLE_STRICT=0 yarn add -D "$DIR"/mashiro39-ai-inspect-protocol-0.1.0.tgz "$DIR"/mashiro39-ai-inspect-vite-plugin-0.1.0.tgz)
    else
      (cd "$PROJECT_DIR" && COREPACK_ENABLE_STRICT=0 yarn add -D @mashiro39/ai-inspect-vite-plugin@0.1.0 --registry https://registry.npmjs.org)
    fi
  else
    if [[ "$SOURCE" == "local" ]]; then
      npm install --save-dev --prefix "$PROJECT_DIR" "$DIR"/mashiro39-ai-inspect-protocol-0.1.0.tgz "$DIR"/mashiro39-ai-inspect-vite-plugin-0.1.0.tgz
    else
      npm install --save-dev --prefix "$PROJECT_DIR" @mashiro39/ai-inspect-vite-plugin@0.1.0
    fi
  fi
  node "$DIR/patch-vite-config.mjs" --project "$PROJECT_DIR"
}

detect_project_package_manager() {
  local project="$1"
  local package_manager
  package_manager="$(node -e "const fs=require('fs');const pkg=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(pkg.packageManager||'')" "$project/package.json")"
  if [[ "$package_manager" == yarn@* ]]; then echo "yarn"; return; fi
  if [[ -f "$project/yarn.lock" ]]; then echo "yarn"; return; fi
  if [[ "$package_manager" == pnpm@* ]]; then echo "pnpm"; return; fi
  if [[ "$package_manager" == npm@* ]]; then echo "npm"; return; fi
  if [[ -f "$project/pnpm-lock.yaml" ]]; then echo "pnpm"; return; fi
  if command -v yarn >/dev/null 2>&1; then echo "yarn"; return; fi
  echo "npm"
}

case "$MODE" in
  mcp)
    configure_mcp
    ;;
  vite)
    install_vite_plugin
    ;;
  all)
    configure_mcp
    install_vite_plugin
    ;;
  *)
    echo "未知模式: $MODE" >&2
    exit 2
    ;;
esac

echo "安装完成。"
echo "MCP 启动命令: ai-inspect mcp"
echo "请把上面的 MCP 配置片段添加到你使用的 agent/client。"
