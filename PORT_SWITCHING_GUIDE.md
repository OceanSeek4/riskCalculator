# 开发端口切换指南 / Development Port Switching Guide

## 问题描述 / Problem Description

当运行 `npm run dev` 时，如果默认端口 1420 被占用，会导致启动失败。

When running `npm run dev`, if the default port 1420 is occupied, the startup will fail.

## 解决方案 / Solutions

### 方法一：使用预定义的端口脚本 / Method 1: Use Predefined Port Scripts

如果 1420 端口被占用，可以使用以下命令：

If port 1420 is occupied, you can use these commands:

```bash
# 使用端口 1421
npm run dev:alt

# 使用端口 1422  
npm run dev:1422

# 使用端口 3000
npm run dev:3000

# 对应的 Tauri 开发命令
npm run tauri:dev:alt     # 端口 1421
npm run tauri:dev:1422    # 端口 1422  
npm run tauri:dev:3000    # 端口 3000
```

### 方法二：修改环境变量 / Method 2: Modify Environment Variables

1. 编辑 `.env` 文件：
   Edit the `.env` file:

```bash
# 修改为可用端口
VITE_DEV_PORT=1421
VITE_HMR_PORT=1422
```

2. 然后正常启动：
   Then start normally:

```bash
npm run dev
# 或者 / or
npm run tauri:dev
```

### 方法三：临时设置端口 / Method 3: Temporary Port Setting

```bash
# Windows
set VITE_DEV_PORT=1421 && npm run dev

# macOS/Linux
VITE_DEV_PORT=1421 npm run dev
```

## 端口配置说明 / Port Configuration

| 环境变量 | 默认值 | 说明 |
|---------|-------|------|
| `VITE_DEV_PORT` | 1420 | Vite 开发服务器端口 |
| `VITE_HMR_PORT` | 1421 | 热更新端口 |
| `TAURI_DEV_HOST` | localhost | 开发主机地址 |

## 自动端口检测 / Automatic Port Detection

Vite 配置已设置为 `strictPort: false`，这意味着如果指定端口被占用，Vite 会自动寻找下一个可用端口。

The Vite configuration is set to `strictPort: false`, which means if the specified port is occupied, Vite will automatically find the next available port.

## 故障排除 / Troubleshooting

### 查看端口占用情况 / Check Port Usage

```bash
# Windows
netstat -ano | findstr :1420

# macOS/Linux  
lsof -i :1420
```

### 终止占用端口的进程 / Kill Process Occupying Port

```bash
# Windows (替换 PID 为实际进程ID)
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>
```

## 推荐使用 / Recommended Usage

1. **开发时**：优先使用 `npm run dev:alt` (端口 1421)
2. **Tauri开发**：使用 `npm run tauri:dev:alt` 
3. **持续开发**：修改 `.env` 文件设置固定端口

1. **Development**: Use `npm run dev:alt` (port 1421) first
2. **Tauri Development**: Use `npm run tauri:dev:alt`
3. **Continuous Development**: Modify `.env` file to set a fixed port