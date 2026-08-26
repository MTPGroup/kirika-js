# @kirika-js/core

## 0.2.0

### Minor Changes

- [`7fe1ad2`](https://github.com/MTPGroup/kirika-js/commit/7fe1ad2074b4ddf8bde3d29567b591e8870509d3) Thanks [@hanasa2023](https://github.com/hanasa2023)! - - Character 实体新增 visibility 字段与 changeVisibility 方法
  - Conversation 支持消息编辑（editContent）与叶子删除（deleteMessage），消息仓储端口新增 delete
  - 消息资产内容（AssetMessageContentPart）新增可选 url 字段以支持多模态
  - ObjectStoragePort 新增 getPublicUrl 方法
