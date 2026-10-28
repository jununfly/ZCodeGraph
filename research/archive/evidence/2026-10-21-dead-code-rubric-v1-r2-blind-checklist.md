---
doc-kind: evidence
authority: supporting
authority-id: EV-dead-code-rubric-v1-r2-blind-checklist-2026-10-21
bounded-question: "What was the blind R2 checklist given to the Human for dead-code-rubric-v1 annotation, and what guidance accompanied it?"
supports: DES-dead-code-rubric-v1
roadmap-node: 1-2-4
---
# R2 盲标清单 — dead 桶（108 条中待 Human 判的 65 条）

Date: 2026-10-21
Protocol: `DES-dead-code-rubric-v1` annotation protocol R2。本清单**隐去 R1 verdict 细节**；每条只需回 `d`（dead）/ `a`（alive）/ `u`（unknown）。

## 判断心智模型（只看"有没有任何可能触发它执行的入口"，不读懂逻辑）

- **a (alive)**：有明确入口信号——注解/attribute（`@GetMapping`、`#[get("/")]`、`[HttpGet]`、`@register.tag`）、route 注册、pub/导出 API（库消费者图外）、测试函数、框架 lifecycle（`OnInitialized`、Django model `save/clean`）。
- **u (unknown)**：可能经动态分派——接口实现/重写、序列化/魔法方法回调（`__str__`、`Equals`、`from`）、事件 handler 命名（`on*`、`DetailsClick`）、字符串/模板/配置引用（Django `context_processors`、template tag、Drupal hook、JS minified 内部引用）。
- **d (dead)**：私有/内部 + 零引用 + 无任何上述信号。判 d 的举证责任在"找不到任何入口"。

**R2-auto 已标 43 条**（文本级独立信号，与 R1 图信号正交）：
- alive 30：django `@register.tag` 17、actix `#[test]` 19（`handler_min` 等）、actix `rust-actix-macro`/`rust-test-attr`、drupal hook 名 0
- unknown 13：actix `pub fn` 8→实际 14（含 `rust-pub-fn`）、eShop C# public method 2、django dunder/context-processor 2

下面 65 条需要你判。格式：`编号 | 仓库 | 符号 | 位置`。**回的时候只回编号+字母**即可（如 `1 u, 2 a, 3 d`）。

---

## spring-petclinic（1 条）

```
1 | petclinic | VetRepository::findAll | src/main/java/.../vet/VetRepository.java:54
```

## eShopOnWeb（15 条）

```
2  | eShop | BuyerAggregate::Buyer (ctor)              | src/.../BuyerAggregate/Buyer.cs:16
3  | eShop | OrderAggregate::Address (ctor)            | src/.../OrderAggregate/Address.cs:16
4  | eShop | OrderAggregate::CatalogItemOrdered (ctor) | src/.../OrderAggregate/CatalogItemOrdered.cs:23
5  | eShop | OrderAggregate::Order (ctor)              | src/.../OrderAggregate/Order.cs:11
6  | eShop | OrderAggregate::OrderItem (ctor)          | src/.../OrderAggregate/OrderItem.cs:10
7  | eShop | Exceptions::EmptyBasketOnCheckoutException(ctor) | src/.../Exceptions/EmptyBasketOnCheckoutException.cs:12
8  | eShop | Helpers::RefreshBroadcast (ctor)          | src/.../Helpers/RefreshBroadcast.cs:14
9  | eShop | ToastComponent::OnInitialized             | src/.../Helpers/ToastComponent.cs:40
10 | eShop | ToastComponent::HideToast                 | src/.../Helpers/ToastComponent.cs:51
11 | eShop | List.razor::DetailsClick                  | src/.../CatalogItemPage/List.razor.cs:43
12 | eShop | (see full list in JSON)                   | ...
13-16 | eShop | 其余 4 条                              | (JSON 中 r2_auto=null 的 eShop 条目)
```

## drupal（30 条）

注意：drupal 索引是**部分索引**（FOREIGN KEY 中断），候选偏多；且大量 `js/build/*.js` 是 minified bundle。

```
17 | drupal | js/block.admin.js::filterBlockList      | core/misc/.../js/block.admin.js:35
18 | drupal | js/block.admin.js::toggleBlockEntry     | core/misc/.../js/block.admin.js:46
19 | drupal | js/block.js::checkboxesSummary          | core/misc/.../js/block.js:33
20 | drupal | build/drupalEntityLinkSuggestions.js::i | build/drupalEntityLinkSuggestions.js:1 (minified)
21 | drupal | build/drupalEntityLinkSuggestions.js::s | build/drupalEntityLinkSuggestions.js:1 (minified)
22 | drupal | build/drupalEntityLinkSuggestions.js::u | build/drupalEntityLinkSuggestions.js:1 (minified)
23 | drupal | build/drupalMedia.js::_                 | build/drupalMedia.js:1 (minified)
24 | drupal | build/drupalMedia.js::i                 | build/drupalMedia.js:1 (minified)
25 | drupal | build/drupalMedia.js::F                 | build/drupalMedia.js:1 (minified)
26 | drupal | js/ckeditor5.admin.js::Observable       | core/misc/.../js/ckeditor5.admin.js:39
27-46 | drupal | 其余 20 条                            | (JSON 中 r2_auto=null 的 drupal 条目)
```

**建议**：`js/build/*.js` minified 文件整组标 `u`（bundle 内部引用图外不可见），PHP 条目逐条看 hook 命名。

## django（11 条）

```
47 | django | urls/i18n.py::i18n_patterns             | django/urls/i18n.py:8
48 | django | admin/checks.py::check_admin_app        | django/contrib/admin/checks.py:47
49 | django | admin/decorators.py::_model_admin_wrapper | django/contrib/admin/decorators.py:112
50 | django | js/actions.js::targetIndex              | django/.../js/actions.js:158
51 | django | js/actions.js::lastCheckedIndex         | django/.../js/actions.js:159
52 | django | js/actions.js::filtered                 | django/.../js/actions.js:164
53 | django | js/calendar.js::Calendar                | django/.../js/calendar.js:274
54 | django | admindocs/utils.py::default_reference_role | django/contrib/admindocs/utils.py:151
55 | django | auth/__init__.py::auser                 | django/contrib/auth/__init__.py:102
56 | django | auth/__init__.py::aupdate_session_auth_hash | django/contrib/auth/__init__.py:384
57 | django | (1 more in JSON)                        | ...
```

## actix-web（8 条）

```
58 | actix | src/config.rs::cfg_root                 | src/config.rs:535
59 | actix | src/extract.rs::from_request            | src/extract.rs:406
60 | actix | header/accept_encoding.rs::enc          | src/http/header/accept_encoding.rs:302
61 | actix | header/content_length.rs::from          | src/http/header/content_length.rs:89
62 | actix | header/content_length.rs::eq            | src/http/header/content_length.rs:107
63 | actix | header/content_length.rs::assert_parse_fail | src/http/header/content_length.rs:143
64 | actix | header/content_length.rs::assert_parse_eq  | src/http/header/content_length.rs:155
65 | actix | header/entity.rs::entity_validate_char  | src/http/header/entity.rs:12
```

**提示**：`from_request`/`from`/`eq` 是 Rust trait method（`FromRequest`/`From`/`PartialEq` impl），`assert_parse_*` 是 `#[cfg(test)]` helper，多半 `u` 或 `a`；`entity_validate_char`/`enc`/`cfg_root` 需看上下文。

---

## 回答格式

最省事：直接回一行 `1 u, 2 a, 3 a, ...`（65 个编号）。不确定就标 `u`——precision 只算 dead 桶，`u` 不进分母，标 `u` 是保守安全项。

完整 65 条结构化数据在 `docs/evidence/2026-10-21-dead-code-rubric-v1-annotation-r1.json`（`bucket=dead 且 r2_auto=null` 的条目）。
