#!/usr/bin/env python3
"""Build the technical-c4/v1 Report IR — capability-harvest (汇集) edition.

Goal: not competition/differentiation, but harvesting each project's useful
(functional) and delightful (UX/engineering) unit-capabilities into ZCodeGraph.
"""
import json
from pathlib import Path

BASE = Path(__file__).parent
ledger_raw = json.load(open(BASE / "ledger-response.json", encoding="utf-8"))
ledger = ledger_raw.get("result", ledger_raw)
fingerprint = ledger["briefFingerprint"]

ev = {}
for e in ledger["evidence"]:
    ev[(e["repository"]["owner"] + "/" + e["repository"]["name"], e["criterionId"])] = e["id"]
def eid(repo, crit): return ev[(repo, crit)]

ZG, UP, AR, CGC, CF, CC = (
    "jununfly/ZCodeGraph", "colbymchenry/codegraph", "tt-a1i/archify",
    "CodeGraphContext/CodeGraphContext", "braedonsaunders/codeflow", "zilliztech/claude-context")
cand_meta = {ZG:(2,3), UP:(74416,17), AR:(85602,14), CGC:(4297,11), CF:(5421,6), CC:(12624,19)}
owner = lambda r: r.split("/")[0]; name = lambda r: r.split("/")[1]

def candidate(repo, crits, note):
    return {"repository": {"owner": owner(repo), "name": name(repo)},
            "stars": cand_meta[repo][0], "topicMatch": cand_meta[repo][1],
            "evidenceIds": [eid(repo, c) for c in crits], "note": note}

candidates = [
    candidate(ZG, ["product-positioning","technical-architecture","target-users","differentiation","maturity"],
              "汇集落点：本地优先 tree-sitter+SQLite(FTS5) MCP，rust-hybrid 引擎/22语言/14框架路由/跨语言桥/自动同步"),
    candidate(UP, ["product-positioning","technical-architecture","target-users","differentiation","maturity"],
              "同源上游：可吸收浏览器 viewer、文档/AGENTS.md 治理、release 工程化"),
    candidate(AR, ["product-positioning","target-users","maturity"],
              "可集成呈现出口：可验证 JSON IR→确定性 HTML/SVG 架构图编译链 + 快照对比"),
    candidate(CGC, ["product-positioning","technical-architecture","target-users","differentiation","maturity"],
              "可吸收分析能力：25 个 MCP 工具（死代码/圈复杂度/Spring 端点/数据源/自定义 Cypher/审计报告）+ token 优化输出"),
    candidate(CF, ["technical-architecture","target-users","differentiation","maturity"],
              "可吸收体检能力：PR 影响/安全扫描/健康分/churn 热图/模式识别/README SVG Card，零安装 UX"),
    candidate(CC, ["product-positioning","technical-architecture","target-users","differentiation","maturity"],
              "可吸收检索能力：AST 分块 + 混合检索(BM25+dense) + Merkle 增量索引 + 可插拔嵌入/向量库 + 进度回调 + ~40% token 优化"),
]

claims = [
    # 落点基线
    {"id":"cl-zg-base","critical":True,"evidenceIds":[eid(ZG,"product-positioning"),eid(ZG,"technical-architecture")],
     "text":"ZCodeGraph 现状（汇集基线）：本地优先 tree-sitter→SQLite(FTS5)，确定性 AST 抽取，经 MCP 暴露 explore/search/callers/callees/impact/node/files/status 八工具，per-project 数据存 .zcodegraph/。"},
    {"id":"cl-zg-strength","critical":True,"evidenceIds":[eid(ZG,"differentiation")],
     "text":"ZCodeGraph 已有有用之处：rust-hybrid 引擎、22 语言、14 框架路由识别、跨语言桥接（Swift↔ObjC/RN/Expo/Fabric）、ReferenceResolver 名匹配/imports/框架模式、watch 自动同步 + 连接时对齐 + 过期横幅。"},
    # 上游
    {"id":"cl-up-viewer","critical":True,"evidenceIds":[eid(UP,"maturity")],
     "text":"上游可吸收——浏览器 viewer：dist/viewer 产物与语法高亮 wasm 随每次 build/release 校验（check-ui-build.mjs），同一 grammar 既索引又高亮，提供图谱交互可视化，是 ZCodeGraph 当前缺失的好用呈现层。"},
    {"id":"cl-up-docs","critical":False,"evidenceIds":[eid(UP,"target-users")],
     "text":"上游可吸收——文档/AGENTS.md 治理：根 AGENTS.md 控制 ~35KiB、长方法学下沉 docs/AGENTS.md、project_doc_max_bytes 防静默截断，是成熟的 agent 指引工程实践。"},
    # CodeGraphContext
    {"id":"cl-cgc-tools","critical":True,"evidenceIds":[eid(CGC,"product-positioning"),eid(CGC,"differentiation")],
     "text":"CodeGraphContext 可吸收——分析工具面（25 个 MCP 工具）：find_dead_code（支持注解/装饰器排除与 Android 预设）、calculate_cyclomatic_complexity、find_most_complex_functions、generate_report（god nodes/复杂度/跨模块调用/死代码审计）、execute_cypher_query 自定义查询。"},
    {"id":"cl-cgc-spring","critical":True,"evidenceIds":[eid(CGC,"technical-architecture")],
     "text":"CodeGraphContext 可吸收——框架/数据源语义：find_java_spring_endpoints、find_java_spring_beans（@Service/@Repository 等）、find_datasource_nodes（SQL 表/Redis key 模式），把图谱扩展到 Web 端点与数据层。"},
    {"id":"cl-cgc-ux","critical":False,"evidenceIds":[eid(CGC,"target-users")],
     "text":"CodeGraphContext 可吸收——好用工程：mcp setup 向导自动配置 13+ agent、后台 job 模型（list_jobs/check_job_status 带 error_type 与有界 traceback）、watch_directory、上下文切换（discover/switch_context）、GCF token 优化输出（~62%）、CGC Gateway HTTP API。"},
    # codeflow
    {"id":"cl-cf-impact","critical":True,"evidenceIds":[eid(CF,"differentiation")],
     "text":"codeflow 可吸收——PR 影响分析：粘贴 PR URL 即列出受影响文件并计算 blast radius；并附 README 自更新 SVG Card（GitHub Action 每次 merge 重算健康/规模/脆弱度），把影响分析接到 CI/PR 工作流。"},
    {"id":"cl-cf-health","critical":True,"evidenceIds":[eid(CF,"maturity")],
     "text":"codeflow 可吸收——代码体检：安全扫描（硬编码密钥/SQL 注入/eval/debug 语句）、模式识别（单例/工厂/观察者/React hooks + God Object/高耦合反模式）、A-F 健康分（死代码%/循环依赖/耦合/安全）、git churn 热图与代码所有权（top contributors）。"},
    {"id":"cl-cf-ux","critical":False,"evidenceIds":[eid(CF,"target-users")],
     "text":"codeflow 可吸收——零门槛 UX：单 HTML 文件、代码不出本机、本地拖拽分析、可分享链接复跑同一分析，把『看一眼架构』的成本压到零。"},
    # claude-context
    {"id":"cl-cc-search","critical":True,"evidenceIds":[eid(CC,"product-positioning"),eid(CC,"technical-architecture")],
     "text":"claude-context 可吸收——混合语义检索：AST 分块（带 character splitter 降级）+ BM25/dense 混合，支持『按意思找代码』的自然语言查询，覆盖 ZCodeGraph 结构化名匹配之外的语义召回盲区。"},
    {"id":"cl-cc-incremental","critical":True,"evidenceIds":[eid(CC,"differentiation")],
     "text":"claude-context 可吸收——工程与 UX：Merkle tree 增量索引（仅重嵌变更文件）、可插拔嵌入（OpenAI/Voyage/Gemini/Ollama 本地）与向量库（Milvus/Zilliz）、index_codebase 进度回调百分比、~40% token 优化、core 包可编程复用。"},
    # archify
    {"id":"cl-ar-export","critical":False,"evidenceIds":[eid(AR,"product-positioning")],
     "text":"archify 可集成——可视化出口：agent 把代码库/系统描述整理为带类型约束的 JSON IR，经确定性校验编译为自包含 HTML/SVG，并支持两快照对比（Architecture Delta）；作为 ZCodeGraph 图谱的呈现/分享出口复用，而非自研渲染。"},
    # 汇集判断
    {"id":"cl-harvest-fit","critical":False,"evidenceIds":[eid(ZG,"differentiation"),eid(CGC,"differentiation")],
     "text":"汇集可行性判断：多数可吸收能力（死代码/复杂度/PR影响/安全/健康分/Spring/数据源/可视化导出）都是对已有节点/边图的『只读分析或呈现』，可在不改动 ZCodeGraph SQLite 内嵌零配置架构的前提下，作为新增 MCP 工具或导出桥落地；混合语义检索是唯一天然需要新存储（向量）的能力，宜作可选增量而非默认路径。"},
]

cards = [
    {"title":"ZCodeGraph（汇集落点）","claimIds":["cl-zg-base","cl-zg-strength"],
     "summary":"已有：rust-hybrid/22语言/14框架路由/跨语言桥/自动同步/八 MCP 工具。角色：把下列各项目之长汇入此基线。最强资产：SQLite 内嵌零配置 + 确定性 AST。吸收原则：保住该架构，新增能力以只读分析/呈现/可选增量为主。"},
    {"title":"上游 codegraph → 吸收 viewer 与工程治理","claimIds":["cl-up-viewer","cl-up-docs"],
     "summary":"有用：浏览器 viewer 交互可视化（与索引同 grammar 高亮）。好用：AGENTS.md 分层治理、release 工程化。汇集方式：直接吸收——viewer 与 UI build 校验思路可移植，文档治理可复制。成本：中。"},
    {"title":"archify → 集成为可视化出口","claimIds":["cl-ar-export"],
     "summary":"有用：可验证 JSON IR→确定性 HTML/SVG 架构图 + 快照对比，把图谱变成可分享产物。汇集方式：集成复用——做 ZCodeGraph 图谱→archify IR 的导出桥，而非自研渲染。成本：低-中。证据缺口：ledger 对其技术/差异化两条 criteria 返回 unknown，判断基于官方 README。"},
    {"title":"CodeGraphContext → 吸收分析工具面","claimIds":["cl-cgc-tools","cl-cgc-spring","cl-cgc-ux"],
     "summary":"有用：死代码/圈复杂度/审计报告/Spring 端点/数据源/自定义 Cypher。好用：setup 向导、后台 job+诊断、watch、GCF token 优化、HTTP Gateway。汇集方式：直接吸收分析逻辑（翻译为 SQL/图遍历），跳过 Neo4j 外部依赖。成本：中。"},
    {"title":"codeflow → 吸收体检与 PR 工作流","claimIds":["cl-cf-impact","cl-cf-health","cl-cf-ux"],
     "summary":"有用：PR 影响 blast radius、安全扫描、模式/反模式识别、A-F 健康分、churn 热图、所有权。好用：零安装单文件、可分享链接、README SVG Card。汇集方式：直接吸收体检规则为只读分析，PR 影响接到现有 affected/impact；Card 作 CI 出口。成本：低-中。证据缺口：其 product-positioning criterion 为 unknown。"},
    {"title":"claude-context → 吸收混合语义检索","claimIds":["cl-cc-search","cl-cc-incremental"],
     "summary":"有用：AST 分块+BM25/dense 混合检索，补『按意思找代码』盲区。好用：Merkle 增量、可插拔嵌入(含 Ollama 本地)、进度回调、~40% token 优化、core 可编程。汇集方式：作可选增量——优先本地 embedding，保持 SQLite 内嵌，不引入重外部向量库。成本：高。"},
]

comparisons = [
    {"id":"cp-matrix","claimIds":["cl-zg-strength","cl-up-viewer","cl-cgc-tools","cl-cf-health","cl-cc-search"],
     "text":"能力汇集矩阵（八能力域 × 来源）：①结构查询=ZG 已有；②可视化呈现=上游 viewer(直接吸收)/archify(集成出口)；③代码质量分析=CGC 死代码+复杂度(吸收)；④安全/体检=codeflow 安全+健康分+热图(吸收)；⑤框架/数据层语义=CGC Spring+数据源(吸收，扩 ZG 现有路由)；⑥PR/CI 工作流=codeflow PR 影响+SVG Card(吸收，接 affected)；⑦语义检索=CC 混合检索(可选增量)；⑧工程/UX=CGC setup 向导+job 诊断 + CC 进度回调+token 优化 + codeflow 零安装(吸收)。"},
    {"id":"cp-useful","claimIds":["cl-cgc-tools","cl-cgc-spring","cl-cf-impact","cl-cf-health","cl-cc-search"],
     "text":"有用之处（功能价值）优先级：对 agent 结构化理解增量最大的是『框架/数据层语义』（Spring 端点/数据源，直连 ZG 路由优势）与『质量分析』（死代码/复杂度）；其次是『PR 影响+体检』（把图谱价值接到改动前）；语义检索补盲区但非结构问题；可视化是呈现而非理解增量。"},
    {"id":"cp-usable","claimIds":["cl-cgc-ux","cl-cf-ux","cl-cc-incremental","cl-up-docs"],
     "text":"好用之处（UX/工程）优先级：最高是『接入与诊断体验』（CGC setup 向导、job error_type/traceback、CC 进度回调——直接降低『装不上/不知在干嘛』）；其次是『token/输出优化』（GCF ~62%、CC ~40%，降低 agent 成本）；再次是『零门槛呈现』（codeflow 单文件/可分享、archify 自包含 HTML）；文档治理是长期好用性底座。"},
    {"id":"cp-method","claimIds":["cl-harvest-fit","cl-cc-incremental"],
     "text":"汇集方式三分：直接吸收（自研落地为 MCP 工具/SQL 分析，适用于质量分析、安全体检、框架/数据源、PR 影响、viewer、UX 改进）／集成复用（archify 可视化、SVG Card 作出口，不重造渲染）／可选增量（混合语义检索，唯需向量存储，保持可选与本地化）。多数能力为只读分析，不冲击 SQLite 零配置架构。"},
    {"id":"cp-cost","claimIds":["cl-cc-incremental","cl-up-viewer","cl-cgc-tools"],
     "text":"成本排序：低成本=UX/诊断/输出优化、质量/体检规则（纯图查询）；中成本=viewer 移植、archify 导出桥、Spring/数据源语义、PR 影响接线；高成本=混合语义检索（需嵌入管线+向量存储+增量策略）。汇集顺序应低成本高价值先行。"},
    {"id":"cp-gaps","claimIds":["cl-cf-health"],
     "text":"证据缺口：archify 的 technical-architecture/differentiation、codeflow 的 product-positioning 三条 criteria 在 ledger 中为 unknown，相关能力判断基于官方 README/文档；汇集落地前需对这些点做 hands-on 验证，不作为已确认能力。"},
]

recommendations = [
    {"id":"rec-overall","comparisonIds":["cp-matrix","cp-method"],
     "text":"总路线：以 ZCodeGraph 现有 SQLite 内嵌零配置架构为底座，按『直接吸收为主、集成复用为辅、语义检索作可选增量』汇集各家有用/好用之处；不引入 Neo4j/Milvus 等重外部依赖，新增能力以只读分析工具与呈现/导出桥为主。"},
    {"id":"rec-p0","comparisonIds":["cp-usable","cp-cost"],
     "text":"P0（低成本高价值，先行）：①好用性三件套——agent setup/诊断体验（对齐 CGC 向导与 job error_type/traceback）、索引进度回调、token 优化输出（GCF 式压缩）；②质量分析两工具——find_dead_code（含注解排除）与圈复杂度（calculate/most_complex），作为新 MCP 只读工具。"},
    {"id":"rec-p1","comparisonIds":["cp-useful","cp-matrix"],
     "text":"P1（中成本高价值）：①框架/数据层语义扩展——Spring 端点/bean、数据源节点（SQL/Redis），直连现有 14 框架路由优势；②PR 影响分析——把现有 impact/affected 接到 PR/CI 工作流（受影响文件+blast radius+README 健康 SVG Card）；③可视化出口——优先做 ZCodeGraph 图谱→archify IR 导出桥，必要时移植上游 viewer。"},
    {"id":"rec-p2","comparisonIds":["cp-method","cp-cost"],
     "text":"P2（高成本，评估后定）：本地混合语义检索——AST 分块 + BM25/dense 混合，优先本地 embedding（Ollama 类）+ 轻量向量存储，保持可选（默认关闭），评估索引体积/首次成本对零配置体验的影响后再决定是否并入默认路径。"},
    {"id":"rec-avoid","comparisonIds":["cp-method","cp-cost"],
     "text":"应避免：①引入 Neo4j/Milvus 等强制外部服务（破坏零配置本地性）；②自研可视化渲染（用 archify/上游 viewer 复用）；③把语义检索做成默认强依赖（应先可选）；④一次性汇集全部功能而不按价值/成本排序。"},
    {"id":"rec-risks","comparisonIds":["cp-gaps"],
     "text":"遗留风险：部分能力（archify/codeflow 三点）基于二手文档待 hands-on 验证；汇集多功能可能推高 MCP 工具面复杂度（需工具分组/命名克制）；语义检索的本地成本未实测；与上游同期演进可能产生重复投入。"},
]

metrics = [
    {"key":"dead-code-precision","definition":"find_dead_code 在真实语料上的准确率（剔除注解/框架入口后）","unit":"%","method":"real-corpus gate 抽样人工核对","condition":"P0 落地","expected":"≥ 80%"},
    {"key":"complexity-coverage","definition":"可计算圈复杂度的函数占已索引函数比例","unit":"%","method":"sqlite 探针统计","condition":"P0 落地","expected":"≥ 90%"},
    {"key":"pr-impact-recall","definition":"PR 影响分析命中的真实受影响文件占人工标注比例","unit":"%","method":"历史 PR 回放","condition":"P1 落地","expected":"≥ 85%"},
    {"key":"tool-call-reduction","definition":"新增分析/检索工具后 agent 回答问题的工具调用下降","unit":"%","method":"确定性 sufficiency 探针 + A/B smoke","condition":"每阶段","expected":"≥ 50%"},
    {"key":"setup-success","definition":"新用户从安装到首次成功查询的一步到位率","unit":"%","method":"安装遥测/手动走查","condition":"P0 落地","expected":"≥ 95%"},
    {"key":"semantic-index-cost","definition":"混合检索相对纯结构索引的额外磁盘/首次时间开销","unit":"ratio","method":"同语料对比","condition":"P2 评估","expected":"可接受且默认关闭"},
]

risk_register = [
    {"risk":"汇集多功能导致 MCP 工具面膨胀，agent 选择困难、维护面变宽",
     "trigger":"新增分析/检索/呈现工具超过 20 个且无分组",
     "impact":"好用性反而下降，token 成本上升，维护负担加重",
     "mitigation":"采用工具分组与命名克制（核心 explore 聚合入口优先），借鉴 CGC 目录化 tool_definitions 与 server-instructions 单一事实源管理",
     "residualRisk":"工具面仍需持续治理","owner":"ZCodeGraph 维护者"},
    {"risk":"对 archify/codeflow 部分能力基于二手文档，汇集后实际价值不及预期",
     "trigger":"hands-on 验证发现官方声明与实际行为不符",
     "impact":"投入实现的导出桥/体检规则价值打折",
     "mitigation":"汇集前对这三点做最小 hands-on spike 验证（真实仓库跑一遍），按验证结果调整优先级",
     "residualRisk":"验证本身有前置成本","owner":"ZCodeGraph 维护者"},
    {"risk":"本地混合语义检索的索引体积与首次 embedding 成本破坏零配置体验",
     "trigger":"引入向量存储与嵌入管线后首次索引时间与磁盘显著上升",
     "impact":"核心『本地零配置』卖点受损，用户流失",
     "mitigation":"将语义检索设为默认关闭的可选增量，优先本地 embedding + 轻量向量存储，并设可接受的体积/时间阈值门槛",
     "residualRisk":"即使可选也可能增加维护与打包复杂度","owner":"ZCodeGraph 维护者"},
    {"risk":"汇集上游/CGC 能力时与上游同期演进产生重复投入",
     "trigger":"上游或 CGC 在新版本实现 ZCodeGraph 正汇集的同一能力",
     "impact":"汇集工作被上游追平，投入沉没",
     "mitigation":"优先汇集上游/CGC 尚未覆盖且贴合 ZG rust-hybrid/框架优势的能力，并保持模块化便于跟随上游 rebase",
     "residualRisk":"无法完全避免与上游路线重叠","owner":"ZCodeGraph 维护者"},
]

graduation = [
    {"condition":"完成 P0 好用性三件套与质量分析两工具并在真实语料验证","threshold":"dead-code-precision≥80% 且 complexity-coverage≥90% 且 setup-success≥95%","metric":"dead-code-precision / complexity-coverage / setup-success","promoteTo":"experience-version"},
    {"condition":"明确混合语义检索是否并入的架构决策","threshold":"产出 ADR 并量化 semantic-index-cost，默认关闭","metric":"semantic-index-cost","promoteTo":"experience-version"},
]

information_gaps = {
    "status":"has-gaps",
    "rationale":"sealed ledger 的 unknownCriteria 非空：tt-a1i/archify 的 technical-architecture 与 differentiation、braedonsaunders/codeflow 的 product-positioning 三条 criteria 未返回证据，存在 information gap；相关汇集判断基于官方 README/文档，落地前需 hands-on 验证。"
}

report = {
    "schema":"zj-research-report-ir/v1","family":"technical-c4/v1",
    "title":"ZCodeGraph 能力汇集调研：汇集同类项目的有用之处与好用之处",
    "summary":"放弃竞争差异化路线，逐候选拆解 5 个同类项目的有用之处（功能价值）与好用之处（UX/工程），以单元能力粒度标注 ZCodeGraph 已有/可适配/缺失/未知，给出按价值/成本排序的分阶段汇集路径：P0 好用性+质量分析，P1 框架/数据语义+PR影响+可视化出口，P2 可选本地混合语义检索。",
    "ledgerFingerprint":fingerprint,
    "concepts":[
        {"key":"decision-frame","value":"problem-discovery 阶段的能力汇集决策：汇集同类项目有用/好用之处到 ZCodeGraph，先做到足够有用好用，非竞争差异化。"},
        {"key":"harvest-model","value":"以单元能力为粒度，按 constraint→option→evidence→tradeoff→decision 评估每项能力的价值与吸收成本，决定直接吸收/集成复用/暂缓。"},
        {"key":"ownership-model","value":"汇集的全部能力由 ZCodeGraph 维护者承担实现、测试与持续演进所有权；集成复用能力另承担与上游 rebase 的成本。"},
        {"key":"lifecycle-stage","value":"problem-discovery：输出汇集清单与路径，不做 dogfood/release 级生产承诺。"},
        {"key":"capability-domains","value":"八能力域：结构查询/可视化呈现/质量分析/安全体检/框架与数据语义/PR 与 CI 工作流/语义检索/工程与 UX。"},
        {"key":"harvest-modes","value":"汇集三方式：直接吸收（自研为 MCP 工具/SQL 分析）、集成复用（archify/SVG Card 作出口）、可选增量（语义检索，默认关闭）。"},
        {"key":"architecture-invariant","value":"汇集底线：保住 SQLite 内嵌、零配置、100% 本地、确定性 AST；新增能力以只读分析/呈现/可选增量为主，不引入强制外部服务。"},
    ],
    "diagrams":[
        {"kind":"landscape","title":"能力汇集格局：各项目作为能力来源",
         "description":"放弃竞争视角后，五个候选变成 ZCodeGraph 的能力来源：上游提供 viewer 与工程治理，CodeGraphContext 提供分析工具面与 setup/诊断 UX，codeflow 提供体检与 PR 工作流，claude-context 提供混合语义检索，archify 提供可视化出口。ZCodeGraph 以 SQLite 零配置底座汇集各家之长。",
         "mermaid":"graph LR\n UP[上游 viewer/治理] -->|直接吸收| ZG[ZCodeGraph]\n CGC[CGC 分析工具/UX] -->|直接吸收| ZG\n CF[codeflow 体检/PR] -->|直接吸收| ZG\n CC[claude-context 语义检索] -->|可选增量| ZG\n AR[archify 可视化] -->|集成出口| ZG"},
        {"kind":"container","title":"ZCodeGraph 汇集后的能力容器",
         "description":"底座：tree-sitter+SQLite(FTS5)+rust-hybrid 引擎+MCP。汇集叠加层：质量分析（死代码/复杂度）、安全体检、框架/数据源语义、PR 影响、可视化导出桥、可选本地混合检索，均以只读分析/呈现为主，不破坏零配置架构。",
         "mermaid":"graph TD\n Agent[AI agent] -->|MCP| ZG\n subgraph ZG[ZCodeGraph]\n Core[rust-hybrid+SQLite 底座]\n Q[质量分析 死代码/复杂度]\n Sec[安全体检]\n Sem[框架/数据源语义]\n PR[PR 影响]\n Viz[可视化导出桥]\n Vec[可选混合检索]\n Core --> Q & Sec & Sem & PR\n Core --> Viz\n Core -.可选.-> Vec\n end\n Viz --> ARX[archify/SVG Card]"},
    ],
    "candidates":candidates,"cards":cards,"claims":claims,
    "comparisons":comparisons,"recommendations":recommendations,"metrics":metrics,
    "riskRegister":risk_register,"graduationCriteria":graduation,"informationGaps":information_gaps,
}

out = BASE / "report-ir.json"
out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print("wrote", out); print("fingerprint", fingerprint)
