---
'@kirika-js/core': minor
---

- Character 实体新增 visibility 字段与 changeVisibility 方法
- Conversation 支持消息编辑（editContent）与叶子删除（deleteMessage），消息仓储端口新增 delete
- 消息资产内容（AssetMessageContentPart）新增可选 url 字段以支持多模态
- ObjectStoragePort 新增 getPublicUrl 方法
