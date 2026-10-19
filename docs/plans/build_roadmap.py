#!/usr/bin/env python3
"""One-shot builder: expand the capability-harvest roadmap tree per REFINED-PLAN v2.
Runs roadmap_cli.py serially (write commands must not be parallel)."""
import subprocess, sys, json
from pathlib import Path

CLI = r"C:\Users\victo\.workbuddy\skills\zj-roadmap-driven\roadmap_cli.py"
R = r"docs/plans/capability-harvest-roadmap.json"
CWD = r"C:\workspace\github\jununfly\ZCodeGraph"

def run(cmd, *args):
    p = subprocess.run([sys.executable, CLI, cmd, R, *args], cwd=CWD,
                       capture_output=True, text=True, encoding="utf-8")
    if p.returncode != 0:
        print("FAIL", args, p.returncode, p.stdout, p.stderr); sys.exit(1)
    out = p.stdout.strip()
    try:
        return json.loads(out)
    except Exception:
        return out

# (parent, label, exit_criteria[])
TREE = [
    # P-1 验证冲刺
    ("1-1", "archify hands-on 验证并回填 Unknown", ["1 个真实仓库跑通 图谱→archify IR→HTML", "确认 IR schema 匹配", "回填 archify 技术/差异化两条 Unknown"]),
    ("1-1", "codeflow hands-on 验证并回填 Unknown", ["跑通 PR 影响+健康分", "确认规则可移植为 SQL/图遍历", "回填 codeflow product-positioning Unknown"]),
    ("1-1", "固化测量基础设施脚本", ["复用 docs/evidence real-corpus gate 流程为脚本", "dead-code/complexity/setup 三 metric 测量脚本先落地"]),
    ("1-1", "测 token 消耗稳定 baseline", ["复用现有 A/B harness", "≥3 语料 × ≥3 次取中位", "只出 baseline 报告不设压缩目标"]),
    ("1-1", "测现有 PR 影响 recall 基线", ["3 仓 × ≥20 条已合并 PR 回放", "现有 impact/affected recall 基线入库存档"]),
    # P0
    ("1-2", "P0a 诊断增强（MCP 初始化失败可恢复提示）", ["agent 首次成功调用 MCP 工具率 ≥95%", "≥5 新用户干净环境走查 ≤30min 成功", "不用遥测，与 100% 本地自洽"]),
    ("1-2", "P0a 索引进度回调", ["确定性事件序列断言通过"]),
    ("1-2", "P0a token 输出优化（GCF 式压缩）", ["基于 P-1 baseline 做压缩", "固定探针集上统计显著下降", "不承诺 ~62%"]),
    ("1-2", "P0b 冻结《死代码判定 rubric v1》", ["判定规则清单（注解白名单/框架入口/动态分派）", "语料=现有5仓+≥1 Spring仓固定commit", "每仓≥30条双人独立标注+仲裁"]),
    ("1-2", "P0b find_dead_code 首版（限 3-5 语言）", ["只承诺 TS/JS/Python/Go/Java", "含注解排除+框架入口排除", "标注一致率≥85% 且 precision≥80%（只报 precision）"]),
    ("1-2", "P0b 圈复杂度（查询时计算，零 schema 变更）", ["不预计算落库", "complexity-coverage 按语言分列 ≥90%", "分母=成功索引 function 节点，附豁免清单"]),
    # P1
    ("1-3", "P1 准入：图质量门禁（degraded 降个位数）", ["5 个 release 语料 degraded 文件降到个位数", "VS Code sparse 214→<20"]),
    ("1-3", "P1-1 PR 影响分析（复用 impact/affected）", ["不新增独立 MCP 工具", "受影响文件+blast radius", "README 健康 SVG Card 走 CLI/CI 出口", "recall ≥85% 且 ≥基线−2pp"]),
    ("1-3", "P1-2 Spring bean/DI 语义扩展（剔除数据源）", ["只做 Spring bean/DI", "数据源节点(SQL/Redis)移出默认路径降级待验证", "1 个真实 Spring 仓 sufficiency 探针通过"]),
    ("1-3", "P1-3 可视化出口（archify 纯数据契约）", ["只产出 archify IR JSON（export --format archify）", "渲染交用户侧，零新依赖零新进程", "IR schema 校验通过+快照确定性重渲染一致"]),
    # P2
    ("1-4", "P2 立项前三问硬验收", ["embedding 可内嵌 bundle（非 Ollama 外部进程）？", "向量索引复用同一 SQLite+watcher（sqlite-vec）？", "status 六态是否需第七态/degraded 子原因？", "任一答否则不立项"]),
    ("1-4", "P2 量化阈值实测（5 语料端到端）", ["额外磁盘 ≤ 纯结构索引体积 50%", "首次索引时间增幅 ≤2×", "watch 单文件增量 ≤5s"]),
    # 架构机制（横切，挂 P0 作为先行约束）
    ("1-2", "横切：schema 演进条款 + MCP 工具收口 ≤12", ["新增 NodeKind/EdgeKind 走 migrations+bump CURRENT_SCHEMA_VERSION", "写旧 CLI 打开新库兼容策略", "新分析折叠进 explore/status，SVG/archify 走 CLI/CI 出口"]),
    ("1-2", "横切：架构回归红线 + 能力健康探针", ["index-time-regression ≤15%", "explore-latency-regression 红线定值", "每能力域健康探针+doctor capabilities.json+--upstream-check"]),
]

def main():
    idmap = {}
    for parent, label, crits in TREE:
        node = run("add", parent, label)
        nid = node["id"]
        idmap[label] = nid
        for c in crits:
            run("update", nid, "--exit-criteria", c)
        print(f"{nid:8} {label}")
    # dependency edges (blocks)
    edges = [
        ("1-1", "1-2"),  # P-1 blocks P0
        ("1-1", "1-3"),  # P-1 blocks P1
        ("1-3", "1-4"),  # (placeholder; refined below)
    ]
    print("--- nodes built ---")
    print(json.dumps(idmap, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
