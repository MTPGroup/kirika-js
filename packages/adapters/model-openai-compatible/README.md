# @kirika-js/adapter-model-openai-compatible

kirika 的 OpenAI 兼容模型适配器

## 安装

`@kirika-js/core` 是该适配器的运行时依赖，建议一并安装：

```bash
pnpm add @kirika-js/core @kirika-js/adapter-model-openai-compatible
```

使用 npm 或 Yarn：

```bash
npm install @kirika-js/core @kirika-js/adapter-model-openai-compatible
# or
yarn add @kirika-js/core @kirika-js/adapter-model-openai-compatible
```

## 运行环境

- Node.js >= 22.12
- 支持 `AbortSignal` 和异步迭代器的现代 JavaScript 运行时

不要在浏览器或 Electron renderer 中直接暴露 API Key。桌面应用应在 Electron main process 中创建并调用该适配器。
