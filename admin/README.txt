门店预约管理平台（多店功能测试）
================================================

入口（请从这里开始）：
  d:\Work\Project\GYOZOKU-EN-booking-platform\admin\index.html

流程：
  1) 管理员端 → 选店（Ruana / Starry Flow / Luna）→ 客服看板
  2) 商家登录 → 输入识别码 → 关床管理
  3) 技师工作端 → 门店码 + 技师码 → 三步记工 / 本日配置（默认日语，可切中/英）

测试识别码：
  RUANA88   → Relaxation Ruana（11:00–21:30）  技师 R1–R4
  STARRY88  → Starry Flow Spa（12:00–次日02:00）技师 S1–S4
  LUNA88    → Luna spa 河原町店                 技师 L1–L4

说明：
  - 无真实预约后端；预约与技师工作记录均按店隔离存在本机 localStorage
  - 真发信：见 ../server/README.md（Gmail SMTP 代发）
  - 原店网站文件未改；本目录为管理端功能测试
