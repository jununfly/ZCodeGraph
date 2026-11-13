<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

<!-- zj-roadmap-authority/v1
role: process-state
durable-citation: forbidden
promote-via: ADR|design|contract|runtime-evidence
-->

> 数据文件: `zra-pilot-task-set-v1.json` | 最后更新: 2026-11-12 19:11:18

[ ][X+] 1. ZRA-Paired v1 试点任务集（内容已审，执行未授权）
├── [x][X+] 1-1. T1 Flask：会话读取到响应写回
├── [x][X+] 1-2. T2 Django：CSRF 中间件到视图防护
├── [x][X+] 1-3. T3 Express：子应用挂载与原型恢复
├── [x][X+] 1-4. T4 Gin：未命中路由与全局中间件
├── [x][X+] 1-5. T5 Spring PetClinic：编辑宠物到持久化
├── [x][X+] 1-6. 统一执行、审计与停止设计
└── [x][X+] 1-7. Human 审阅与冻结检查

### 下一步可开工（ready 前 3）

- 1. ZRA-Paired v1 试点任务集（内容已审，执行未授权） [ ]

<details><summary>编排信号：1 条待确认</summary>

- 1. ZRA-Paired v1 试点任务集（内容已审，执行未授权） [budget_exhausted] — 探索预算已触顶（子节点 7/7），再 add 或重开会被 E_BUDGET_EXCEEDED 拒绝 → 建议：决定提高 --max-children/--max-rounds、收敛现有子节点，或拆出 sibling；决定先落 decide

</details>
<!-- ROADMAP_SECTION_END -->
