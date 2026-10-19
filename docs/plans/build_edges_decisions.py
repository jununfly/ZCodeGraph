#!/usr/bin/env python3
"""Continuation: add blocks edges + key decisions + render + validate for
capability-harvest-roadmap.json. Serial CLI writes only."""
import subprocess, sys, json

CLI = r"C:\Users\victo\.workbuddy\skills\zj-roadmap-driven\roadmap_cli.py"
R = r"docs/plans/capability-harvest-roadmap.json"
CWD = r"C:\workspace\github\jununfly\ZCodeGraph"

def run(*args):
    p = subprocess.run([sys.executable, CLI, *args], cwd=CWD,
                       capture_output=True, text=True, encoding="utf-8")
    if p.returncode != 0:
        print("FAIL", args, p.returncode, p.stdout, p.stderr); sys.exit(1)
    out = p.stdout.strip()
    try:
        return json.loads(out)
    except Exception:
        return out

# blocks edges: (from_id blocks to_id)
EDGES = [
    ("1-1", "1-2"),   # P-1 验证冲刺是 P0 的入口条件
    ("1-1", "1-3"),   # P-1 同样是 P1 的入口条件
    ("1-1", "1-4"),   # P2 立项三问依赖 P-1 测量基础设施
    ("1-2-7", "1-2-5"),  # schema 条款先落地，find_dead_code 才可写库
    ("1-2-7", "1-2-6"),  # 圈复杂度需确认零 schema 变更成立
    ("1-2-7", "1-3-3"),  # Spring DI 扩展必须走 schema 演进条款
    ("1-2-4", "1-2-5"),  # rubric v1 先冻结，工具才可判定
    ("1-3-1", "1-3-2"),  # 图质量门禁是 PR 影响 ≥85% recall 的测量基础
    ("1-3-1", "1-3-3"),
    ("1-3-1", "1-3-4"),
    ("1-2-8", "1-3-1"),  # 健康探针/红线先建，门禁才有回归度量
    ("1-4-1", "1-4-2"),  # 三问任一答否则不立项，实测免谈
]
print("== edges ==")
for a, b in EDGES:
    res = run("edge", "add", R, a, b, "--type", "blocks")
    print(f"{a} -> {b}:", res.get("id", res))

# decisions: (node, question, answer, note)
DECISIONS = [
    ("1-1",
     "为什么 P-1 验证冲刺是所有后续阶段的硬入口？",
     "5 角色评审一致：v1 最大缺陷是成本被低估。archify/codeflow 两条 Unknown 不回填、测量基础设施不落地，P0/P1 全部指标（覆盖率、recall、token）都无可裁决基线。",
     "REFINED-PLAN §2; B/A/T/O 评审共识"),
    ("1-2",
     "为什么 P0 拆 P0a/P0b 而不是 v1 的单批？",
     "B 与 C 的张力按『P0b rubric 先行』裁决：死代码判定先冻结 rubric v1 并限 3-5 语言，避免 C 担忧的『未验证就大铺』，也保住 B 的『高价值不推迟到 P1』。",
     "REFINED-PLAN §0 变更表 P-2"),
    ("1-2-7",
     "为什么 MCP 工具总数硬性收口 ≤12？",
     "AGENTS.md 记录『新工具极少被采纳』（zcodegraph_trace/context 已退役）。新分析能力一律折进 explore/status；SVG/archify 只作 CLI/CI 出口，不进 MCP。",
     "REFINED-PLAN §0 变更表 P-5"),
    ("1-3-3",
     "为什么把 datasource 语义从默认路径剔除？",
     "评审认定其为低频低价值且 schema 污染面大；P1-2 只保留 Spring bean/DI，datasource 如需再做单独立项。",
     "REFINED-PLAN §0 变更表 P-9"),
    ("1-3-4",
     "为什么可视化走 archify 纯数据契约而非内嵌渲染？",
     "守住架构不变量（SQLite 嵌入式、零配置、100% 本地）。zcodegraph export --format archify 只出 IR JSON，渲染交给 archify 外部完成，不引入前端依赖。",
     "REFINED-PLAN §4 P1-3"),
    ("1-4",
     "为什么 P2 语义检索默认关闭且要先过三问？",
     "T/O 评审：embedding 若依赖 Ollama 进程则破坏零配置；必须 bundle 内嵌模型、复用 sqlite-vec、status 第 7 态可观测，任一答『否』不立项。",
     "REFINED-PLAN §5 三问硬验收"),
]
print("== decisions ==")
for nid, q, a, note in DECISIONS:
    res = run("decide", R, nid, q, a, note)
    print(f"{nid}:", res.get("id", res))

print("== render ==")
print(run("render", R))
print("== validate ==")
print(run("validate", R))
