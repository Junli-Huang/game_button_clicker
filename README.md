# Game Button Clicker

面向 H5、配置驱动、Mod 友好的点击 + 增量 + 自动化游戏内核。

当前 V0.1 包含可直接体验的纯文字/轻视觉麦田 Demo，用于验证：

- 玩家点击与阶段推进
- Stage `OnEnter` / `OnClick` / `OnExit`
- Resource、Condition、Effect 与 Action 原子执行
- `Self` / `Source` / `Target` / `EntityId` / `Tag` 目标选择
- Entity 自增长与自动点击
- Progress Overflow

## 本地运行

```bash
npm ci
npm test
npm run build
npx serve .
```

打开 `http://localhost:3000`。

## GitHub Pages

推送到 `main` 后，[GitHub Actions 工作流](.github/workflows/deploy-pages.yml)会依次执行测试、构建并部署 `dist/`。

线上地址：<https://junli-huang.github.io/game_button_clicker/>

## 项目边界

这是 Incremental Engine Repo，不包含具体题材、具体数值经济或游戏 UI。能力应由真实游戏需求推动，不提前扩展成万能游戏引擎。
